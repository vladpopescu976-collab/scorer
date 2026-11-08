import SwiftUI

/// Ce cere „Acasă” de la tabul Caută: un sport ales sau deschiderea filtrelor.
struct CerereCautare: Equatable {
    let id = UUID()
    var sport: Sport?
    var deschideFiltre = false
}

/// Culorile primei pagini: verdele unui stadion seara și albul cretei de pe teren.
private enum Paleta {
    static let verdeSus = Color(red: 0.043, green: 0.165, blue: 0.11)
    static let verdeJos = Color(red: 0.027, green: 0.086, blue: 0.059)
    static let creta = Color(red: 0.953, green: 0.937, blue: 0.902)
    static let verdeButon = Color(red: 0.055, green: 0.42, blue: 0.227)
}

/// Prima pagină: un bloc de stadion seara (lumini, granulație, liniile
/// terenului care se desenează), apoi terenuri și pașii. Căutarea propriu-zisă
/// rămâne în Caută.
struct AcasaView: View {
    let cauta: (CerereCautare) -> Void

    @Environment(Sesiune.self) private var sesiune
    @Environment(\.accessibilityReduceMotion) private var faraMiscare
    @State private var terenuri: [Teren] = []
    @State private var arataAutentificarea = false
    @State private var aparut = false

    private let sporturi: [Sport] = [.fotbal, .baschet, .tenis, .padel, .volei, .handbal, .badminton]

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                hero
                    // Verdele de deasupra blocului se mișcă odată cu el: la
                    // tragerea în jos nu apare o margine albă, iar la derulare
                    // nu rămâne o bandă verde fixă în spate.
                    .background(alignment: .top) {
                        Paleta.verdeSus.frame(height: 900).offset(y: -900)
                    }
                VStack(alignment: .leading, spacing: 36) {
                    if !terenuri.isEmpty { sectiuneRecomandate }
                    sectiunePasi
                    if !sesiune.esteConectat { cardProprietari }
                }
                .padding(.top, 34)
                .padding(.bottom, 36)
            }
        }
        .background(Tema.fundal.ignoresSafeArea())
        .toolbar {
            ElementFaraFundal(placement: .topBarLeading) {
                HStack(spacing: 9) {
                    SemnScorer(culoare: Paleta.creta)
                        .frame(width: 19, height: 19)
                        .frame(width: 32, height: 32)
                        .background(.white.opacity(0.08), in: .rect(cornerRadius: 10, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .strokeBorder(.white.opacity(0.16), lineWidth: 1)
                        }
                    Text("Scorer")
                        .font(.system(size: 18, weight: .semibold))
                        .tracking(-0.3)
                        .foregroundStyle(Paleta.creta)
                }
                .fixedSize()
            }
            ElementFaraFundal(placement: .topBarTrailing) { ButonCont() }
        }
        .toolbarBackground(Paleta.verdeSus, for: .navigationBar)
        .toolbarBackgroundVisibility(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: String.self) { DetaliuTerenView(terenId: $0) }
        .sheet(isPresented: $arataAutentificarea) { AutentificareView() }
        .task { await incarca() }
        .refreshable { await incarca() }
        // Intrarea se reia de fiecare dată când revii pe Acasă.
        .onAppear {
            if faraMiscare { aparut = true } else { withAnimation { aparut = true } }
        }
        .onDisappear { aparut = false }
    }

    // MARK: - Blocul de stadion

    private var hero: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 9) {
                PunctViu()
                Text(terenuri.isEmpty ? "Terenuri în toată România" : "\(terenuri.count) terenuri active în România")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Paleta.creta.opacity(0.72))
                    .contentTransition(.numericText())
            }
            .intrare(aparut, intarziere: 0)

            VStack(alignment: .leading, spacing: -4) {
                Text("Rezervă terenul.")
                    .font(.system(size: 44, weight: .semibold))
                    .tracking(-1.6)
                    .foregroundStyle(Paleta.creta)
                    .intrare(aparut, intarziere: 0.08)
                Text("Restul e joc.")
                    .font(.system(size: 47, weight: .regular, design: .serif).italic())
                    .tracking(-0.8)
                    .foregroundStyle(Paleta.creta.opacity(0.58))
                    .intrare(aparut, intarziere: 0.18)
            }
            .padding(.top, 18)

            Text("Vezi orele libere ale terenurilor din orașul tău, alege intervalul și trimite cererea în câteva secunde.")
                .font(.system(size: 16))
                .foregroundStyle(Paleta.creta.opacity(0.62))
                .lineSpacing(3)
                .padding(.top, 16)
                .intrare(aparut, intarziere: 0.26)

            baraCautare
                .padding(.top, 28)
                .intrare(aparut, intarziere: 0.34)

            sporturiRapide
                .padding(.top, 26)
                .intrare(aparut, intarziere: 0.42)
        }
        .padding(.horizontal, 22)
        .padding(.top, 22)
        .padding(.bottom, 34)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background { FundalStadion(animat: aparut && !faraMiscare) }
        .clipShape(UnevenRoundedRectangle(bottomLeadingRadius: 34, bottomTrailingRadius: 34, style: .continuous))
        .shadow(color: .black.opacity(0.10), radius: 2, y: 1)
        .shadow(color: Paleta.verdeJos.opacity(0.35), radius: 28, y: 18)
    }

    private var baraCautare: some View {
        Button {
            cauta(CerereCautare(deschideFiltre: true))
        } label: {
            HStack(spacing: 13) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Paleta.verdeButon)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Unde vrei să joci?")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.black)
                    Text("Sport · oraș · zi · oră")
                        .font(.caption)
                        .foregroundStyle(.black.opacity(0.45))
                }
                Spacer(minLength: 8)
                Image(systemName: "arrow.right")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background {
                        Circle()
                            .fill(Paleta.verdeButon)
                            .overlay { Circle().strokeBorder(.white.opacity(0.18), lineWidth: 1) }
                            .shadow(color: Paleta.verdeButon.opacity(0.5), radius: 8, y: 4)
                    }
            }
            .padding(.vertical, 9)
            .padding(.leading, 20)
            .padding(.trailing, 9)
            .background(.white, in: .capsule)
            // Umbre în straturi: contur fin, apoi o umbră lungă și moale.
            .shadow(color: .black.opacity(0.14), radius: 1, y: 1)
            .shadow(color: .black.opacity(0.22), radius: 10, y: 6)
            .shadow(color: .black.opacity(0.35), radius: 34, y: 24)
        }
        .buttonStyle(ApasarePremium())
    }

    private var sporturiRapide: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 18) {
                ForEach(sporturi, id: \.self) { sport in
                    Button {
                        cauta(CerereCautare(sport: sport))
                    } label: {
                        VStack(spacing: 8) {
                            Image(systemName: sport.simbol)
                                .font(.system(size: 20, weight: .regular))
                                .foregroundStyle(Paleta.creta)
                                .frame(width: 58, height: 58)
                                .background(.white.opacity(0.06), in: .circle)
                                .overlay { Circle().strokeBorder(Paleta.creta.opacity(0.16), lineWidth: 1) }
                            Text(sport.eticheta)
                                .font(.caption.weight(.medium))
                                .foregroundStyle(Paleta.creta.opacity(0.75))
                        }
                    }
                    .buttonStyle(ApasarePremium())
                }
            }
            .padding(.horizontal, 22)
        }
        .padding(.horizontal, -22)
        .scrollClipDisabled()
    }

    // MARK: - Sub bloc

    private var sectiuneRecomandate: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .lastTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Terenuri noi")
                        .font(.system(size: 24, weight: .bold))
                        .tracking(-0.6)
                    Text("Adăugate recent pe Scorer")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button { cauta(CerereCautare()) } label: {
                    HStack(spacing: 3) {
                        Text("Vezi toate")
                        Image(systemName: "chevron.right").font(.caption.weight(.bold))
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Tema.accent)
                }
            }
            .padding(.horizontal, 20)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 14) {
                    ForEach(terenuri.prefix(8)) { teren in
                        NavigationLink(value: teren.id) { CardTerenMare(teren: teren) }
                            .buttonStyle(ApasarePremium())
                            .scrollTransition(.interactive, axis: .horizontal) { continut, faza in
                                continut
                                    .scaleEffect(faza.isIdentity ? 1 : 0.93)
                                    .opacity(faza.isIdentity ? 1 : 0.75)
                            }
                    }
                }
                .scrollTargetLayout()
            }
            .contentMargins(.horizontal, 20, for: .scrollContent)
            .scrollTargetBehavior(.viewAligned)
            .scrollClipDisabled()
        }
    }

    private var sectiunePasi: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Cum funcționează")
                .font(.system(size: 24, weight: .bold))
                .tracking(-0.6)

            VStack(spacing: 0) {
                pas(1, "Caută un teren", "Filtrează după sport, dimensiune, oraș, zi și oră.")
                Divider().padding(.leading, 62)
                pas(2, "Alege orele", "Apeși pe orele libere și vezi prețul pe loc.")
                Divider().padding(.leading, 62)
                pas(3, "Trimite cererea", "Plătești cu Apple Pay sau la teren și primești confirmarea.")
            }
            .background(Tema.fisa, in: .rect(cornerRadius: 22, style: .continuous))
            .shadow(color: .black.opacity(0.04), radius: 1, y: 1)
            .shadow(color: .black.opacity(0.06), radius: 16, y: 8)
        }
        .padding(.horizontal, 20)
    }

    private func pas(_ numar: Int, _ titlu: String, _ detaliu: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 16) {
            Text("\(numar)")
                .font(.system(size: 34, weight: .regular, design: .serif).italic())
                .foregroundStyle(Tema.accent)
                .frame(width: 30)
            VStack(alignment: .leading, spacing: 3) {
                Text(titlu).font(.body.weight(.semibold))
                Text(detaliu).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
    }

    private var cardProprietari: some View {
        Button { arataAutentificarea = true } label: {
            VStack(alignment: .leading, spacing: 14) {
                Text("Ai un teren?")
                    .font(.system(size: 28, weight: .regular, design: .serif).italic())
                    .foregroundStyle(Paleta.creta)
                Text("Primește rezervări online, cu calendar și confirmare automată.")
                    .font(.subheadline)
                    .foregroundStyle(Paleta.creta.opacity(0.65))
                    .multilineTextAlignment(.leading)
                HStack(spacing: 6) {
                    Text("Adaugă-l gratuit")
                    Image(systemName: "arrow.right")
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Paleta.verdeJos)
                .padding(.horizontal, 18)
                .padding(.vertical, 11)
                .background(Paleta.creta, in: .capsule)
                .padding(.top, 4)
            }
            .padding(22)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background { FundalStadion(animat: false) }
            .clipShape(.rect(cornerRadius: 26, style: .continuous))
            .shadow(color: .black.opacity(0.10), radius: 2, y: 1)
            .shadow(color: Paleta.verdeJos.opacity(0.3), radius: 22, y: 14)
        }
        .buttonStyle(ApasarePremium())
        .padding(.horizontal, 20)
    }

    private func incarca() async {
        if let toate = try? await ApiClient.shared.cere("terenuri", ca: [Teren].self) {
            withAnimation(.smooth) { terenuri = toate }
        }
    }
}

// MARK: - Piese

/// Card mare cu poza pe tot, textul pe un voal întunecat, ca într-o revistă.
private struct CardTerenMare: View {
    let teren: Teren

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            PozaTeren(cale: teren.poze.first, sport: teren.sport)
                .frame(width: 272, height: 340)
                .clipped()

            LinearGradient(
                colors: [.clear, .black.opacity(0.15), .black.opacity(0.78)],
                startPoint: .center, endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: 4) {
                Text(teren.nume)
                    .font(.system(size: 20, weight: .semibold))
                    .tracking(-0.4)
                    .lineLimit(1)
                Text(teren.oras)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.75))
                HStack(spacing: 4) {
                    Text("\(Int(teren.pretPeOra)) RON").font(.subheadline.weight(.semibold))
                    Text("/ oră").font(.subheadline).foregroundStyle(.white.opacity(0.7))
                }
                .padding(.top, 4)
            }
            .foregroundStyle(.white)
            .padding(18)
        }
        .frame(width: 272, height: 340)
        .overlay(alignment: .topLeading) {
            HStack(spacing: 6) {
                Label(teren.sport.eticheta, systemImage: teren.sport.simbol)
                let formate = teren.sport.formateAlese(teren.formate)
                if !formate.isEmpty {
                    Text(formate.map(\.cod).joined(separator: " · ")).monospacedDigit()
                }
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 11)
            .padding(.vertical, 7)
            .background(.ultraThinMaterial, in: .capsule)
            .environment(\.colorScheme, .dark)
            .padding(14)
        }
        .clipShape(.rect(cornerRadius: 26, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .strokeBorder(.white.opacity(0.08), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.08), radius: 1, y: 1)
        .shadow(color: .black.opacity(0.14), radius: 12, y: 8)
        .shadow(color: .black.opacity(0.16), radius: 30, y: 22)
    }
}

/// Fundalul de stadion seara: degrade, două lumini de nocturnă, liniile
/// terenului (care se desenează la intrare), granulație și vignetă.
private struct FundalStadion: View {
    var animat: Bool

    @State private var desenat: CGFloat = 0
    @State private var respira = false

    var body: some View {
        ZStack {
            LinearGradient(colors: [Paleta.verdeSus, Paleta.verdeJos], startPoint: .top, endPoint: .bottom)

            // Luminile de nocturnă, din colțurile de sus.
            lumina.rotationEffect(.degrees(24), anchor: .top).offset(x: -150, y: -40)
            lumina.rotationEffect(.degrees(-24), anchor: .top).offset(x: 150, y: -40)

            LiniiTeren()
                .trim(from: 0, to: animat ? desenat : 1)
                .stroke(Paleta.creta.opacity(0.13), style: StrokeStyle(lineWidth: 1.4, lineCap: .round))
                .frame(width: 640, height: 410)
                .rotation3DEffect(.degrees(56), axis: (x: 1, y: 0, z: 0), perspective: 0.6)
                .rotationEffect(.degrees(-12))
                .offset(x: 150, y: 120)

            Granulatie().blendMode(.overlay)

            // Vignetă doar jos și pe margini, ca sus să se lege curat de bară.
            LinearGradient(colors: [.clear, .black.opacity(0.32)], startPoint: UnitPoint(x: 0.5, y: 0.45), endPoint: .bottom)
        }
        .allowsHitTesting(false)
        .onChange(of: animat, initial: true) { _, acum in
            guard acum else {
                desenat = 0
                return
            }
            withAnimation(.easeInOut(duration: 2.6).delay(0.3)) { desenat = 1 }
            if !respira {
                withAnimation(.easeInOut(duration: 4).repeatForever(autoreverses: true)) { respira = true }
            }
        }
    }

    private var lumina: some View {
        LinearGradient(colors: [Paleta.creta.opacity(0.16), Paleta.creta.opacity(0)], startPoint: .top, endPoint: .bottom)
            .frame(width: 150, height: 640)
            .blur(radius: 34)
            .opacity(respira ? 1 : 0.65)
            .frame(maxHeight: .infinity, alignment: .top)
    }
}

/// Granulație fină de film, aceeași la fiecare desen (generator cu sămânță fixă).
private struct Granulatie: View {
    var body: some View {
        Canvas { context, marime in
            var generator = GeneratorFix(stare: 42)
            let numar = Int(marime.width * marime.height / 70)
            for _ in 0..<numar {
                let x = Double.random(in: 0..<marime.width, using: &generator)
                let y = Double.random(in: 0..<marime.height, using: &generator)
                let alb = Bool.random(using: &generator)
                let opacitate = Double.random(in: 0.04...0.12, using: &generator)
                context.fill(
                    Path(CGRect(x: x, y: y, width: 1, height: 1)),
                    with: .color((alb ? Color.white : Color.black).opacity(opacitate))
                )
            }
        }
    }
}

private struct GeneratorFix: RandomNumberGenerator {
    var stare: UInt64
    mutating func next() -> UInt64 {
        stare = stare &* 6_364_136_223_846_793_005 &+ 1_442_695_040_888_963_407
        return stare
    }
}

/// Punct verde care „respiră”: semn că lista e vie.
private struct PunctViu: View {
    @State private var puls = false

    var body: some View {
        ZStack {
            Circle()
                .fill(Color(red: 0.36, green: 0.85, blue: 0.52))
                .frame(width: 14, height: 14)
                .scaleEffect(puls ? 1.6 : 0.6)
                .opacity(puls ? 0 : 0.5)
            Circle()
                .fill(Color(red: 0.36, green: 0.85, blue: 0.52))
                .frame(width: 7, height: 7)
        }
        .frame(width: 14, height: 14)
        .onAppear {
            withAnimation(.easeOut(duration: 1.8).repeatForever(autoreverses: false)) { puls = true }
        }
    }
}

/// Apăsare care se simte: elementul se strânge puțin și revine cu arc.
private struct ApasarePremium: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.965 : 1)
            .brightness(configuration.isPressed ? -0.02 : 0)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

private extension View {
    /// Intrare la deschidere: urcă puțin și se clarifică, pe rând.
    func intrare(_ aparut: Bool, intarziere: Double) -> some View {
        self
            .opacity(aparut ? 1 : 0)
            .offset(y: aparut ? 0 : 18)
            .blur(radius: aparut ? 0 : 6)
            .animation(.spring(response: 0.75, dampingFraction: 0.86).delay(intarziere), value: aparut)
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
