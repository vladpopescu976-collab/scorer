import AuthenticationServices
import CryptoKit
import SwiftUI

/// „Continuă cu Apple / Google". Doar sigla, în două butoane egale: textul nu
/// aduce nimic, iar sigla se recunoaște dintr-o privire. Fiecare furnizor dă
/// aplicației un token de identitate, pe care serverul îl verifică înainte să
/// creeze sau să deschidă contul.
struct ButoaneSociale: View {
    let continua: (_ furnizor: String, _ token: String, _ nume: String?) async throws -> Void
    let laEroare: (String) -> Void

    @State private var seIncarca = false
    private let google = GoogleAutentificare()
    private let apple = AppleAutentificare()

    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                Rectangle().fill(.secondary.opacity(0.22)).frame(height: 1)
                Text("sau continuă cu").font(.caption).foregroundStyle(.secondary)
                Rectangle().fill(.secondary.opacity(0.22)).frame(height: 1)
            }

            HStack(spacing: 14) {
                ButonSigla(eticheta: "Continuă cu Apple") {
                    Image(systemName: "apple.logo")
                        .font(.system(size: 24, weight: .regular))
                        .foregroundStyle(.primary)
                } actiune: {
                    Task { await pornesteApple() }
                }

                ButonSigla(eticheta: "Continuă cu Google") {
                    SiglaGoogle().frame(width: 24, height: 24)
                } actiune: {
                    Task { await pornesteGoogle() }
                }
            }
            .disabled(seIncarca)
            .opacity(seIncarca ? 0.5 : 1)
            .animation(.easeOut(duration: 0.15), value: seIncarca)
        }
    }

    private func pornesteApple() async {
        seIncarca = true
        defer { seIncarca = false }
        do {
            let rezultat = try await apple.autentifica()
            try await continua("apple", rezultat.token, rezultat.nume)
        } catch AppleEroare.renuntat {
            // Utilizatorul a închis fereastra.
        } catch {
            laEroare(error.localizedDescription)
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
}

/// Buton pătrat-lat cu o singură siglă: sticlă fină, contur subțire, umbră
/// moale, și o mică apăsare la atingere.
private struct ButonSigla<Sigla: View>: View {
    let eticheta: String
    @ViewBuilder let sigla: () -> Sigla
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            sigla()
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(Tema.fisa, in: .rect(cornerRadius: 18, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                }
                .shadow(color: .black.opacity(0.06), radius: 10, y: 4)
                .contentShape(.rect(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(ApasabilStyle())
        .accessibilityLabel(eticheta)
    }
}

/// „G"-ul Google în cele patru culori ale mărcii, desenat ca arce: fără
/// imagini în proiect și clar la orice dimensiune.
private struct SiglaGoogle: View {
    var body: some View {
        GeometryReader { geo in
            let d = min(geo.size.width, geo.size.height)
            let grosime = d * 0.2
            ZStack {
                arc(de: 0.62, pana: 0.88, culoare: Color(red: 0.92, green: 0.26, blue: 0.21))   // roșu, sus
                arc(de: 0.88, pana: 1.12, culoare: Color(red: 0.98, green: 0.74, blue: 0.02))   // galben, stânga
                arc(de: 0.12, pana: 0.37, culoare: Color(red: 0.20, green: 0.66, blue: 0.33))   // verde, jos
                arc(de: 0.37, pana: 0.5, culoare: Color(red: 0.26, green: 0.52, blue: 0.96))    // albastru, dreapta
                Rectangle()
                    .fill(Color(red: 0.26, green: 0.52, blue: 0.96))
                    .frame(width: d * 0.46, height: grosime)
                    .offset(x: d * 0.2, y: 0)
            }
            .frame(width: d - grosime, height: d - grosime)
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }

    private func arc(de: Double, pana: Double, culoare: Color) -> some View {
        GeometryReader { geo in
            let d = min(geo.size.width, geo.size.height)
            Circle()
                .trim(from: de, to: pana)
                .stroke(culoare, style: StrokeStyle(lineWidth: d * 0.25, lineCap: .butt))
                .rotationEffect(.degrees(0))
                .frame(width: d * 0.84, height: d * 0.84)
                .frame(width: geo.size.width, height: geo.size.height)
        }
    }
}

// MARK: - Apple

enum AppleEroare: LocalizedError {
    case renuntat, raspunsInvalid

    var errorDescription: String? {
        switch self {
        case .renuntat: nil
        case .raspunsInvalid: "Autentificarea cu Apple nu a reușit. Încearcă din nou."
        }
    }
}

/// Sign in with Apple, pornit din butonul nostru, nu din cel standard: cel
/// standard nu poate fi făcut doar siglă.
@MainActor
final class AppleAutentificare: NSObject, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding
{
    private var continuare: CheckedContinuation<(token: String, nume: String?), Error>?

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow }.first ?? ASPresentationAnchor()
    }

    func autentifica() async throws -> (token: String, nume: String?) {
        try await withCheckedThrowingContinuation { continuare in
            self.continuare = continuare
            let cerere = ASAuthorizationAppleIDProvider().createRequest()
            cerere.requestedScopes = [.fullName, .email]
            let controler = ASAuthorizationController(authorizationRequests: [cerere])
            controler.delegate = self
            controler.presentationContextProvider = self
            controler.performRequests()
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization autorizare: ASAuthorization) {
        defer { continuare = nil }
        guard
            let date = autorizare.credential as? ASAuthorizationAppleIDCredential,
            let bucati = date.identityToken,
            let token = String(data: bucati, encoding: .utf8)
        else {
            continuare?.resume(throwing: AppleEroare.raspunsInvalid)
            return
        }
        // Apple trimite numele doar la prima autentificare.
        let nume = [date.fullName?.givenName, date.fullName?.familyName]
            .compactMap { $0 }.joined(separator: " ")
        continuare?.resume(returning: (token, nume.isEmpty ? nil : nume))
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError eroare: Error) {
        defer { continuare = nil }
        if (eroare as? ASAuthorizationError)?.code == .canceled {
            continuare?.resume(throwing: AppleEroare.renuntat)
        } else {
            continuare?.resume(throwing: AppleEroare.raspunsInvalid)
        }
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
