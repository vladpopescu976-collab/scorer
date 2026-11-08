import SwiftUI

/// Orele blocate ale unui teren, cu filtre: alegi perioada și felul, iar
/// seriile apar ca un singur rând, nu ca zeci de apariții una sub alta.
struct OreBlocateView: View {
    let teren: Teren
    let reincarca: () async -> [Blocare]

    @Environment(\.dismiss) private var inchide

    @State private var blocari: [Blocare]
    @State private var perioada = Perioada.saptamana
    @State private var fel = Fel.toate
    @State private var eroare: String?
    @State private var seSterge: String?
    @State private var deSters: Rand?

    init(teren: Teren, blocari: [Blocare], reincarca: @escaping () async -> [Blocare]) {
        self.teren = teren
        self.reincarca = reincarca
        _blocari = State(initialValue: blocari)
    }

    enum Perioada: String, CaseIterable, Identifiable {
        case azi = "Azi", saptamana = "7 zile", luna = "30 zile", toate = "Toate"
        var id: String { rawValue }
        var zile: Int? {
            switch self {
            case .azi: 1
            case .saptamana: 7
            case .luna: 30
            case .toate: nil
            }
        }
    }

    enum Fel: String, CaseIterable, Identifiable {
        case toate = "Toate", telefon = "Telefon", privat = "Privat"
        var id: String { rawValue }
    }

    /// Un rând din listă: o blocare singură sau o serie întreagă.
    enum Rand: Identifiable {
        case singura(Blocare)
        case serie(id: String, aparitii: [Blocare])
        var id: String {
            switch self {
            case .singura(let b): b.id
            case .serie(let id, _): "serie-\(id)"
            }
        }
    }

    // MARK: Filtrare

    private var filtrate: [Blocare] {
        let acum = Date()
        let calendar = Calendar.current
        let limita = perioada.zile.flatMap { calendar.date(byAdding: .day, value: $0, to: calendar.startOfDay(for: acum)) }
        return blocari
            .filter { $0.terenId == teren.id && $0.sfarsit > acum }
            .filter { limita == nil || $0.inceput < limita! }
            .filter {
                switch fel {
                case .toate: true
                case .telefon: $0.clientNume?.isEmpty == false
                case .privat: $0.clientNume?.isEmpty != false
                }
            }
            .sorted { $0.inceput < $1.inceput }
    }

    private var serii: [Rand] {
        Dictionary(grouping: filtrate.filter { $0.serieId != nil }, by: { $0.serieId! })
            .map { Rand.serie(id: $0.key, aparitii: $0.value.sorted { $0.inceput < $1.inceput }) }
            .sorted { prima($0) < prima($1) }
    }

    private var pe_zile: [(zi: Date, blocari: [Blocare])] {
        let singure = filtrate.filter { $0.serieId == nil }
        return Dictionary(grouping: singure, by: { Calendar.current.startOfDay(for: $0.inceput) })
            .map { ($0.key, $0.value) }
            .sorted { $0.zi < $1.zi }
    }

    private func prima(_ rand: Rand) -> Date {
        if case .serie(_, let a) = rand { return a.first?.inceput ?? .distantFuture }
        return .distantFuture
    }

    // MARK: Corp

    var body: some View {
        List {
            Section {
                Picker("Perioada", selection: $perioada.animation(.snappy)) {
                    ForEach(Perioada.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                Picker("Fel", selection: $fel.animation(.snappy)) {
                    ForEach(Fel.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
            } footer: {
                Text(rezumat)
            }

            if filtrate.isEmpty {
                Section {
                    StareGoala(simbol: "calendar.badge.checkmark", titlu: "Nimic blocat",
                               detaliu: "Nu există ore blocate în perioada aleasă.")
                }
                .listRowBackground(Color.clear)
            }

            if !serii.isEmpty {
                Section("Se repetă") {
                    ForEach(serii) { rand in
                        if case .serie(_, let aparitii) = rand, let prima = aparitii.first {
                            randSerie(prima, aparitii)
                                .swipeActions { Button("Șterge", role: .destructive) { deSters = rand } }
                        }
                    }
                }
            }

            ForEach(pe_zile, id: \.zi) { grup in
                Section(grup.zi.ziLunga.capitalized) {
                    ForEach(grup.blocari) { blocare in
                        randSingur(blocare)
                            .swipeActions { Button("Șterge", role: .destructive) { deSters = .singura(blocare) } }
                    }
                }
            }

            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(Tema.ocupat) }
            }
        }
        .navigationTitle(teren.nume)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) { Button("Gata") { inchide() } }
        }
        .confirmationDialog(
            textConfirmare,
            isPresented: .init(get: { deSters != nil }, set: { if !$0 { deSters = nil } }),
            titleVisibility: .visible
        ) {
            Button("Șterge", role: .destructive) {
                if let rand = deSters { Task { await sterge(rand) } }
            }
        }
    }

    private var rezumat: String {
        let n = filtrate.count
        if n == 0 { return "" }
        let ore = filtrate.reduce(0.0) { $0 + $1.sfarsit.timeIntervalSince($1.inceput) / 3600 }
        return "\(n) \(n == 1 ? "interval" : "intervale") · \(Int(ore.rounded())) \(Int(ore.rounded()) == 1 ? "oră" : "ore") blocate · glisează spre stânga ca să ștergi."
    }

    private var textConfirmare: String {
        switch deSters {
        case .serie(_, let a): "Ștergi toată seria (\(a.count) apariții viitoare)?"
        case .singura: "Ștergi intervalul?"
        case nil: ""
        }
    }

    // MARK: Rânduri

    private func iconita(_ b: Blocare) -> some View {
        let telefon = b.clientNume?.isEmpty == false
        return Image(systemName: telefon ? "phone.fill" : "lock.fill")
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 32, height: 32)
            .background(telefon ? Tema.intervalTelefon : Tema.intervalPrivat, in: .rect(cornerRadius: 9, style: .continuous))
    }

    private func randSingur(_ b: Blocare) -> some View {
        HStack(spacing: 12) {
            iconita(b)
            VStack(alignment: .leading, spacing: 2) {
                Text(b.clientNume ?? b.motiv ?? "Eveniment privat").font(.subheadline.weight(.medium)).lineLimit(1)
                Text("\(b.inceput.oraScurta) – \(b.sfarsit.oraScurta)").font(.footnote).foregroundStyle(.secondary)
            }
            Spacer()
            if seSterge == b.id { ProgressView() }
        }
    }

    private func randSerie(_ prima: Blocare, _ aparitii: [Blocare]) -> some View {
        let zile = Set(aparitii.map { Calendar.current.component(.weekday, from: $0.inceput) })
            .sorted { ($0 + 5) % 7 < ($1 + 5) % 7 }  // luni primul
            .map(Self.zi)
        return HStack(spacing: 12) {
            iconita(prima)
            VStack(alignment: .leading, spacing: 2) {
                Text(prima.clientNume ?? prima.motiv ?? "Eveniment privat").font(.subheadline.weight(.medium)).lineLimit(1)
                Text("Fiecare \(zile.joined(separator: ", ")) · \(prima.inceput.oraScurta) – \(prima.sfarsit.oraScurta)")
                    .font(.footnote).foregroundStyle(.secondary)
                Text("\(aparitii.count) \(aparitii.count == 1 ? "dată" : "ori") în perioada aleasă · următoarea \(prima.inceput.ziScurta)")
                    .font(.caption).foregroundStyle(.tertiary)
            }
            Spacer()
            if seSterge != nil && seSterge == prima.serieId { ProgressView() }
        }
    }

    private static func zi(_ weekday: Int) -> String {
        ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"][weekday - 1]
    }

    // MARK: Ștergere

    private func sterge(_ rand: Rand) async {
        eroare = nil
        do {
            switch rand {
            case .singura(let b):
                seSterge = b.id
                try await ApiClient.shared.cereFaraRaspuns("business/blocari/\(b.id)", metoda: "DELETE")
            case .serie(let id, _):
                seSterge = id
                struct Corp: Encodable { let serieId: String }
                struct Raspuns: Decodable { let sterse: Int }
                let _: Raspuns = try await ApiClient.shared.cere(
                    "business/blocari", metoda: "DELETE", corp: Corp(serieId: id), ca: Raspuns.self
                )
            }
            blocari = await reincarca()
        } catch {
            eroare = error.localizedDescription
        }
        seSterge = nil
        deSters = nil
    }
}
