import SwiftUI

/// Un singur loc pentru culori, spațieri și forme, ca ecranele să arate ca o
/// familie, nu ca niște pagini făcute separat.
enum Tema {
    // MARK: Culori

    /// Verdele brandului, la fel ca pe site (#0E6B3A). În modul întunecat e mai
    /// luminos, ca textul verde să se citească pe fundal negru.
    static let accent = Color(UIColor { trasaturi in
        trasaturi.userInterfaceStyle == .dark
            ? UIColor(red: 0.30, green: 0.72, blue: 0.45, alpha: 1)
            : UIColor(red: 0.055, green: 0.42, blue: 0.227, alpha: 1)
    })
    /// Verdele-lime de pe fundalurile închise (#7BD389), ca pe site.
    static let accentDeschis = Color(red: 0.48, green: 0.83, blue: 0.54)
    /// Cremul textului de pe fundalurile verzi (#F3EFE6), ca pe site.
    static let creta = Color(red: 0.953, green: 0.937, blue: 0.902)

    /// Fundalul general — puțin mai cald decât albul pur, ca fișele să iasă în față.
    static let fundal = Color(.systemGroupedBackground)
    static let fisa = Color(.secondarySystemGroupedBackground)

    static let ocupat = Color(red: 0.85, green: 0.30, blue: 0.29)
    static let asteptare = Color(red: 0.93, green: 0.62, blue: 0.14)

    // Calendarul proprietarului: culoarea unui interval spune de unde vine ora
    // ocupată, nu în ce stare e. Aceleași trei culori ca pe site.
    static let intervalSite = accent
    static let intervalTelefon = Color(red: 0.23, green: 0.51, blue: 0.96)
    static let intervalPrivat = Color(red: 0.55, green: 0.36, blue: 0.96)

    static let gradientAccent = LinearGradient(
        colors: [accent, accentDeschis],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    /// Folosit acolo unde nu există poză, ca locul să nu arate gol.
    static let gradientLoc = LinearGradient(
        colors: [accent.opacity(0.22), accentDeschis.opacity(0.10)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // MARK: Forme și spațiere

    static let razaFisa: CGFloat = 18
    static let razaMica: CGFloat = 12
    static let spatiu: CGFloat = 16
}

// MARK: - Fișă

/// Suprafața standard pe care stă conținutul.
struct Fisa: ViewModifier {
    var padding: CGFloat = Tema.spatiu

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Tema.fisa, in: .rect(cornerRadius: Tema.razaFisa, style: .continuous))
            .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}

extension View {
    func fisa(padding: CGFloat = Tema.spatiu) -> some View {
        modifier(Fisa(padding: padding))
    }

    /// Micșorare scurtă la apăsare — dă senzația că butonul „răspunde”.
    func apasabil() -> some View {
        buttonStyle(ApasabilStyle())
    }
}

struct ApasabilStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

// MARK: - Butonul principal

struct ButonPrincipal: View {
    let titlu: String
    var simbol: String?
    var seIncarca = false
    var activ = true
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            HStack(spacing: 8) {
                if seIncarca {
                    ProgressView().tint(.white)
                } else if let simbol {
                    Image(systemName: simbol)
                }
                Text(titlu).fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background {
                if activ && !seIncarca {
                    Tema.gradientAccent
                } else {
                    Color.gray.opacity(0.35)
                }
            }
            .foregroundStyle(.white)
            .clipShape(.rect(cornerRadius: 14, style: .continuous))
            .shadow(
                color: activ && !seIncarca ? Tema.accent.opacity(0.28) : .clear,
                radius: 12, x: 0, y: 6
            )
        }
        .disabled(!activ || seIncarca)
        .apasabil()
    }
}

// MARK: - Eticheta de status

struct Pastila: View {
    let text: String
    var culoare: Color = Tema.accent
    var simbol: String?

    var body: some View {
        HStack(spacing: 4) {
            if let simbol { Image(systemName: simbol).font(.system(size: 10, weight: .semibold)) }
            Text(text).font(.caption2.weight(.semibold))
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(culoare.opacity(0.14), in: .capsule)
        .foregroundStyle(culoare)
    }
}

extension StatusRezervare {
    var culoare: Color {
        switch self {
        case .confirmata: Tema.accent
        case .inAsteptare: Tema.asteptare
        case .respinsa: Tema.ocupat
        case .mutarePropusa: .blue
        case .anulata: .secondary
        case .expirata: .secondary
        case .necunoscut: .secondary
        }
    }

    var simbol: String {
        switch self {
        case .confirmata: "checkmark.circle.fill"
        case .inAsteptare: "clock.fill"
        case .respinsa: "xmark.circle.fill"
        case .mutarePropusa: "arrow.triangle.2.circlepath"
        case .anulata: "slash.circle.fill"
        case .expirata: "clock.badge.xmark"
        case .necunoscut: "questionmark.circle"
        }
    }
}

// MARK: - Stări

/// Ce se vede cât timp se încarcă o listă — mai bun decât o rotiță pe ecran gol.
struct ScheletFisa: View {
    var inaltime: CGFloat = 120

    @State private var animeaza = false

    var body: some View {
        RoundedRectangle(cornerRadius: Tema.razaFisa, style: .continuous)
            .fill(Color.secondary.opacity(animeaza ? 0.10 : 0.18))
            .frame(height: inaltime)
            .animation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true), value: animeaza)
            .onAppear { animeaza = true }
    }
}

struct StareGoala: View {
    let simbol: String
    let titlu: String
    let detaliu: String
    var titluActiune: String?
    var actiune: (() -> Void)?

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: simbol)
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 64, height: 64)
                .background(Tema.gradientAccent, in: .rect(cornerRadius: 18, style: .continuous))
                .shadow(color: Tema.accent.opacity(0.45), radius: 14, y: 8)
                .padding(.bottom, 6)

            Text(titlu).font(.title3.weight(.semibold))
            Text(detaliu)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            if let titluActiune, let actiune {
                Button(action: actiune) {
                    Text(titluActiune)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 22)
                        .frame(height: 44)
                        .background(Tema.accent, in: .capsule)
                }
                .buttonStyle(.plain)
                .padding(.top, 10)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .padding(.horizontal, 24)
        .background {
            RadialGradient(colors: [Tema.accent.opacity(0.10), .clear], center: .top, startRadius: 0, endRadius: 260)
        }
    }
}

// MARK: - Formatări

extension TimeZone {
    /// Ora terenurilor. `NSTimeZone.default` schimbă calendarul, dar nu și
    /// formatările de dată, care citesc fusul sistemului — de aceea îl dăm explicit.
    static let aplicatie = TimeZone(identifier: "Europe/Bucharest")!
}

extension Date.FormatStyle {
    /// Aceeași formatare, în ora României.
    var inRomania: Date.FormatStyle {
        var stil = self
        stil.timeZone = .aplicatie
        return stil
    }
}

extension Locale {
    /// Aplicația e în română, indiferent de limba telefonului. Fără asta,
    /// zilele apar în engleză pe un telefon setat pe altă limbă.
    static let aplicatie = Locale(identifier: "ro_RO")
}

extension Date {
    var ziScurta: String {
        formatted(.dateTime.day().month(.abbreviated).locale(.aplicatie).inRomania)
    }
    var ziLunga: String {
        formatted(.dateTime.weekday(.wide).day().month(.wide).locale(.aplicatie).inRomania)
    }
    var oraScurta: String {
        formatted(.dateTime.hour().minute().locale(.aplicatie).inRomania)
    }
    var zileiPrescurtat: String {
        formatted(.dateTime.weekday(.abbreviated).locale(.aplicatie).inRomania)
    }
    var numarZi: String {
        formatted(.dateTime.day().locale(.aplicatie).inRomania)
    }
}

enum ZiApi {
    /// „2026-08-20” în ora României (fusul aplicației) — exact ziua pe care o vede utilizatorul.
    static func text(_ data: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: data)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }
}


/// Pastilă simplă de filtru, cu stare activă.
struct PastilaFiltru: View {
    let text: String
    let activ: Bool
    /// Pe banda verde: activa e cremă cu text verde, restul sticlă transparentă.
    var peVerde = false
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            Text(text)
                .font(.footnote.weight(.medium))
                .padding(.horizontal, 12).padding(.vertical, 7)
                .background(fundal, in: .capsule)
                .overlay { if peVerde && !activ { Capsule().strokeBorder(.white.opacity(0.14)) } }
                .foregroundStyle(culoareText)
        }
        .apasabil()
    }

    private var fundal: Color {
        if peVerde { return activ ? Tema.creta : .white.opacity(0.08) }
        return activ ? Tema.accent : Tema.fisa
    }

    private var culoareText: Color {
        if peVerde { return activ ? Color(red: 0.043, green: 0.165, blue: 0.11) : Tema.creta.opacity(0.75) }
        return activ ? .white : .secondary
    }
}


// MARK: - Antetul ecranelor

/// Fundalul verde al antetelor: pe toată lățimea, urcă sub bara de sus și se
/// termină cu margini rotunjite, ca banda de pe site și hero-ul de pe Acasă.
struct FundalVerde: View {
    var body: some View {
        ZStack(alignment: .topTrailing) {
            RadialGradient(
                colors: [Color(red: 0.09, green: 0.33, blue: 0.23), Color(red: 0.043, green: 0.165, blue: 0.11), Color(red: 0.027, green: 0.086, blue: 0.06)],
                center: .topLeading, startRadius: 0, endRadius: 520
            )
            Circle().fill(Tema.accentDeschis.opacity(0.10)).frame(width: 240).blur(radius: 50).offset(x: 70, y: 40)
        }
        .clipShape(UnevenRoundedRectangle(bottomLeadingRadius: 30, bottomTrailingRadius: 30, style: .continuous))
        .shadow(color: .black.opacity(0.22), radius: 18, y: 8)
        // Urcă sub bara de sus și sub ceas, ca să nu rămână o fâșie albă.
        .padding(.top, -400)
    }
}

/// Antetul verde al ecranelor: etichetă mică, titlu mare cu accent în serif
/// italic (semnătura Scorer). Se pune cu `.safeAreaInset(edge: .top)`, deci
/// stă fix sus, iar conținutul se derulează pe dedesubt.
struct AntetEcran<Extra: View>: View {
    let eticheta: String
    let titlu: String
    var accent: String?
    @ViewBuilder var extra: () -> Extra

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                Text(eticheta)
                    .font(.footnote.weight(.medium))
                    .opacity(0.6)
                (Text(titlu).font(.system(size: 30, weight: .semibold))
                 + Text(accent.map { " " + $0 } ?? "").font(.system(size: 28, weight: .regular, design: .serif).italic()).foregroundStyle(Color(red: 0.95, green: 0.94, blue: 0.90).opacity(0.6)))
                    .tracking(-0.6)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
            }
            .padding(.horizontal, 20)
            extra()
        }
        .foregroundStyle(Color(red: 0.95, green: 0.94, blue: 0.90))
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 2)
        .padding(.bottom, 22)
        .background { FundalVerde() }
    }
}

extension AntetEcran where Extra == EmptyView {
    init(eticheta: String, titlu: String, accent: String? = nil) {
        self.init(eticheta: eticheta, titlu: titlu, accent: accent) { EmptyView() }
    }
}

extension View {
    /// Antetul verde fix sus, cu bara de navigare transparentă și ceasul alb.
    func antetVerde(_ eticheta: String, titlu: String, accent: String? = nil) -> some View {
        self.safeAreaInset(edge: .top, spacing: 12) { AntetEcran(eticheta: eticheta, titlu: titlu, accent: accent) }
            .faraTitluSus()
    }

    /// Pe ecranele cu antet verde, bara de sus e transparentă, fără titlu (îl
    /// are antetul), iar ceasul și butoanele sunt albe, ca să se citească.
    func faraTitluSus() -> some View {
        self.toolbar { ToolbarItem(placement: .principal) { Color.clear.frame(width: 1, height: 1) } }
            .toolbarBackgroundVisibility(.hidden, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .modifier(FaraUmbraSus())
    }
}

/// Fără umbra pe care iOS 26 o pune sub bara de sus când derulezi.
private struct FaraUmbraSus: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26, *) {
            content.scrollEdgeEffectHidden(true, for: .top)
        } else {
            content
        }
    }
}

/// Element de bară fără bula de sticlă pe care iOS 26 o pune implicit.
struct ElementSimplu<Continut: View>: ToolbarContent {
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
