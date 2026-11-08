import AuthenticationServices
import CryptoKit
import SwiftUI

/// „Continuă cu Apple / Google". Fiecare furnizor dă aplicației un token de
/// identitate, pe care serverul îl verifică înainte să creeze sau să deschidă
/// contul.
struct ButoaneSociale: View {
    let continua: (_ furnizor: String, _ token: String, _ nume: String?) async throws -> Void
    let laEroare: (String) -> Void

    @Environment(\.colorScheme) private var schema
    @State private var seIncarca = false
    private let google = GoogleAutentificare()

    var body: some View {
        VStack(spacing: 14) {
            HStack(spacing: 12) {
                Rectangle().fill(.secondary.opacity(0.25)).frame(height: 1)
                Text("sau continuă cu").font(.caption).foregroundStyle(.secondary)
                Rectangle().fill(.secondary.opacity(0.25)).frame(height: 1)
            }

            HStack(spacing: 12) {
                SignInWithAppleButton(.continue) { cerere in
                    cerere.requestedScopes = [.fullName, .email]
                } onCompletion: { rezultat in
                    apple(rezultat)
                }
                .signInWithAppleButtonStyle(schema == .dark ? .white : .black)
                .frame(height: 48)
                .clipShape(.rect(cornerRadius: 14, style: .continuous))

                if google.estePornit {
                    Button {
                        Task { await pornesteGoogle() }
                    } label: {
                        HStack(spacing: 8) {
                            Text("G").font(.system(size: 18, weight: .bold, design: .rounded))
                                .foregroundStyle(Color(red: 0.26, green: 0.52, blue: 0.96))
                            Text("Google").font(.subheadline.weight(.semibold))
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(Tema.fisa, in: .rect(cornerRadius: 14, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .strokeBorder(Color.primary.opacity(0.12), lineWidth: 1)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .disabled(seIncarca)
            .opacity(seIncarca ? 0.5 : 1)
        }
    }

    private func apple(_ rezultat: Result<ASAuthorization, Error>) {
        switch rezultat {
        case .failure(let eroare):
            // Renunțarea nu e o eroare de arătat.
            if (eroare as? ASAuthorizationError)?.code != .canceled {
                laEroare("Autentificarea cu Apple nu a reușit. Încearcă din nou.")
            }
        case .success(let autorizare):
            guard
                let date = autorizare.credential as? ASAuthorizationAppleIDCredential,
                let bucati = date.identityToken,
                let token = String(data: bucati, encoding: .utf8)
            else {
                laEroare("Apple nu a trimis datele necesare.")
                return
            }
            // Apple trimite numele doar la prima autentificare.
            let nume = [date.fullName?.givenName, date.fullName?.familyName]
                .compactMap { $0 }.joined(separator: " ")
            Task { await trimite("apple", token, nume.isEmpty ? nil : nume) }
        }
    }

    private func pornesteGoogle() async {
        seIncarca = true
        defer { seIncarca = false }
        do {
            let token = try await google.autentifica()
            try await continua("google", token, nil)
        } catch GoogleEroare.renuntat {
            // Utilizatorul a închis fereastra.
        } catch {
            laEroare(error.localizedDescription)
        }
    }

    private func trimite(_ furnizor: String, _ token: String, _ nume: String?) async {
        seIncarca = true
        defer { seIncarca = false }
        do { try await continua(furnizor, token, nume) } catch { laEroare(error.localizedDescription) }
    }
}

// MARK: - Google, fără SDK

enum GoogleEroare: LocalizedError {
    case renuntat, nepornit, raspunsInvalid

    var errorDescription: String? {
        switch self {
        case .renuntat: nil
        case .nepornit: "Autentificarea cu Google nu este configurată."
        case .raspunsInvalid: "Autentificarea cu Google nu a reușit. Încearcă din nou."
        }
    }
}

/// Autentificare Google prin fereastra sistemului (OAuth cu PKCE), fără SDK:
/// primim un cod, îl schimbăm pe un token de identitate, iar serverul îl verifică.
@MainActor
final class GoogleAutentificare: NSObject, ASWebAuthenticationPresentationContextProviding {
    /// ID-ul clientului Google de tip iOS, din Info.plist (`GoogleClientID`).
    private var clientId: String {
        (Bundle.main.object(forInfoDictionaryKey: "GoogleClientID") as? String) ?? ""
    }
    var estePornit: Bool { !clientId.isEmpty }

    private var schema: String {
        "com.googleusercontent.apps." + clientId.replacingOccurrences(of: ".apps.googleusercontent.com", with: "")
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow }.first ?? ASPresentationAnchor()
    }

    func autentifica() async throws -> String {
        guard estePornit else { throw GoogleEroare.nepornit }

        let verificator = Self.aleatoriu(64)
        let provocare = Data(SHA256.hash(data: Data(verificator.utf8))).base64URL
        let redirect = "\(schema):/oauth2redirect"

        var adresa = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        adresa.queryItems = [
            .init(name: "client_id", value: clientId),
            .init(name: "redirect_uri", value: redirect),
            .init(name: "response_type", value: "code"),
            .init(name: "scope", value: "openid email profile"),
            .init(name: "code_challenge", value: provocare),
            .init(name: "code_challenge_method", value: "S256"),
        ]

        let raspuns: URL = try await withCheckedThrowingContinuation { continuare in
            let sesiune = ASWebAuthenticationSession(url: adresa.url!, callbackURLScheme: schema) { url, eroare in
                if let url { continuare.resume(returning: url) }
                else if (eroare as? ASWebAuthenticationSessionError)?.code == .canceledLogin {
                    continuare.resume(throwing: GoogleEroare.renuntat)
                } else { continuare.resume(throwing: GoogleEroare.raspunsInvalid) }
            }
            sesiune.presentationContextProvider = self
            sesiune.start()
        }

        guard let cod = URLComponents(url: raspuns, resolvingAgainstBaseURL: false)?
            .queryItems?.first(where: { $0.name == "code" })?.value
        else { throw GoogleEroare.raspunsInvalid }

        var cerere = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        cerere.httpMethod = "POST"
        cerere.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var corp = URLComponents()
        corp.queryItems = [
            .init(name: "client_id", value: clientId),
            .init(name: "code", value: cod),
            .init(name: "code_verifier", value: verificator),
            .init(name: "redirect_uri", value: redirect),
            .init(name: "grant_type", value: "authorization_code"),
        ]
        cerere.httpBody = corp.percentEncodedQuery?.data(using: .utf8)

        let (date, _) = try await URLSession.shared.data(for: cerere)
        struct Token: Decodable { let id_token: String? }
        guard let token = try? JSONDecoder().decode(Token.self, from: date).id_token else {
            throw GoogleEroare.raspunsInvalid
        }
        return token
    }

    private static func aleatoriu(_ lungime: Int) -> String {
        var octeti = [UInt8](repeating: 0, count: lungime)
        _ = SecRandomCopyBytes(kSecRandomDefault, lungime, &octeti)
        return Data(octeti).base64URL
    }
}

private extension Data {
    var base64URL: String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
