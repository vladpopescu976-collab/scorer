import SwiftUI

// MARK: - Reguli de parolă (aceleași ca pe site și pe server)

enum ParolaSigura {
    static let lungimeMinima = 10

    struct Cerinta: Identifiable {
        let id: String
        let eticheta: String
        let obligatorie: Bool
        let indeplinita: Bool
    }

    private static let frecvente: Set<String> = [
        "parola", "parola123", "parola1234", "parola12345", "parolamea", "parolamea1", "password", "password1",
        "password123", "passw0rd", "qwerty", "qwerty123", "qwertyuiop", "azerty", "azerty123", "123456789",
        "1234567890", "12345678", "123456789a", "abc12345", "abcd1234", "abcd12345", "iloveyou", "iloveyou1",
        "welcome1", "welcome123", "admin123", "administrator", "letmein", "letmein123", "football", "football1",
        "fotbal", "fotbal123", "fotbal1234", "scorer", "scorer123", "scorer1234", "romania", "romania123",
        "bucuresti", "bucuresti1", "timisoara", "timisoara1", "monkey123", "dragon123", "master123", "sunshine1",
        "princess1", "superman1", "baseball1", "trustno1", "1q2w3e4r", "1q2w3e4r5t", "q1w2e3r4", "zaq12wsx",
        "test1234", "test12345", "user1234", "login123", "changeme1", "iubire123", "steaua123", "dinamo123",
    ]

    private static func simplificat(_ text: String) -> String {
        text.folding(options: .diacriticInsensitive, locale: nil).lowercased().filter { $0.isASCII && ($0.isLetter || $0.isNumber) }
    }

    private static func esteSecventa(_ parola: String) -> Bool {
        let p = parola.lowercased()
        if let primul = p.first, p.allSatisfy({ $0 == primul }) { return true }
        let secvente = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"]
        return secvente.contains { $0.contains(p) || String($0.reversed()).contains(p) }
    }

    static func cerinte(_ parola: String, nume: String, email: String) -> [Cerinta] {
        let simplu = simplificat(parola)
        let dinEmail = simplificat(String(email.split(separator: "@").first ?? ""))
        let bucati = ([dinEmail] + nume.split(separator: " ").map { simplificat(String($0)) })
            .filter { $0.count >= 4 || ($0 == dinEmail && $0.count >= 3) }
        let personal = bucati.contains { simplu.contains($0) }

        return [
            Cerinta(id: "lungime", eticheta: "Cel puțin \(lungimeMinima) caractere", obligatorie: true, indeplinita: parola.count >= lungimeMinima),
            Cerinta(id: "litera", eticheta: "O literă", obligatorie: true, indeplinita: parola.contains(where: \.isLetter)),
            Cerinta(id: "cifra", eticheta: "O cifră", obligatorie: true, indeplinita: parola.contains(where: \.isNumber)),
            Cerinta(id: "personal", eticheta: "Fără numele sau emailul tău", obligatorie: true, indeplinita: !parola.isEmpty && !personal),
            Cerinta(id: "frecventa", eticheta: "Nu e o parolă des folosită", obligatorie: true,
                    indeplinita: !parola.isEmpty && !frecvente.contains(parola.lowercased()) && !esteSecventa(parola)),
            Cerinta(id: "mixt", eticheta: "Litere mari și mici", obligatorie: false,
                    indeplinita: parola.contains(where: \.isLowercase) && parola.contains(where: \.isUppercase)),
            Cerinta(id: "simbol", eticheta: "Un simbol (ex. ! ? #)", obligatorie: false,
                    indeplinita: parola.contains { !$0.isLetter && !$0.isNumber && !$0.isWhitespace }),
        ]
    }

    static func problema(_ parola: String, nume: String, email: String) -> String? {
        guard let lipsa = cerinte(parola, nume: nume, email: email).first(where: { $0.obligatorie && !$0.indeplinita }) else { return nil }
        switch lipsa.id {
        case "lungime": return "Parola trebuie să aibă cel puțin \(lungimeMinima) caractere."
        case "litera": return "Parola trebuie să conțină cel puțin o literă."
        case "cifra": return "Parola trebuie să conțină cel puțin o cifră."
        case "personal": return "Parola nu poate conține numele sau emailul tău."
        default: return "Parola este prea ușor de ghicit. Alege alta."
        }
    }

    private static let greseli = [
        "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gmail.ro": "gmail.com",
        "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmail.con": "gmail.com", "gmaill.com": "gmail.com",
        "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.con": "yahoo.com", "yaoo.com": "yahoo.com",
        "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "outlok.com": "outlook.com", "iclod.com": "icloud.com",
    ]

    static func sugestieEmail(_ email: String) -> String? {
        let bucati = email.trimmingCharacters(in: .whitespaces).lowercased().split(separator: "@", omittingEmptySubsequences: false)
        guard bucati.count == 2, !bucati[0].isEmpty, let corect = greseli[String(bucati[1])] else { return nil }
        return "\(bucati[0])@\(corect)"
    }
}

// MARK: - Formularul în pași

/// Înregistrarea în patru pași, la fel ca pe site: tip cont, date de bază,
/// profil, confirmare. Fiecare pas se validează înainte să treci mai departe.
struct InregistrareWizard: View {
    let rolInitial: Rol
    let laTerminat: (_ adresa: String, _ rezultat: Sesiune.RezultatInregistrare) -> Void

    @Environment(Sesiune.self) private var sesiune

    @State private var pas = 0
    @State private var directie = 1
    @State private var rol: Rol
    @State private var nume = ""
    @State private var email = ""
    @State private var parola = ""
    @State private var confirmare = ""
    @State private var telefon = ""
    @State private var oras = ""
    @State private var numeFirma = ""
    @State private var site = ""
    @State private var arataErori = false
    @State private var seTrimite = false
    @State private var eroare: String?

    private static let titluri = ["Tipul contului", "Date de bază", "Profil", "Confirmare"]
    private static let descrieri = [
        "Ce faci pe Scorer: joci sau închiriezi?",
        "Cum te cheamă și cum intri în cont.",
        "Detaliile de care avem nevoie ca să funcționeze rezervările.",
        "Verifică datele și creează contul.",
    ]

    init(rolInitial: Rol, laTerminat: @escaping (String, Sesiune.RezultatInregistrare) -> Void) {
        self.rolInitial = rolInitial
        self.laTerminat = laTerminat
        _rol = State(initialValue: rolInitial)
    }

    // MARK: Validare

    private var eroareNume: String? {
        nume.trimmingCharacters(in: .whitespaces).count >= 2 ? nil : "Introdu numele."
    }
    private var eroareEmail: String? {
        let t = email.trimmingCharacters(in: .whitespaces)
        return t.range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"#, options: .regularExpression) != nil ? nil : "Adresă de email invalidă."
    }
    private var eroareParola: String? { ParolaSigura.problema(parola, nume: nume, email: email) }
    private var eroareConfirmare: String? { confirmare == parola ? nil : "Parolele nu coincid." }
    private var eroareTelefon: String? {
        let curat = telefon.filter { !" .-".contains($0) }
        return curat.range(of: #"^(\+4)?0[237]\d{8}$"#, options: .regularExpression) != nil ? nil : "Număr invalid. Exemplu: 0722 123 456."
    }
    private var eroareOras: String? { oras.trimmingCharacters(in: .whitespaces).count >= 2 ? nil : "Alege orașul." }
    private var eroareFirma: String? {
        rol == .business && numeFirma.trimmingCharacters(in: .whitespaces).count < 2 ? "Denumirea firmei este obligatorie." : nil
    }

    private var pasulEValid: Bool {
        switch pas {
        case 1: eroareNume == nil && eroareEmail == nil && eroareParola == nil && eroareConfirmare == nil
        case 2: eroareTelefon == nil && eroareOras == nil && eroareFirma == nil
        default: true
        }
    }

    // MARK: Corp

    var body: some View {
        VStack(spacing: 28) {
            StepperPasi(pas: pas)

            VStack(spacing: 6) {
                Text(Self.titluri[pas]).font(.headline)
                Text("Pasul \(pas + 1) din 4 · \(Self.descrieri[pas])")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .id("titlu\(pas)")
            .transition(.opacity)

            Group {
                switch pas {
                case 0: pasTip
                case 1: pasDate
                case 2: pasProfil
                default: pasConfirmare
                }
            }
            .id(pas)
            .transition(
                .asymmetric(
                    insertion: .move(edge: directie > 0 ? .trailing : .leading).combined(with: .opacity),
                    removal: .opacity
                )
            )

            if let eroare {
                Text(eroare)
                    .font(.footnote)
                    .foregroundStyle(Tema.ocupat)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Tema.ocupat.opacity(0.08), in: .rect(cornerRadius: 14, style: .continuous))
            }

            butoane

            if pas == 0 {
                ButoaneSociale(
                    continua: { furnizor, token, nume in
                        try await sesiune.autentificaSocial(furnizor: furnizor, token: token, nume: nume, rol: rol)
                    },
                    laEroare: { eroare = $0 }
                )
            }
        }
        .clipped()
    }

    // MARK: Pași

    private var pasTip: some View {
        VStack(spacing: 14) {
            OptiuneCont(
                titlu: "Vreau să joc", simbol: "figure.run",
                puncte: ["Căutare pe oraș, sport și oră", "Rezervi în câteva secunde", "Terenuri favorite și recenzii"],
                ales: rol == .personal
            ) { rol = .personal }
            OptiuneCont(
                titlu: "Am terenuri de închiriat", simbol: "building.2",
                puncte: ["Calendar și orar pe fiecare teren", "Aprobi sau muți cererile", "Rezervări luate la telefon, la un loc"],
                ales: rol == .business
            ) { rol = .business }
        }
    }

    private var pasDate: some View {
        VStack(spacing: 18) {
            CampAuth(
                titlu: rol == .business ? "Persoană de contact" : "Nume complet", simbol: "person",
                text: $nume, tipContinut: .name,
                eroare: arataErori ? eroareNume : nil
            )

            VStack(alignment: .leading, spacing: 8) {
                CampAuth(
                    titlu: "Adresă de email", simbol: "envelope", text: $email,
                    tipTastatura: .emailAddress, tipContinut: .emailAddress, faraMajuscule: true,
                    eroare: arataErori ? eroareEmail : nil
                )
                if let sugestie = ParolaSigura.sugestieEmail(email) {
                    Button("Ai vrut să scrii \(sugestie)?") { withAnimation { email = sugestie } }
                        .font(.footnote)
                        .foregroundStyle(Tema.accent)
                        .padding(.leading, 4)
                        .transition(.opacity)
                }
            }

            VStack(alignment: .leading, spacing: 14) {
                CampAuth(
                    titlu: "Parolă", simbol: "lock", text: $parola, parola: true, tipContinut: .newPassword,
                    eroare: arataErori ? eroareParola : nil
                )
                PutereaParolei(parola: parola)
                CerinteParolaView(parola: parola, nume: nume, email: email)
            }

            CampAuth(
                titlu: "Confirmă parola", simbol: "lock.rotation", text: $confirmare, parola: true,
                tipContinut: .newPassword,
                // Cât scrii, fără să aștepți butonul „Continuă".
                eroare: (arataErori || !confirmare.isEmpty) ? eroareConfirmare : nil
            )
        }
    }

    private var pasProfil: some View {
        VStack(spacing: 18) {
            if rol == .business {
                CampAuth(
                    titlu: "Denumirea firmei", simbol: "building.2", text: $numeFirma,
                    tipContinut: .organizationName, eroare: arataErori ? eroareFirma : nil
                )
            }
            CampAuth(
                titlu: "Telefon", simbol: "phone", text: $telefon, tipTastatura: .phonePad,
                tipContinut: .telephoneNumber, eroare: arataErori ? eroareTelefon : nil
            )
            Text("Pe el te caută proprietarul sau clientul când apare o schimbare la rezervare.")
                .font(.caption).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 4)
                .padding(.top, -8)
            CampAuth(
                titlu: "Oraș", simbol: "mappin.and.ellipse", text: $oras, tipContinut: .addressCity,
                eroare: arataErori ? eroareOras : nil
            )
            if rol == .business {
                CampAuth(
                    titlu: "Site (opțional)", simbol: "globe", text: $site, tipTastatura: .URL,
                    tipContinut: .URL, faraMajuscule: true
                )
            }
        }
    }

    private var pasConfirmare: some View {
        VStack(spacing: 18) {
            VStack(spacing: 0) {
                rand("Tip cont", rol == .business ? "Business" : "Personal")
                rand("Nume", nume)
                rand("Email", email)
                rand("Telefon", telefon)
                rand("Oraș", oras)
                if rol == .business {
                    rand("Firmă", numeFirma)
                    if !site.isEmpty { rand("Site", site) }
                }
            }
            .background(Tema.fisa, in: .rect(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Color.primary.opacity(0.08))
            }

            Label("Parola ta e criptată și nu o vedem niciodată. Îți poți șterge contul oricând.", systemImage: "checkmark.shield.fill")
                .font(.caption)
                .foregroundStyle(.secondary)
                .labelStyle(.titleAndIcon)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 4)

            // Acceptarea prin acțiune, notată pe server ca dată.
            Text("Creând contul accepți termenii și condițiile și politica de confidențialitate, disponibile pe scorer.ro.")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 4)
        }
    }

    private func rand(_ eticheta: String, _ valoare: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(eticheta).font(.subheadline).foregroundStyle(.secondary)
            Spacer(minLength: 16)
            Text(valoare).font(.subheadline.weight(.medium)).multilineTextAlignment(.trailing)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 13)
        .overlay(alignment: .bottom) { Divider().padding(.leading, 16) }
    }

    // MARK: Butoane

    private var butoane: some View {
        HStack(spacing: 12) {
            if pas > 0 {
                Button {
                    mergi(-1)
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                        .frame(width: 54, height: 54)
                        .background(Tema.fisa, in: .rect(cornerRadius: 14, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.primary.opacity(0.1))
                        }
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Înapoi")
                .disabled(seTrimite)
            }

            if pas < 3 {
                ButonPrincipal(titlu: "Continuă", simbol: "arrow.right") { inainte() }
            } else {
                ButonPrincipal(titlu: "Creează contul", seIncarca: seTrimite) { Task { await creeaza() } }
            }
        }
    }

    private func mergi(_ delta: Int) {
        eroare = nil
        arataErori = false
        directie = delta
        withAnimation(.snappy(duration: 0.32)) { pas = min(3, max(0, pas + delta)) }
    }

    private func inainte() {
        if !pasulEValid {
            withAnimation { arataErori = true }
            return
        }
        mergi(1)
    }

    private func creeaza() async {
        eroare = nil
        seTrimite = true
        defer { seTrimite = false }
        let adresa = email.trimmingCharacters(in: .whitespaces)
        do {
            let rezultat = try await sesiune.inregistreaza(
                nume: nume.trimmingCharacters(in: .whitespaces),
                email: adresa,
                parola: parola,
                telefon: telefon.trimmingCharacters(in: .whitespaces),
                oras: oras.trimmingCharacters(in: .whitespaces),
                numeFirma: numeFirma.trimmingCharacters(in: .whitespaces),
                site: site.trimmingCharacters(in: .whitespaces),
                rol: rol
            )
            laTerminat(adresa, rezultat)
        } catch {
            eroare = error.localizedDescription
        }
    }
}

// MARK: - Piese

private struct OptiuneCont: View {
    let titlu: String
    let simbol: String
    let puncte: [String]
    let ales: Bool
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) {
                    Image(systemName: simbol)
                        .font(.system(size: 17))
                        .foregroundStyle(ales ? .white : Tema.accent)
                        .frame(width: 40, height: 40)
                        .background(ales ? Tema.accent : Tema.accent.opacity(0.12), in: .rect(cornerRadius: 12, style: .continuous))
                    Text(titlu).font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                    Spacer()
                    if ales {
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(Tema.accent).transition(.scale.combined(with: .opacity))
                    }
                }
                VStack(alignment: .leading, spacing: 7) {
                    ForEach(puncte, id: \.self) { punct in
                        Label(punct, systemImage: "checkmark")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .labelStyle(.titleAndIcon)
                    }
                }
                .padding(.leading, 52)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(ales ? Tema.accent.opacity(0.07) : Tema.fisa, in: .rect(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .strokeBorder(ales ? Tema.accent : Color.primary.opacity(0.08), lineWidth: ales ? 1.5 : 1)
            }
            .animation(.snappy(duration: 0.25), value: ales)
        }
        .buttonStyle(.plain)
    }
}

/// Cele patru cercuri ale pașilor, unite printr-o linie care se umple.
private struct StepperPasi: View {
    let pas: Int
    @State private var puls = false
    private let simboluri = ["sparkles", "person", "list.clipboard", "checkmark.shield"]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(0..<4, id: \.self) { index in
                let facut = index < pas
                let curent = index == pas
                ZStack {
                    if curent {
                        Circle().stroke(Tema.accent, lineWidth: 2)
                            .scaleEffect(puls ? 1.5 : 1).opacity(puls ? 0 : 0.5)
                    }
                    Circle()
                        .fill(facut ? Tema.accent : (curent ? Tema.accent.opacity(0.12) : Color.clear))
                        .overlay { Circle().strokeBorder(facut || curent ? Tema.accent : Color.primary.opacity(0.15), lineWidth: 2) }
                    Image(systemName: facut ? "checkmark" : simboluri[index])
                        .font(.system(size: 14, weight: facut ? .bold : .medium))
                        .foregroundStyle(facut ? .white : (curent ? Tema.accent : .secondary))
                        .contentTransition(.symbolEffect(.replace))
                }
                .frame(width: 38, height: 38)
                .scaleEffect(curent ? 1.08 : 1)

                if index < 3 {
                    Capsule().fill(Color.primary.opacity(0.1)).frame(height: 2)
                        .overlay(alignment: .leading) {
                            GeometryReader { geo in
                                Capsule().fill(Tema.accent).frame(width: facut ? geo.size.width : 0)
                            }
                        }
                        .padding(.horizontal, 6)
                }
            }
        }
        .animation(.snappy(duration: 0.35), value: pas)
        .onAppear {
            withAnimation(.easeOut(duration: 1.6).repeatForever(autoreverses: false)) { puls = true }
        }
    }
}

/// Lista de cerințe, care se bifează animat cât scrii parola.
private struct CerinteParolaView: View {
    let parola: String
    let nume: String
    let email: String

    var body: some View {
        if !parola.isEmpty {
            let cerinte = ParolaSigura.cerinte(parola, nume: nume, email: email)
            VStack(alignment: .leading, spacing: 11) {
                ForEach(cerinte) { c in
                    HStack(spacing: 11) {
                        ZStack {
                            Circle().fill(c.indeplinita ? Tema.accent : Color.clear)
                            Circle().strokeBorder(c.indeplinita ? Tema.accent : Color.primary.opacity(0.18), lineWidth: 1.2)
                            if c.indeplinita {
                                Image(systemName: "checkmark").font(.system(size: 8, weight: .heavy)).foregroundStyle(.white)
                                    .transition(.scale)
                            }
                        }
                        .frame(width: 18, height: 18)
                        Text(c.eticheta + (c.obligatorie ? "" : " · recomandat"))
                            .font(.footnote)
                            .foregroundStyle(c.indeplinita ? Tema.accent : .secondary)
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.primary.opacity(0.04), in: .rect(cornerRadius: 14, style: .continuous))
            .animation(.snappy(duration: 0.25), value: cerinte.map(\.indeplinita))
            .transition(.opacity.combined(with: .move(edge: .top)))
        }
    }
}

/// Cercul de succes, cu unde care se răsfrâng în jur.
struct SuccesAnimat: View {
    let simbol: String
    @State private var apare = false
    @State private var unda = false

    var body: some View {
        ZStack {
            ForEach(0..<2, id: \.self) { i in
                Circle().stroke(Tema.accent.opacity(0.4), lineWidth: 1)
                    .frame(width: 76, height: 76)
                    .scaleEffect(unda ? 1.9 : 1).opacity(unda ? 0 : 0.6)
                    .animation(.easeOut(duration: 1.8).repeatForever(autoreverses: false).delay(Double(i) * 0.9), value: unda)
            }
            Circle().fill(Tema.accent)
                .frame(width: 76, height: 76)
                .shadow(color: Tema.accent.opacity(0.35), radius: 14, y: 6)
                .overlay { Image(systemName: simbol).font(.system(size: 30, weight: .semibold)).foregroundStyle(.white) }
                .scaleEffect(apare ? 1 : 0.1).rotationEffect(.degrees(apare ? 0 : -30))
        }
        .onAppear {
            withAnimation(.spring(response: 0.55, dampingFraction: 0.55)) { apare = true }
            unda = true
        }
    }
}
