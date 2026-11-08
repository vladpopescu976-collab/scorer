import SwiftUI

/// Ce cere „Acasă” de la tabul Caută: un sport ales sau deschiderea filtrelor.
struct CerereCautare: Equatable {
    let id = UUID()
    var sport: Sport?
    var deschideFiltre = false
}

/// Prima pagină: același bloc verde închis ca pe site, cu liniile terenului,
/// apoi terenuri recomandate și pașii. Căutarea propriu-zisă rămâne în Caută.
struct AcasaView: View {
    let cauta: (CerereCautare) -> Void

    @Environment(Sesiune.self) private var sesiune
    @State private var recomandate: [Teren] = []
    @State private var arataAutentificarea = false

    private static let verdeInchis = Color(red: 0.024, green: 0.137, blue: 0.102)
    private static let verdeMijloc = Color(red: 0.043, green: 0.29, blue: 0.176)
    private static let verdeLumina = Color(red: 0.078, green: 0.502, blue: 0.294)
    private static let menta = Color(red: 0.5, green: 0.88, blue: 0.65)

    private let sporturi: [Sport] = [.fotbal, .baschet, .tenis, .padel, .volei, .handbal, .badminton]

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                hero
                VStack(alignment: .leading, spacing: 30) {
                    if !recomandate.isEmpty { sectiuneRecomandate }
                    sectiunePasi
                }
                .padding(.top, 28)
                .padding(.bottom, 32)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Tema.fundal)
            }
        }
        .background {
            // La tragerea în jos, sus se vede tot verde, nu o margine albă.
            VStack(spacing: 0) {
                Self.verdeInchis.frame(height: 500)
                Tema.fundal
            }
            .ignoresSafeArea()
        }
        .toolbar {
            ElementFaraFundal(placement: .topBarLeading) {
                HStack(spacing: 9) {
                    SemnScorer()
                        .frame(width: 19, height: 19)
                        .frame(width: 32, height: 32)
                        .background(.white.opacity(0.1), in: .rect(cornerRadius: 10, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .strokeBorder(.white.opacity(0.2), lineWidth: 1)
                        }
                    Text("Scorer")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(.white)
                }
                .fixedSize()
            }
            ElementFaraFundal(placement: .topBarTrailing) { ButonCont() }
        }
        .toolbarBackground(Self.verdeInchis, for: .navigationBar)
        .toolbarBackgroundVisibility(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: String.self) { DetaliuTerenView(terenId: $0) }
        .sheet(isPresented: $arataAutentificarea) { AutentificareView() }
        .task { await incarcaRecomandate() }
        .refreshable { await incarcaRecomandate() }
    }

    // MARK: - Blocul verde

    private var hero: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("FOTBAL · BASCHET · TENIS · PADEL")
                .font(.system(size: 12, weight: .semibold))
                .tracking(2)
                .foregroundStyle(Self.menta)

            (Text("Rezervă un teren sportiv\n")
                .foregroundStyle(.white)
             + Text("în câteva secunde.")
                .foregroundStyle(.white.opacity(0.45)))
                .font(.system(size: 38, weight: .semibold))
                .tracking(-1.2)
                .lineSpacing(-2)
                .padding(.top, 14)

            Text("Vezi orele libere ale terenurilor din orașul tău, alege intervalul și trimite cererea. Fără telefoane, fără așteptat.")
                .font(.system(size: 16))
                .foregroundStyle(.white.opacity(0.7))
                .lineSpacing(3)
                .padding(.top, 14)

            baraCautare.padding(.top, 26)

            sporturiRapide.padding(.top, 16)

            VStack(alignment: .leading, spacing: 9) {
                avantaj("Rezervi și fără cont")
                avantaj("Plătești cu Apple Pay sau la teren")
                avantaj("Vezi orele libere pe loc")
            }
            .padding(.top, 22)

            PrevizualizareRezervare()
                .padding(.top, 30)
                .padding(.bottom, 64)

            if !sesiune.esteConectat { benziProprietari }
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background { fundalHero }
        .clipped()
    }

    private var fundalHero: some View {
        ZStack {
            Self.verdeInchis
            RadialGradient(
                colors: [Self.verdeLumina, Self.verdeMijloc, Self.verdeInchis],
                center: UnitPoint(x: 0.85, y: 0.14), startRadius: 0, endRadius: 560
            )
            // Sus, culoarea barei, ca bara și blocul să nu aibă o margine între ele.
            LinearGradient(
                colors: [Self.verdeInchis, Self.verdeInchis.opacity(0)],
                startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.12)
            )
            // Gazon tuns în dungi.
            Canvas { context, marime in
                let latime: CGFloat = 54
                var x: CGFloat = 0
                while x < marime.width {
                    context.fill(Path(CGRect(x: x, y: 0, width: latime, height: marime.height)),
                                 with: .color(.white.opacity(0.024)))
                    x += latime * 2
                }
            }
            .mask(LinearGradient(colors: [.clear, .black], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.12)))
            LiniiTeren()
                .stroke(.white.opacity(0.08), lineWidth: 1.5)
                .frame(width: 620, height: 400)
                .rotation3DEffect(.degrees(54), axis: (x: 1, y: 0, z: 0), perspective: 0.6)
                .rotationEffect(.degrees(-10))
                .offset(x: 170, y: 40)
                .frame(maxHeight: .infinity, alignment: .top)
        }
        .allowsHitTesting(false)
    }

    private var baraCautare: some View {
        Button {
            cauta(CerereCautare(deschideFiltre: true))
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Tema.accent)
                VStack(alignment: .leading, spacing: 1) {
                    Text("Unde vrei să joci?")
                        .font(.subheadline.weight(.semibold))
                    Text("Sport · oraș · zi · oră")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 8)
                Image(systemName: "arrow.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(Tema.gradientAccent, in: .circle)
            }
            .foregroundStyle(.black)
            .padding(.vertical, 9)
            .padding(.leading, 18)
            .padding(.trailing, 9)
            .background(.white, in: .capsule)
            .shadow(color: .black.opacity(0.3), radius: 20, y: 10)
        }
        .buttonStyle(.plain)
    }

    private var sporturiRapide: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(sporturi, id: \.self) { sport in
                    Button {
                        cauta(CerereCautare(sport: sport))
                    } label: {
                        Label(sport.eticheta, systemImage: sport.simbol)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(.white.opacity(0.08), in: .capsule)
                            .overlay { Capsule().strokeBorder(.white.opacity(0.14), lineWidth: 1) }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .scrollClipDisabled()
    }

    private func avantaj(_ text: String) -> some View {
        Label {
            Text(text).foregroundStyle(.white.opacity(0.7))
        } icon: {
            Image(systemName: "checkmark").foregroundStyle(Self.menta).fontWeight(.bold)
        }
        .font(.subheadline)
    }

    private var benziProprietari: some View {
        Button { arataAutentificarea = true } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Ai un teren?").font(.subheadline.weight(.semibold)).foregroundStyle(.white)
                    Text("Primește rezervări online, cu calendar.")
                        .font(.caption).foregroundStyle(.white.opacity(0.55))
                }
                Spacer()
                HStack(spacing: 4) {
                    Text("Adaugă-l gratuit")
                    Image(systemName: "arrow.right")
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
            }
            .padding(.vertical, 18)
            .overlay(alignment: .top) { Rectangle().fill(.white.opacity(0.1)).frame(height: 1) }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Sub blocul verde

    private var sectiuneRecomandate: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                Text("Terenuri recomandate").font(.title3.weight(.bold))
                Spacer()
                Button("Vezi toate") { cauta(CerereCautare()) }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Tema.accent)
            }
            .padding(.horizontal, 20)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) {
                    ForEach(recomandate) { teren in
                        NavigationLink(value: teren.id) { cardRecomandat(teren) }
                            .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 20)
            }
            .scrollClipDisabled()
        }
    }

    private func cardRecomandat(_ teren: Teren) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            PozaTeren(cale: teren.poze.first, sport: teren.sport)
                .frame(width: 230, height: 150)
                .clipped()
                .clipShape(.rect(cornerRadius: Tema.razaFisa, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text(teren.nume).font(.subheadline.weight(.semibold)).lineLimit(1)
                Text("\(teren.sport.eticheta) · \(teren.oras)")
                    .font(.caption).foregroundStyle(.secondary).lineLimit(1)
                HStack(spacing: 4) {
                    Text("\(Int(teren.pretPeOra)) RON").font(.subheadline.weight(.semibold))
                    Text("/ oră").font(.caption).foregroundStyle(.secondary)
                    let formate = teren.sport.formateAlese(teren.formate)
                    if !formate.isEmpty {
                        Spacer(minLength: 4)
                        Text(formate.map(\.cod).joined(separator: " · "))
                            .font(.caption.weight(.semibold).monospacedDigit())
                            .foregroundStyle(Tema.accent)
                    }
                }
                .padding(.top, 2)
            }
        }
        .frame(width: 230)
    }

    private var sectiunePasi: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Cum funcționează").font(.title3.weight(.bold))
            VStack(spacing: 10) {
                pas(1, "Caută un teren", "Filtrează după sport, oraș, zi și oră.", "magnifyingglass")
                pas(2, "Alege orele", "Apeși pe orele libere, vezi prețul pe loc.", "clock")
                pas(3, "Trimite cererea", "Plătești cu Apple Pay sau la teren și primești confirmarea.", "checkmark.seal")
            }
        }
        .padding(.horizontal, 20)
    }

    private func pas(_ numar: Int, _ titlu: String, _ detaliu: String, _ simbol: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: simbol)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Tema.accent)
                .frame(width: 40, height: 40)
                .background(Tema.accent.opacity(0.1), in: .rect(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text("\(numar). \(titlu)").font(.subheadline.weight(.semibold))
                Text(detaliu).font(.footnote).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
        .fisa()
    }

    private func incarcaRecomandate() async {
        let toate = (try? await ApiClient.shared.cere("terenuri", ca: [Teren].self)) ?? []
        recomandate = Array(toate.prefix(8))
    }
}

/// Element de bară fără bula de sticlă pe care iOS 26 o pune implicit.
private struct ElementFaraFundal<Continut: View>: ToolbarContent {
    let placement: ToolbarItemPlacement
    @ViewBuilder let continut: () -> Continut

    var body: some ToolbarContent {
        if #available(iOS 26, *) {
            ToolbarItem(placement: placement, content: continut).sharedBackgroundVisibility(.hidden)
        } else {
            ToolbarItem(placement: placement, content: continut)
        }
    }
}

/// Liniile unui teren de fotbal văzut de sus, ca în siglă (cadru 680 × 440).
private struct LiniiTeren: Shape {
    func path(in rect: CGRect) -> Path {
        let sx = rect.width / 680, sy = rect.height / 440
        func r(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect {
            CGRect(x: x * sx, y: y * sy, width: w * sx, height: h * sy)
        }
        var p = Path()
        p.addRoundedRect(in: r(10, 10, 660, 420), cornerSize: CGSize(width: 8 * sx, height: 8 * sy))
        p.move(to: CGPoint(x: 340 * sx, y: 10 * sy))
        p.addLine(to: CGPoint(x: 340 * sx, y: 430 * sy))
        p.addEllipse(in: r(278, 158, 124, 124))
        p.addRect(r(10, 110, 100, 220))
        p.addRect(r(10, 165, 38, 110))
        p.addRect(r(570, 110, 100, 220))
        p.addRect(r(632, 165, 38, 110))
        return p
    }
}

/// Ilustrație: cum arată o rezervare. Nu sunt date reale.
private struct PrevizualizareRezervare: View {
    private let ore: [(String, Int)] = [("17:00", 0), ("18:00", 0), ("19:00", 1), ("20:00", 1), ("21:00", 2), ("22:00", 2)]
    private let menta = Color(red: 0.5, green: 0.88, blue: 0.65)
    private let verde = Color(red: 0.043, green: 0.29, blue: 0.176)

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Teren sintetic · 5+1").font(.subheadline.weight(.semibold))
                    Text("Azi · alege orele").font(.caption).foregroundStyle(.white.opacity(0.5))
                }
                Spacer()
                Text("4 ore libere")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(menta)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(menta.opacity(0.15), in: .capsule)
            }

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                ForEach(ore, id: \.0) { ora, stare in
                    Text(ora)
                        .font(.footnote.weight(stare == 1 ? .semibold : .regular).monospacedDigit())
                        .strikethrough(stare == 0)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .foregroundStyle(stare == 1 ? verde : .white.opacity(stare == 0 ? 0.25 : 0.8))
                        .background(stare == 1 ? Color.white : .white.opacity(0.03),
                                    in: .rect(cornerRadius: 11, style: .continuous))
                        .overlay {
                            if stare == 2 {
                                RoundedRectangle(cornerRadius: 11, style: .continuous)
                                    .strokeBorder(.white.opacity(0.15), lineWidth: 1)
                            }
                        }
                }
            }

            HStack {
                VStack(alignment: .leading, spacing: 1) {
                    Text("19:00 – 21:00").font(.caption).foregroundStyle(.white.opacity(0.45))
                    Text("340 RON").font(.title3.weight(.semibold).monospacedDigit())
                }
                Spacer()
                Text("Rezervă")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(verde)
                    .padding(.horizontal, 16).padding(.vertical, 9)
                    .background(.white, in: .capsule)
            }
            .padding(.top, 14)
            .overlay(alignment: .top) { Rectangle().fill(.white.opacity(0.1)).frame(height: 1) }
        }
        .foregroundStyle(.white)
        .padding(18)
        .background(.white.opacity(0.06), in: .rect(cornerRadius: 26, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .strokeBorder(.white.opacity(0.1), lineWidth: 1)
        }
        .overlay(alignment: .bottomLeading) {
            HStack(spacing: 10) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(Tema.accent)
                VStack(alignment: .leading, spacing: 1) {
                    Text("Rezervare confirmată").font(.footnote.weight(.semibold))
                    Text("Azi, 19:00 – 21:00").font(.caption2).foregroundStyle(.secondary)
                }
            }
            .foregroundStyle(.black)
            .padding(.horizontal, 14).padding(.vertical, 11)
            .background(.white, in: .rect(cornerRadius: 16, style: .continuous))
            .shadow(color: .black.opacity(0.3), radius: 18, y: 8)
            .offset(x: 14, y: 40)
        }
        .accessibilityHidden(true)
    }
}
