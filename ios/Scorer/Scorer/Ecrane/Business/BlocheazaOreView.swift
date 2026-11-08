import SwiftUI

/// Blocarea orelor din calendar: pe orice perioadă, pe zilele alese, la orele
/// dorite, cu felul blocării (eveniment privat, rezervare la telefon,
/// mentenanță…). Fiecare zi devine o blocare obișnuită pe server, deci toate
/// verificările de suprapunere rămân valabile.
struct BlocheazaOreView: View {
    let terenuri: [Teren]
    let terenInitial: Teren?
    var ziInitiala = Calendar.current.startOfDay(for: Date())
    let reincarca: () -> Void

    @Environment(\.dismiss) private var inchide

    enum Fel: String, CaseIterable, Identifiable {
        case privat = "Eveniment privat"
        case telefon = "Rezervare la telefon"
        case mentenanta = "Mentenanță"
        case antrenament = "Antrenament"
        case turneu = "Turneu"
        case altul = "Altul"

        var id: String { rawValue }

        var simbol: String {
            switch self {
            case .privat: "lock.fill"
            case .telefon: "phone.fill"
            case .mentenanta: "wrench.and.screwdriver.fill"
            case .antrenament: "figure.run"
            case .turneu: "trophy.fill"
            case .altul: "ellipsis"
            }
        }

        /// Rezervarea la telefon are culoarea ei în calendar; restul sunt
        /// evenimente proprii ale proprietarului.
        var culoare: Color { self == .telefon ? Tema.intervalTelefon : Tema.intervalPrivat }
    }

    @State private var terenId: String = ""
    @State private var fel = Fel.privat
    @State private var motiv = ""
    @State private var clientNume = ""
    @State private var clientTelefon = ""
    @State private var deLa = Calendar.current.startOfDay(for: Date())
    @State private var panaLa = Calendar.current.startOfDay(for: Date())
    @State private var zile: Set<Int> = Set(1...7)
    @State private var toataZiua = false
    @State private var oraStart = 18
    @State private var oraSfarsit = 20
    @State private var seTrimite = false
    @State private var eroare: String?
    @State private var rezultat: String?

    private static let numeZile = ["L", "Ma", "Mi", "J", "V", "S", "D"]

    private var teren: Teren? { terenuri.first { $0.id == terenId } }
    private var deschidere: Int { teren?.oraDeschidere ?? 0 }
    private var inchidere: Int { teren?.oraInchidere ?? 24 }

    /// Zilele din perioadă care cad pe zilele bifate.
    private var zileAcoperite: [Date] {
        var rezultat: [Date] = []
        var zi = deLa
        let calendar = Calendar.current
        while zi <= panaLa, rezultat.count < 400 {
            if zile.contains(Self.ziIso(zi)) { rezultat.append(zi) }
            zi = calendar.date(byAdding: .day, value: 1, to: zi) ?? panaLa.addingTimeInterval(86_400)
        }
        return rezultat
    }

    private var oreEfective: (Int, Int) { toataZiua ? (deschidere, inchidere) : (oraStart, oraSfarsit) }

    private var problema: String? {
        if teren == nil { return "Alege terenul." }
        if fel == .telefon && clientNume.trimmingCharacters(in: .whitespaces).isEmpty { return "Scrie numele clientului." }
        if zile.isEmpty { return "Alege cel puțin o zi a săptămânii." }
        let (start, sfarsit) = oreEfective
        if sfarsit <= start { return "Ora de sfârșit trebuie să fie după ora de început." }
        if zileAcoperite.isEmpty { return "Perioada aleasă nu cuprinde nicio zi bifată." }
        let saptamani = Int((Double(Self.zileIntre(deLa, panaLa) + 1) / 7).rounded(.up))
        if saptamani > 52 { return "Poți bloca cel mult un an odată." }
        return nil
    }

    var body: some View {
        Form {
            Section("Teren") {
                Picker("Teren", selection: $terenId) {
                    ForEach(terenuri) { Text($0.nume).tag($0.id) }
                }
            }

            Section("Ce fel de blocare") {
                LazyVGrid(columns: [.init(.flexible(), spacing: 10), .init(.flexible(), spacing: 10)], spacing: 10) {
                    ForEach(Fel.allCases) { optiune in
                        Button { withAnimation(.snappy) { fel = optiune } } label: {
                            HStack(spacing: 8) {
                                Image(systemName: optiune.simbol).font(.system(size: 13, weight: .semibold))
                                Text(optiune.rawValue).font(.footnote.weight(.medium)).lineLimit(1).minimumScaleFactor(0.8)
                                Spacer(minLength: 0)
                            }
                            .padding(.horizontal, 12)
                            .frame(height: 44)
                            .foregroundStyle(fel == optiune ? .white : .primary)
                            .background(fel == optiune ? optiune.culoare : Color.primary.opacity(0.05),
                                        in: .rect(cornerRadius: 12, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 4)

                if fel == .telefon {
                    TextField("Numele clientului", text: $clientNume).textContentType(.name)
                    TextField("Telefon (opțional)", text: $clientTelefon).keyboardType(.phonePad)
                }
                TextField(fel == .altul ? "Motiv" : "Notă (opțional)", text: $motiv)
            }

            Section {
                DatePicker("De la", selection: $deLa, displayedComponents: .date)
                DatePicker("Până la", selection: $panaLa, in: deLa..., displayedComponents: .date)
                VStack(alignment: .leading, spacing: 8) {
                    Text("În zilele").font(.subheadline)
                    HStack(spacing: 6) {
                        ForEach(1...7, id: \.self) { zi in
                            let ales = zile.contains(zi)
                            Button {
                                if ales { zile.remove(zi) } else { zile.insert(zi) }
                            } label: {
                                Text(Self.numeZile[zi - 1])
                                    .font(.footnote.weight(.semibold))
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 36)
                                    .foregroundStyle(ales ? .white : .primary)
                                    .background(ales ? Tema.accent : Color.primary.opacity(0.06), in: .circle)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.vertical, 4)
            } header: {
                Text("Perioada")
            }

            Section("Orele") {
                Toggle("Toată ziua (\(String(format: "%02d:00–%02d:00", deschidere, inchidere)))", isOn: $toataZiua.animation())
                    .tint(Tema.accent)
                if !toataZiua {
                    Picker("De la ora", selection: $oraStart) {
                        ForEach(0..<24, id: \.self) { Text(String(format: "%02d:00", $0)).tag($0) }
                    }
                    Picker("Până la ora", selection: $oraSfarsit) {
                        ForEach(1...24, id: \.self) { Text(String(format: "%02d:00", $0)).tag($0) }
                    }
                }
            }

            Section {
                if let problema {
                    Label(problema, systemImage: "exclamationmark.circle").foregroundStyle(.secondary)
                } else {
                    let (start, sfarsit) = oreEfective
                    Label(
                        "\(zileAcoperite.count) \(zileAcoperite.count == 1 ? "zi" : "zile") · \(String(format: "%02d:00–%02d:00", start, sfarsit))",
                        systemImage: "calendar.badge.clock"
                    )
                }
                if let eroare { Text(eroare).foregroundStyle(Tema.ocupat) }
                if let rezultat { Text(rezultat).foregroundStyle(Tema.accent) }
            }
            .font(.footnote)

            Section {
                ButonPrincipal(
                    titlu: "Blochează orele",
                    simbol: "lock.fill",
                    seIncarca: seTrimite,
                    activ: problema == nil
                ) { Task { await trimite() } }
                .listRowInsets(.init())
                .listRowBackground(Color.clear)
            }
        }
        .navigationTitle("Blochează ore")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } }
        }
        .onAppear {
            if terenId.isEmpty { terenId = terenInitial?.id ?? terenuri.first?.id ?? "" }
            deLa = ziInitiala
            panaLa = ziInitiala
            if let teren {
                oraStart = max(teren.oraDeschidere, min(18, teren.oraInchidere - 1))
                oraSfarsit = min(teren.oraInchidere, oraStart + 2)
            }
        }
    }

    private func trimite() async {
        guard problema == nil, let teren else { return }
        eroare = nil
        rezultat = nil
        seTrimite = true
        defer { seTrimite = false }

        let (start, sfarsit) = oreEfective
        let nota = motiv.trimmingCharacters(in: .whitespaces)
        let motivFinal = fel == .telefon ? (nota.isEmpty ? "Rezervare telefonică" : nota)
            : (nota.isEmpty ? fel.rawValue : "\(fel.rawValue): \(nota)")

        struct Corp: Encodable {
            let terenId: String
            let zile: [Int]
            let oraStart: Int
            let oraSfarsit: Int
            let dataInceput: String
            let dataSfarsit: String
            let saptamani: Int
            let motiv: String
            let clientNume: String?
            let clientTelefon: String?
        }
        struct Raspuns: Decodable { let create: Int; let rezervate: Int; let blocate: Int; let trecute: Int }

        do {
            // O singură zi devine o blocare simplă, nu o serie: altfel apărea în
            // calendar cu „Șterge toată seria" pentru un singur interval.
            if zileAcoperite.count == 1, let zi = zileAcoperite.first {
                struct CorpSimplu: Encodable {
                    let terenId: String
                    let inceput: Date
                    let sfarsit: Date
                    let motiv: String
                    let clientNume: String?
                    let clientTelefon: String?
                }
                let calendar = Calendar.current
                guard
                    let inceput = calendar.date(bySettingHour: start, minute: 0, second: 0, of: zi),
                    let sfarsitData = calendar.date(byAdding: .hour, value: sfarsit - start, to: inceput)
                else { return }
                try await ApiClient.shared.cereFaraRaspuns(
                    "business/blocari", metoda: "POST",
                    corp: CorpSimplu(
                        terenId: teren.id, inceput: inceput, sfarsit: sfarsitData, motiv: motivFinal,
                        clientNume: fel == .telefon ? clientNume.trimmingCharacters(in: .whitespaces) : nil,
                        clientTelefon: fel == .telefon && !clientTelefon.isEmpty ? clientTelefon : nil
                    )
                )
                reincarca()
                inchide()
                return
            }

            let r: Raspuns = try await ApiClient.shared.cere(
                "business/blocari", metoda: "PUT",
                corp: Corp(
                    terenId: teren.id,
                    zile: zile.sorted(),
                    oraStart: start,
                    oraSfarsit: sfarsit,
                    dataInceput: ZiApi.text(deLa),
                    dataSfarsit: ZiApi.text(panaLa),
                    saptamani: max(1, Int((Double(Self.zileIntre(deLa, panaLa) + 1) / 7).rounded(.up))),
                    motiv: motivFinal,
                    clientNume: fel == .telefon ? clientNume.trimmingCharacters(in: .whitespaces) : nil,
                    clientTelefon: fel == .telefon && !clientTelefon.isEmpty ? clientTelefon : nil
                ),
                ca: Raspuns.self
            )
            reincarca()
            let sarite = r.rezervate + r.blocate + r.trecute
            if sarite == 0 {
                inchide()
            } else {
                // Rămânem pe ecran ca proprietarul să vadă ce nu s-a putut bloca.
                rezultat = "Am blocat \(r.create) \(r.create == 1 ? "zi" : "zile"). Sărite: \(r.rezervate) cu rezervări, \(r.blocate) deja blocate, \(r.trecute) în trecut."
            }
        } catch {
            eroare = error.localizedDescription
        }
    }

    /// Ziua săptămânii după ISO: 1 = luni … 7 = duminică.
    private static func ziIso(_ data: Date) -> Int {
        let zi = Calendar.current.component(.weekday, from: data)
        return zi == 1 ? 7 : zi - 1
    }

    private static func zileIntre(_ a: Date, _ b: Date) -> Int {
        Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: a), to: Calendar.current.startOfDay(for: b)).day ?? 0
    }
}
