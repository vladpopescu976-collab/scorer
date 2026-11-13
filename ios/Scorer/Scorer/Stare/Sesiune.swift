import Foundation
import Observation

/// Cine e conectat și cu ce token. Tokenul e ținut în Keychain, nu în
/// UserDefaults, ca să nu rămână în backup-uri necriptate.
@MainActor
@Observable
final class Sesiune {
    private(set) var utilizator: Utilizator?
    private(set) var seIncarca = true

    var esteConectat: Bool { utilizator != nil }
    var esteBusiness: Bool { utilizator?.rol == .business }

    private let cheieToken = "scorer.token"

    func porneste() async {
        defer { seIncarca = false }

        #if DEBUG
        // Cârlig pentru testare automată: permite pornirea aplicației deja
        // conectată, fără a trece prin tastatură. Nu există în build-ul final.
        if let dinMediu = ProcessInfo.processInfo.environment["SCORER_TOKEN"], !dinMediu.isEmpty {
            Keychain.scrie(cheieToken, valoare: dinMediu)
        }
        #endif

        guard let token = Keychain.citeste(cheieToken) else { return }

        await ApiClient.shared.seteazaToken(token)
        do {
            utilizator = try await ApiClient.shared.cere("eu", ca: Utilizator.self)
            await pornesteNotificarile()
        } catch {
            // Token expirat sau cont șters — pornim ca deconectat.
            await deconecteaza()
        }
    }

    func autentifica(email: String, parola: String, rol: Rol) async throws {
        struct Corp: Encodable {
            let email: String
            let password: String
            let role: String
        }
        let raspuns: RaspunsAutentificare = try await ApiClient.shared.cere(
            "auth/autentificare",
            metoda: "POST",
            corp: Corp(email: email, password: parola, role: rol.rawValue)
        )
        await aplica(raspuns)
    }

    /// Autentificare prin Apple sau Google: serverul verifică tokenul primit de
    /// la furnizor și deschide contul, sau îl creează dacă nu există.
    func autentificaSocial(furnizor: String, token: String, nume: String?, rol: Rol) async throws {
        struct Corp: Encodable {
            let furnizor: String
            let token: String
            let role: String
            let nume: String?
        }
        let raspuns: RaspunsAutentificare = try await ApiClient.shared.cere(
            "auth/social",
            metoda: "POST",
            corp: Corp(furnizor: furnizor, token: token, role: rol.rawValue, nume: nume)
        )
        await aplica(raspuns)
    }

    /// Ce s-a întâmplat după înregistrare.
    enum RezultatInregistrare: Sendable {
        /// Confirmarea pe email e oprită de pe server — contul e gata de folosit.
        case gata
        /// Contul așteaptă confirmarea; `emailTrimis` spune dacă mesajul a plecat.
        case asteaptaConfirmarea(emailTrimis: Bool)
    }

    /// Contul se creează, dar nu primește token: dacă e nevoie de confirmare,
    /// întâi trebuie deschis linkul din email.
    @discardableResult
    func inregistreaza(
        nume: String,
        email: String,
        parola: String,
        telefon: String,
        oras: String,
        numeFirma: String,
        site: String,
        rol: Rol
    ) async throws -> RezultatInregistrare {
        struct Corp: Encodable {
            let name: String
            let email: String
            let password: String
            let phone: String?
            let city: String?
            let companyName: String?
            let website: String?
            let role: String
        }
        struct Raspuns: Decodable {
            let email: String
            let emailTrimis: Bool
            /// Lipsește pe versiunile mai vechi de server, deci îl citim opțional.
            let confirmat: Bool?
        }
        let raspuns: Raspuns = try await ApiClient.shared.cere(
            "auth/inregistrare",
            metoda: "POST",
            corp: Corp(
                name: nume,
                email: email,
                password: parola,
                phone: telefon.isEmpty ? nil : telefon,
                city: oras.isEmpty ? nil : oras,
                // Datele firmei se trimit doar de pe contul Business; serverul
                // le ignoră în rest.
                companyName: rol == .business && !numeFirma.isEmpty ? numeFirma : nil,
                website: rol == .business && !site.isEmpty ? site : nil,
                role: rol.rawValue
            )
        )
        if raspuns.confirmat == true { return .gata }
        return .asteaptaConfirmarea(emailTrimis: raspuns.emailTrimis)
    }

    /// Cere pe email un link de schimbare a parolei. Parola nouă se alege pe
    /// site, unde duce linkul — aici nu ținem un al doilea formular pentru
    /// aceleași reguli.
    func cereParolaNoua(email: String) async throws {
        struct Corp: Encodable { let email: String }
        struct Raspuns: Decodable { let trimis: Bool }
        let _: Raspuns = try await ApiClient.shared.cere(
            "auth/parola", metoda: "POST", corp: Corp(email: email), ca: Raspuns.self
        )
    }

    /// Șterge definitiv contul, după confirmarea parolei.
    func stergeContul(parola: String) async throws {
        struct Corp: Encodable { let parola: String }
        struct Raspuns: Decodable { let sters: Bool }
        let _: Raspuns = try await ApiClient.shared.cere(
            "eu", metoda: "DELETE", corp: Corp(parola: parola), ca: Raspuns.self
        )
        await deconecteaza()
    }

    /// Cere un link nou de confirmare pentru o adresă.
    func retrimiteConfirmarea(email: String) async throws {
        struct Corp: Encodable { let email: String }
        struct Raspuns: Decodable { let trimis: Bool }
        let _: Raspuns = try await ApiClient.shared.cere(
            "auth/retrimite", metoda: "POST", corp: Corp(email: email), ca: Raspuns.self
        )
    }

    private func aplica(_ raspuns: RaspunsAutentificare) async {
        Keychain.scrie(cheieToken, valoare: raspuns.token)
        await ApiClient.shared.seteazaToken(raspuns.token)
        utilizator = raspuns.utilizator
        // Răspunsul de la autentificare are doar datele de bază; profilul
        // complet (poza, orașul, sporturile) vine de la „eu”. Fără asta, după
        // o nouă conectare poza părea pierdută până la repornirea aplicației.
        await reincarcaProfil()
        await pornesteNotificarile()
    }

    /// Conturile Business primesc notificări pentru rezervări noi.
    private func pornesteNotificarile() async {
        guard esteBusiness else { return }
        await Notificari.shared.porneste()
        await Notificari.shared.trimiteLaServer()
    }


    /// Citește din nou profilul, după o schimbare de email, telefon sau parolă.
    func reincarcaProfil() async {
        if let actual = try? await ApiClient.shared.cere("eu", ca: Utilizator.self) {
            utilizator = actual
        }
    }

    /// Încarcă o poză nouă de profil (deja tăiată la pătrat) și reîncarcă profilul.
    func schimbaPoza(_ date: Data) async throws {
        _ = try await ApiClient.shared.incarcaPoze(
            [(nume: "profil.jpg", tip: "image/jpeg", date: date)], cale: "eu/poza"
        )
        await reincarcaProfil()
    }

    func stergePoza() async throws {
        try await ApiClient.shared.cereFaraRaspuns("eu/poza", metoda: "DELETE")
        await reincarcaProfil()
    }


    func deconecteaza() async {
        await Notificari.shared.dezleaga()
        Keychain.sterge(cheieToken)
        await ApiClient.shared.seteazaToken(nil)
        utilizator = nil
    }
}

enum Keychain {
    private static func interogare(_ cheie: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "ro.scorer.app",
            kSecAttrAccount as String: cheie,
        ]
    }

    static func scrie(_ cheie: String, valoare: String) {
        var interogare = interogare(cheie)
        SecItemDelete(interogare as CFDictionary)
        interogare[kSecValueData as String] = Data(valoare.utf8)
        interogare[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(interogare as CFDictionary, nil)
    }

    static func citeste(_ cheie: String) -> String? {
        var interogare = interogare(cheie)
        interogare[kSecReturnData as String] = true
        interogare[kSecMatchLimit as String] = kSecMatchLimitOne

        var rezultat: CFTypeRef?
        guard SecItemCopyMatching(interogare as CFDictionary, &rezultat) == errSecSuccess,
              let date = rezultat as? Data
        else { return nil }
        return String(data: date, encoding: .utf8)
    }

    static func sterge(_ cheie: String) {
        SecItemDelete(interogare(cheie) as CFDictionary)
    }
}
