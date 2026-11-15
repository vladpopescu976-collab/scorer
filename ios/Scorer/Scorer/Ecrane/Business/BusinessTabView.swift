import SwiftUI

struct BusinessTabView: View {
    @State private var tabAles = Self.tabInitial

    /// În build-urile de dezvoltare, ecranul de start poate fi ales din mediu,
    /// pentru verificări automate.
    private static var tabInitial: String {
        #if DEBUG
        ProcessInfo.processInfo.environment["SCORER_TAB"] ?? "ansamblu"
        #else
        "ansamblu"
        #endif
    }

    var body: some View {
        TabView(selection: $tabAles) {
            Tab("Ansamblu", systemImage: "chart.bar", value: "ansamblu") {
                NavigationStack { AnsambluView() }
                    .intrarePagina(.ridicare)
            }
            Tab("Calendar", systemImage: "calendar", value: "calendar") {
                NavigationStack { CalendarView() }
                    .intrarePagina(.apropiere)
            }
            Tab("Rezervări", systemImage: "list.clipboard", value: "rezervari") {
                NavigationStack { RezervariBusinessView() }
                    .intrarePagina(.glisare)
            }
            Tab("Terenuri", systemImage: "sportscourt", value: "terenuri") {
                NavigationStack { TerenuriBusinessView() }
                    .intrarePagina(.ridicare)
            }
            Tab("Recenzii", systemImage: "star", value: "recenzii") {
                NavigationStack { RecenziiBusinessView() }
                    .intrarePagina(.apropiere)
            }
            Tab("Cont", systemImage: "person", value: "cont") {
                NavigationStack { ContView() }
                    .intrarePagina(.clarificare)
            }
        }
        // Atingerea unei notificări despre o rezervare duce aici.
        .onReceive(NotificationCenter.default.publisher(for: .deschideRezervari)) { _ in
            tabAles = "rezervari"
        }
    }
}

struct AnsambluView: View {
    @State private var statistici: Statistici?
    @State private var seIncarca = true

    var body: some View {
        ZStack {
            Tema.fundal.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 16) {
                    if seIncarca {
                        ForEach(0..<2, id: \.self) { _ in ScheletFisa(inaltime: 120) }
                    } else if let s = statistici {
                        sectiuni(s)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
        }
        .safeAreaInset(edge: .top, spacing: 14) { antet }
        .navigationTitle("Privire de ansamblu")
        .navigationBarTitleDisplayMode(.inline)
        .faraTitluSus()
        .refreshable { await incarca() }
        .task { await incarca() }
    }

    /// Banda verde: cifra lunii mare, ca un panou de bord, și trei casete sub ea.
    private var antet: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Panou · \(Date().formatted(.dateTime.month(.wide).locale(.aplicatie)).capitalized)")
                    .font(.footnote.weight(.medium))
                    .opacity(0.6)
                Text("Venit luna aceasta")
                    .font(.system(size: 20, weight: .regular, design: .serif).italic())
                    .opacity(0.7)
                    .padding(.top, 6)
                Group {
                    if let s = statistici {
                        (Text(s.venitLunaCurenta.formatted(.number.locale(.aplicatie))) + Text(" RON").font(.title3.weight(.medium)).foregroundStyle(Tema.creta.opacity(0.6)))
                            .contentTransition(.numericText())
                    } else {
                        Text("—")
                    }
                }
                .font(.system(size: 44, weight: .semibold).monospacedDigit())
                .tracking(-1)
            }
            .padding(.horizontal, 20)

            HStack(spacing: 10) {
                caseta("Ocupare", statistici.map { "\($0.gradOcupare)%" } ?? "—", simbol: "chart.pie.fill")
                caseta("Rezervări", statistici.map { "\($0.totalRezervari)" } ?? "—", simbol: "calendar")
                caseta(
                    "De confirmat", statistici.map { "\($0.inAsteptare)" } ?? "—", simbol: "clock.badge.exclamationmark",
                    atentie: (statistici?.inAsteptare ?? 0) > 0
                )
            }
            .padding(.horizontal, 16)
        }
        .foregroundStyle(Tema.creta)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 2)
        .padding(.bottom, 22)
        .background { FundalVerde() }
    }

    private func caseta(_ titlu: String, _ valoare: String, simbol: String, atentie: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: simbol)
                .font(.caption.weight(.semibold))
                .foregroundStyle(atentie ? Tema.asteptare : Tema.accentDeschis)
            Text(valoare).font(.title3.weight(.semibold).monospacedDigit())
            Text(titlu).font(.caption2).opacity(0.65)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(.white.opacity(atentie ? 0.12 : 0.07), in: .rect(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(atentie ? Tema.asteptare.opacity(0.5) : .white.opacity(0.1))
        }
    }

    @ViewBuilder
    private func sectiuni(_ s: Statistici) -> some View {
        if !s.oreDeVarf.isEmpty {
            Sectiune("Cele mai cerute ore") {
                VStack(spacing: 10) {
                    ForEach(s.oreDeVarf) { ora in
                        HStack(spacing: 10) {
                            Text(String(format: "%02d:00", ora.ora))
                                .font(.subheadline.monospacedDigit())
                                .frame(width: 48, alignment: .leading)
                            GeometryReader { geo in
                                let maxim = s.oreDeVarf.map(\.rezervari).max() ?? 1
                                Capsule().fill(Color.primary.opacity(0.06))
                                    .overlay(alignment: .leading) {
                                        Capsule()
                                            .fill(Tema.gradientAccent)
                                            .frame(width: geo.size.width * CGFloat(ora.rezervari) / CGFloat(maxim))
                                    }
                            }
                            .frame(height: 10)
                            Text("\(ora.rezervari)")
                                .font(.caption.monospacedDigit()).foregroundStyle(.secondary)
                                .frame(width: 22, alignment: .trailing)
                        }
                    }
                }
            }
        }

        if !s.terenuri.isEmpty {
            Sectiune("Terenurile tale") {
                VStack(spacing: 0) {
                    ForEach(Array(s.terenuri.enumerated()), id: \.element.id) { index, teren in
                        if index > 0 { Divider() }
                        HStack(spacing: 10) {
                            Circle()
                                .fill(teren.activ ? Tema.accent : Color.secondary)
                                .frame(width: 8, height: 8)
                            Text(teren.nume).font(.subheadline.weight(.medium))
                            Spacer()
                            Text("\(teren.rezervari) rezervări")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 10)
                    }
                }
            }
        }
    }

    private func incarca() async {
        let noi = try? await ApiClient.shared.cere("business/statistici", ca: Statistici.self)
        withAnimation(.smooth) { statistici = noi }
        seIncarca = false
    }
}

struct Kpi: View {
    let titlu: String
    let valoare: String
    let simbol: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(titlu).font(.caption).foregroundStyle(.secondary)
                Spacer()
                Image(systemName: simbol).font(.caption).foregroundStyle(Tema.accent)
            }
            Text(valoare).font(.title3.bold())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Tema.fisa, in: .rect(cornerRadius: Tema.razaFisa, style: .continuous))
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}

struct Sectiune<Continut: View>: View {
    let titlu: String
    @ViewBuilder let continut: Continut

    init(_ titlu: String, @ViewBuilder continut: () -> Continut) {
        self.titlu = titlu
        self.continut = continut()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(titlu).font(.headline)
            continut
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Tema.fisa, in: .rect(cornerRadius: Tema.razaFisa, style: .continuous))
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}
