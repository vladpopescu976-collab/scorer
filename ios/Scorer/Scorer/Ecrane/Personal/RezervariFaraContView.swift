import SwiftUI

/// O rezervare făcută fără cont, citită din linkul primit pe email.
struct RezervareVizitator: Decodable, Identifiable, Sendable {
    struct Teren: Decodable, Sendable {
        let nume: String
        let oras: String
        let adresa: String
        let telefon: String?
    }

    let id: String
    let status: StatusRezervare
    let inceput: Date
    let sfarsit: Date
    let inceputPropus: Date?
    let sfarsitPropus: Date?
    let pret: Double
    let nume: String?
    let teren: Teren

    var incheiata: Bool { sfarsit < Date() }
    var sePoateAnula: Bool { !incheiata && status != .anulata && status != .respinsa && status != .expirata }
}

/// Linkurile rezervărilor fără cont, ținute doar pe telefon.
enum TokenuriVizitator {
    private static let cheie = "scorer.tokenuriVizitator"

    static var toate: [String] {
        get { UserDefaults.standard.stringArray(forKey: cheie) ?? [] }
        set { UserDefaults.standard.set(newValue, forKey: cheie) }
    }

    /// Acceptă linkul întreg („…/rezervarea-mea/abc”) sau doar codul.
    static func dinText(_ text: String) -> String? {
        var curat = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if let bucata = curat.range(of: "rezervarea-mea/") {
            curat = String(curat[bucata.upperBound...])
        }
        curat = curat.split(whereSeparator: { "?#/ ".contains($0) }).first.map(String.init) ?? ""
        return curat.count >= 10 ? curat : nil
    }
}

/// „Rezervările mele" fără cont: lipești linkul din email și rezervarea apare
/// aici, cu anulare și răspuns la o oră propusă — fără să îți faci cont.
struct RezervariFaraCont: View {
    @State private var tokenuri = TokenuriVizitator.toate
    @State private var rezervari: [String: RezervareVizitator] = [:]
    @State private var erori: [String: String] = [:]
    @State private var link = ""
    @State private var eroareLink: String?
    @State private var emailLinkuri = ""
    @State private var linkuriTrimise = false
    @State private var seLucreaza: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Ai rezervat fără cont?").font(.headline)
                Text("Lipește linkul din emailul de rezervare și o vezi aici. Nu ai nevoie de cont.")
                    .font(.subheadline).foregroundStyle(.secondary)
            }

            HStack(spacing: 10) {
                CampAuth(titlu: "Linkul rezervării", simbol: "link", text: $link,
                         tipTastatura: .URL, faraMajuscule: true, eroare: eroareLink,
                         exemplu: "Lipește linkul din email", cuEticheta: false)
                Button {
                    adauga()
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 54, height: 54)
                        .background(Tema.gradientAccent, in: .rect(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Adaugă rezervarea")
                .disabled(link.trimmingCharacters(in: .whitespaces).isEmpty)
            }

            ForEach(tokenuri, id: \.self) { token in
                card(token)
            }

            Divider().padding(.vertical, 4)

            VStack(alignment: .leading, spacing: 10) {
                Text("Ai pierdut emailul?").font(.subheadline.weight(.semibold))
                if linkuriTrimise {
                    Label("Dacă ai rezervări pe adresa asta, linkurile sunt pe drum.", systemImage: "envelope.badge")
                        .font(.footnote).foregroundStyle(Tema.accent)
                } else {
                    HStack(spacing: 10) {
                        CampAuth(titlu: "Email", simbol: "envelope", text: $emailLinkuri,
                                 tipTastatura: .emailAddress, tipContinut: .emailAddress, faraMajuscule: true,
                                 exemplu: "Emailul folosit la rezervare", cuEticheta: false)
                        Button("Trimite") { Task { await trimiteLinkuri() } }
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Tema.accent)
                            .disabled(!emailLinkuri.contains("@") || seLucreaza == "email")
                    }
                }
            }
        }
        .task { await incarcaToate() }
    }

    @ViewBuilder
    private func card(_ token: String) -> some View {
        if let r = rezervari[token] {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(r.teren.nume).font(.headline)
                        Text("\(r.teren.adresa), \(r.teren.oras)").font(.footnote).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Pastila(text: r.status.eticheta, culoare: r.status.culoare, simbol: r.status.simbol)
                }
                Label("\(r.inceput.ziLunga.capitalized) · \(r.inceput.oraScurta) – \(r.sfarsit.oraScurta)", systemImage: "calendar")
                    .font(.subheadline)
                Label("\(Int(r.pret)) RON", systemImage: "creditcard").font(.subheadline)
                TelefonApelabil(telefon: r.teren.telefon)

                if r.status == .mutarePropusa, let start = r.inceputPropus, let sfarsit = r.sfarsitPropus {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Proprietarul îți propune: \(start.ziLunga.capitalized), \(start.oraScurta) – \(sfarsit.oraScurta)")
                            .font(.subheadline.weight(.medium))
                        HStack(spacing: 10) {
                            Button("Refuz") { Task { await raspundeMutare(token, "refuza") } }
                                .buttonStyle(.bordered)
                            Button("Accept") { Task { await raspundeMutare(token, "accepta") } }
                                .buttonStyle(.borderedProminent).tint(Tema.accent)
                        }
                        .disabled(seLucreaza == token)
                    }
                    .padding(12)
                    .background(Tema.intervalTelefon.opacity(0.08), in: .rect(cornerRadius: 12, style: .continuous))
                }

                if let eroare = erori[token] {
                    Text(eroare).font(.footnote).foregroundStyle(Tema.ocupat)
                }

                HStack {
                    if r.sePoateAnula {
                        Button("Anulează rezervarea", role: .destructive) { Task { await anuleaza(token) } }
                            .font(.footnote.weight(.medium))
                            .disabled(seLucreaza == token)
                    }
                    Spacer()
                    Button("Scoate din listă") { scoate(token) }
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .fisa()
        } else if let eroare = erori[token] {
            HStack {
                Label(eroare, systemImage: "exclamationmark.triangle").font(.footnote).foregroundStyle(.secondary)
                Spacer()
                Button("Scoate") { scoate(token) }.font(.footnote)
            }
            .fisa()
        } else {
            ScheletFisa(inaltime: 120)
        }
    }

    // MARK: - Acțiuni

    private func adauga() {
        guard let token = TokenuriVizitator.dinText(link) else {
            eroareLink = "Nu pare un link de rezervare Scorer."
            return
        }
        eroareLink = nil
        link = ""
        if !tokenuri.contains(token) {
            tokenuri.insert(token, at: 0)
            TokenuriVizitator.toate = tokenuri
        }
        Task { await incarca(token) }
    }

    private func scoate(_ token: String) {
        tokenuri.removeAll { $0 == token }
        TokenuriVizitator.toate = tokenuri
        rezervari[token] = nil
        erori[token] = nil
    }

    private func incarcaToate() async {
        for token in tokenuri { await incarca(token) }
    }

    private func incarca(_ token: String) async {
        do {
            rezervari[token] = try await ApiClient.shared.cere(
                "rezervari-vizitator", parametri: ["token": token], ca: RezervareVizitator.self
            )
            erori[token] = nil
        } catch {
            erori[token] = error.localizedDescription
        }
    }

    /// Anularea și răspunsul la mutare folosesc rutele publice ale site-ului,
    /// unde tokenul din link ține loc de parolă.
    private func posteaza(_ cale: String, _ corp: [String: String]) async throws {
        var cerere = URLRequest(url: Config.urlBaza.appendingPathComponent(cale))
        cerere.httpMethod = "POST"
        cerere.setValue("application/json", forHTTPHeaderField: "Content-Type")
        cerere.httpBody = try JSONEncoder().encode(corp)
        let (date, raspuns) = try await URLSession.shared.data(for: cerere)
        guard let http = raspuns as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            struct Eroare: Decodable { let error: String? }
            let mesaj = (try? JSONDecoder().decode(Eroare.self, from: date))?.error
            throw NSError(domain: "Scorer", code: 1, userInfo: [NSLocalizedDescriptionKey: mesaj ?? "Nu a mers. Încearcă din nou."])
        }
    }

    private func anuleaza(_ token: String) async {
        seLucreaza = token
        defer { seLucreaza = nil }
        do {
            try await posteaza("api/rezervari-vizitator/anulare", ["token": token])
            await incarca(token)
        } catch {
            erori[token] = error.localizedDescription
        }
    }

    private func raspundeMutare(_ token: String, _ actiune: String) async {
        seLucreaza = token
        defer { seLucreaza = nil }
        do {
            try await posteaza("api/rezervari-vizitator/mutare", ["token": token, "actiune": actiune])
            await incarca(token)
        } catch {
            erori[token] = error.localizedDescription
        }
    }

    private func trimiteLinkuri() async {
        seLucreaza = "email"
        defer { seLucreaza = nil }
        do {
            try await posteaza("api/rezervari-vizitator/linkuri", ["email": emailLinkuri.trimmingCharacters(in: .whitespaces)])
            linkuriTrimise = true
        } catch {
            eroareLink = error.localizedDescription
        }
    }
}
