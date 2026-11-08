import SwiftUI

enum SchimbareCont: String, Identifiable {
    case email, telefon, parola
    var id: String { rawValue }

    var titlu: String {
        switch self {
        case .email: "Schimbă emailul"
        case .telefon: "Schimbă telefonul"
        case .parola: "Schimbă parola"
        }
    }
}

/// Schimbarea emailului, telefonului sau parolei, în doi pași: parola actuală,
/// apoi un cod de 6 cifre primit pe email (pe adresa nouă, la schimbarea
/// emailului).
struct SchimbaDateView: View {
    let tip: SchimbareCont

    @Environment(Sesiune.self) private var sesiune
    @Environment(\.dismiss) private var inchide

    private enum Pas { case date, cod, gata }

    @State private var pas = Pas.date
    @State private var valoare = ""
    @State private var confirmare = ""
    @State private var parolaCurenta = ""
    @State private var cod = ""
    @State private var token = ""
    @State private var trimisLa = ""
    @State private var eroare: String?
    @State private var seTrimite = false
    @FocusState private var codActiv: Bool

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                switch pas {
                case .date: pasDate
                case .cod: pasCod
                case .gata: pasGata
                }
            }
            .padding(20)
            .animation(.snappy, value: pas)
        }
        .background(Tema.fundal.ignoresSafeArea())
        .scrollDismissesKeyboard(.interactively)
        .navigationTitle(pas == .gata ? "Gata" : tip.titlu)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button(pas == .gata ? "Închide" : "Renunță") { inchide() } }
        }
    }

    // MARK: Pasul 1

    private var pasDate: some View {
        VStack(spacing: 20) {
            Text(tip == .email
                 ? "Îți trimitem un cod pe adresa nouă, ca să confirmi că e a ta."
                 : "Confirmi cu parola actuală și cu un cod primit pe email.")
                .font(.subheadline).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            switch tip {
            case .email:
                CampAuth(titlu: "Emailul nou", simbol: "envelope", text: $valoare, tipTastatura: .emailAddress,
                         tipContinut: .emailAddress, faraMajuscule: true, exemplu: "nume@exemplu.ro")
            case .telefon:
                CampAuth(titlu: "Numărul nou", simbol: "phone", text: $valoare, tipTastatura: .phonePad,
                         tipContinut: .telephoneNumber, exemplu: "0722 123 456")
            case .parola:
                VStack(spacing: 14) {
                    CampAuth(titlu: "Parola nouă", simbol: "lock", text: $valoare, parola: true,
                             tipContinut: .newPassword, exemplu: "Minim 10 caractere")
                    CerinteParolaView(parola: valoare, nume: sesiune.utilizator?.nume ?? "", email: sesiune.utilizator?.email ?? "")
                }
                CampAuth(titlu: "Confirmă parola nouă", simbol: "lock.rotation", text: $confirmare, parola: true,
                         tipContinut: .newPassword,
                         eroare: !confirmare.isEmpty && confirmare != valoare ? "Parolele nu coincid." : nil)
            }

            CampAuth(titlu: "Parola actuală", simbol: "key", text: $parolaCurenta, parola: true,
                     tipContinut: .password, exemplu: "Parola cu care intri acum")

            mesajEroare

            ButonPrincipal(titlu: "Trimite codul", simbol: "paperplane.fill", seIncarca: seTrimite,
                           activ: !valoare.isEmpty && !parolaCurenta.isEmpty && (tip != .parola || valoare == confirmare)) {
                Task { await cere() }
            }
        }
    }

    // MARK: Pasul 2

    private var pasCod: some View {
        VStack(spacing: 24) {
            Image(systemName: "envelope.badge.fill")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(Tema.accent)
                .frame(width: 64, height: 64)
                .background(Tema.accent.opacity(0.12), in: .rect(cornerRadius: 18, style: .continuous))

            VStack(spacing: 6) {
                Text("Verifică-ți emailul").font(.title3.weight(.semibold))
                Text("Am trimis un cod de 6 cifre la \(trimisLa). E valabil 15 minute.")
                    .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }

            // Un singur câmp ascuns, afișat ca 6 căsuțe: așa merge și
            // completarea automată a codului din Mail.
            ZStack {
                TextField("", text: $cod)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .focused($codActiv)
                    .opacity(0.01)
                    .onChange(of: cod) { _, nou in
                        let cifre = String(nou.filter(\.isNumber).prefix(6))
                        if cifre != nou { cod = cifre }
                        if cifre.count == 6 { Task { await confirma() } }
                    }
                HStack(spacing: 10) {
                    ForEach(0..<6, id: \.self) { i in
                        let cifre = Array(cod)
                        Text(i < cifre.count ? String(cifre[i]) : "")
                            .font(.system(size: 26, weight: .semibold, design: .rounded).monospacedDigit())
                            .frame(width: 46, height: 58)
                            .background(Tema.fisa, in: .rect(cornerRadius: 14, style: .continuous))
                            .overlay {
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .strokeBorder(i == cifre.count && codActiv ? Tema.accent : Color.primary.opacity(0.12),
                                                  lineWidth: i == cifre.count && codActiv ? 2 : 1)
                            }
                    }
                }
                .allowsHitTesting(false)
            }
            .contentShape(.rect)
            .onTapGesture { codActiv = true }
            .onAppear { codActiv = true }

            mesajEroare

            ButonPrincipal(titlu: "Confirmă", seIncarca: seTrimite, activ: cod.count == 6) {
                Task { await confirma() }
            }
            Button("Nu ai primit codul? Trimite din nou") {
                cod = ""; eroare = nil; pas = .date
            }
            .font(.footnote.weight(.medium))
            .foregroundStyle(Tema.accent)
        }
    }

    // MARK: Gata

    private var pasGata: some View {
        VStack(spacing: 20) {
            SuccesAnimat(simbol: "checkmark")
                .padding(.top, 24)
            Text(tip == .parola ? "Parola a fost schimbată." : tip == .email ? "Emailul contului a fost schimbat." : "Numărul de telefon a fost schimbat.")
                .font(.headline)
            Text("Ți-am trimis și un email de confirmare.")
                .font(.subheadline).foregroundStyle(.secondary)
            ButonPrincipal(titlu: "Închide") { inchide() }
                .padding(.top, 8)
        }
    }

    @ViewBuilder
    private var mesajEroare: some View {
        if let eroare {
            Text(eroare)
                .font(.footnote).foregroundStyle(Tema.ocupat)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(Tema.ocupat.opacity(0.08), in: .rect(cornerRadius: 14, style: .continuous))
        }
    }

    // MARK: Rețea

    private func cere() async {
        struct Corp: Encodable { let tip: String; let parolaCurenta: String; let valoareNoua: String }
        struct Raspuns: Decodable { let token: String; let trimisLa: String }
        eroare = nil
        seTrimite = true
        defer { seTrimite = false }
        do {
            let r: Raspuns = try await ApiClient.shared.cere(
                "eu/schimbare", metoda: "POST",
                corp: Corp(tip: tip.rawValue, parolaCurenta: parolaCurenta,
                           valoareNoua: valoare.trimmingCharacters(in: .whitespaces)),
                ca: Raspuns.self
            )
            token = r.token
            trimisLa = r.trimisLa
            cod = ""
            pas = .cod
        } catch {
            eroare = error.localizedDescription
        }
    }

    private func confirma() async {
        guard !seTrimite, cod.count == 6 else { return }
        struct Corp: Encodable { let token: String; let cod: String }
        struct Raspuns: Decodable { let tip: String }
        eroare = nil
        seTrimite = true
        defer { seTrimite = false }
        do {
            let _: Raspuns = try await ApiClient.shared.cere(
                "eu/schimbare", metoda: "PUT", corp: Corp(token: token, cod: cod), ca: Raspuns.self
            )
            await sesiune.reincarcaProfil()
            pas = .gata
        } catch {
            eroare = error.localizedDescription
            cod = ""
        }
    }
}
