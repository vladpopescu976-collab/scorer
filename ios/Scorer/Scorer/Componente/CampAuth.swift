import SwiftUI

/// Fundalul ecranelor de autentificare: pete de culoare ale temei, aceleași ca
/// pe site, în spatele conținutului.
struct FundalAutentificare: View {
    var body: some View {
        ZStack {
            Tema.fundal
            Circle().fill(Tema.accent.opacity(0.22))
                .frame(width: 320).blur(radius: 70)
                .offset(x: -130, y: -280)
            Circle().fill(Tema.accentDeschis.opacity(0.20))
                .frame(width: 360).blur(radius: 80)
                .offset(x: 150, y: 330)
            Circle().fill(Tema.accent.opacity(0.10))
                .frame(width: 240).blur(radius: 60)
                .offset(x: 60, y: 40)
        }
        .ignoresSafeArea()
    }
}

/// Semnul Scorer: un „S" trasat pe liniile unui teren văzut de sus, la fel ca
/// pe site și ca iconița aplicației. Coordonatele sunt cele din SVG
/// (`public/brand/`), scalate la mărimea cerută.
struct SemnScorer: View {
    var culoare: Color = .white

    var body: some View {
        Canvas { context, marime in
            // Cadrul SVG: 268 192 488 640.
            let scara = min(marime.width / 488, marime.height / 640)
            let dx = (marime.width - 488 * scara) / 2 - 268 * scara
            let dy = (marime.height - 640 * scara) / 2 - 192 * scara
            func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: dx + x * scara, y: dy + y * scara) }
            let linie = 56 * scara

            let teren = Path(roundedRect: CGRect(origin: p(300, 224), size: CGSize(width: 424 * scara, height: 576 * scara)),
                             cornerRadius: 72 * scara, style: .circular)
            context.stroke(teren, with: .color(culoare.opacity(0.22)), lineWidth: linie)

            let cerc = Path(ellipseIn: CGRect(origin: p(408, 408), size: CGSize(width: 208 * scara, height: 208 * scara)))
            context.stroke(cerc, with: .color(culoare.opacity(0.5)), lineWidth: 40 * scara)

            var s = Path()
            s.move(to: p(724, 224))
            s.addLine(to: p(372, 224))
            s.addArc(center: p(372, 296), radius: 72 * scara, startAngle: .degrees(-90), endAngle: .degrees(180), clockwise: true)
            s.addLine(to: p(300, 440))
            s.addArc(center: p(372, 440), radius: 72 * scara, startAngle: .degrees(180), endAngle: .degrees(90), clockwise: true)
            s.addLine(to: p(652, 512))
            s.addArc(center: p(652, 584), radius: 72 * scara, startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
            s.addLine(to: p(724, 728))
            s.addArc(center: p(652, 728), radius: 72 * scara, startAngle: .degrees(0), endAngle: .degrees(90), clockwise: false)
            s.addLine(to: p(300, 800))
            context.stroke(s, with: .color(culoare), style: StrokeStyle(lineWidth: linie, lineCap: .round, lineJoin: .round))
        }
        .accessibilityHidden(true)
    }
}

/// Sigla pe plăcuța verde, la fel ca iconița aplicației.
struct SiglaScorer: View {
    var marime: CGFloat = 56

    var body: some View {
        SemnScorer()
            .frame(width: marime * 0.64, height: marime * 0.64)
            .frame(width: marime, height: marime)
            .background(
                LinearGradient(colors: [Color(red: 0.055, green: 0.42, blue: 0.227), Color(red: 0.184, green: 0.647, blue: 0.376)],
                               startPoint: .topLeading, endPoint: .bottomTrailing),
                in: .rect(cornerRadius: marime * 0.3, style: .continuous)
            )
            .shadow(color: Tema.accent.opacity(0.35), radius: 12, y: 6)
            .overlay {
                RoundedRectangle(cornerRadius: marime * 0.3, style: .continuous)
                    .strokeBorder(.white.opacity(0.7), lineWidth: 3)
                    .padding(-3)
            }
            .accessibilityHidden(true)
    }
}

/// Suprafața de sticlă pe care stau formularele.
struct SticlaAuth: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(20)
            .background(.regularMaterial, in: .rect(cornerRadius: 26, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 26, style: .continuous)
                    .strokeBorder(.white.opacity(0.5), lineWidth: 1)
            }
            .shadow(color: Tema.accent.opacity(0.12), radius: 22, y: 10)
    }
}

extension View {
    func sticlaAuth() -> some View { modifier(SticlaAuth()) }
}

/// Câmp de formular cu iconiță, contur care se aprinde la atingere și, pentru
/// parole, buton „arată parola".
struct CampAuth: View {
    let titlu: String
    let simbol: String
    @Binding var text: String
    var parola = false
    var tipTastatura: UIKeyboardType = .default
    var tipContinut: UITextContentType?
    var faraMajuscule = false
    /// Mesajul de sub câmp, când ceva nu e în regulă — apare cât tastezi.
    var eroare: String?
    /// Textul gri din câmp; implicit titlul.
    var exemplu: String?
    /// Eticheta deasupra câmpului, ca să se știe ce e scris și după completare.
    var cuEticheta = true

    @FocusState private var activ: Bool
    @State private var vizibila = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if cuEticheta {
                Text(titlu)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(eroare != nil ? Tema.ocupat : .primary)
                    .padding(.leading, 4)
            }
            HStack(spacing: 10) {
                Image(systemName: simbol)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(activ ? Tema.accent : .secondary)
                    .frame(width: 20)

                Group {
                    if parola && !vizibila {
                        SecureField(exemplu ?? titlu, text: $text)
                    } else {
                        TextField(exemplu ?? titlu, text: $text)
                            .keyboardType(tipTastatura)
                            .textInputAutocapitalization(faraMajuscule ? .never : .sentences)
                            .autocorrectionDisabled(faraMajuscule || parola)
                    }
                }
                .textContentType(tipContinut)
                .focused($activ)

                if parola {
                    Button {
                        vizibila.toggle()
                    } label: {
                        Image(systemName: vizibila ? "eye.slash" : "eye")
                            .font(.system(size: 15))
                            .foregroundStyle(.secondary)
                            .frame(width: 32, height: 32)
                    }
                    .accessibilityLabel(vizibila ? "Ascunde parola" : "Arată parola")
                }
            }
            .padding(.horizontal, 14)
            .frame(minHeight: 54)
            .background(Tema.fisa, in: .rect(cornerRadius: 14, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(
                        eroare != nil ? Tema.ocupat : (activ ? Tema.accent : Color.primary.opacity(0.08)),
                        lineWidth: activ || eroare != nil ? 1.5 : 1
                    )
            }
            .animation(.easeOut(duration: 0.15), value: activ)

            if let eroare {
                Text(eroare)
                    .font(.footnote)
                    .foregroundStyle(Tema.ocupat)
                    .padding(.leading, 4)
            }
        }
    }
}

/// Cât de bună e parola, cât o scrii. Nu blochează nimic, doar arată — la fel
/// ca indicatorul de pe site.
struct PutereaParolei: View {
    let parola: String

    private var scor: Int {
        guard !parola.isEmpty else { return 0 }
        var puncte = 0
        if parola.count >= 8 { puncte += 1 }
        if parola.count >= 12 { puncte += 1 }
        if parola.contains(where: \.isLowercase) && parola.contains(where: \.isUppercase) { puncte += 1 }
        if parola.contains(where: \.isNumber) { puncte += 1 }
        if parola.contains(where: { !$0.isLetter && !$0.isNumber && !$0.isWhitespace }) { puncte += 1 }
        return min(puncte, 4)
    }

    private static let etichete = ["Foarte slabă", "Slabă", "Acceptabilă", "Bună", "Puternică"]

    private var culoare: Color {
        switch scor {
        case 0, 1: Tema.ocupat
        case 2: Tema.asteptare
        default: Tema.accent
        }
    }

    var body: some View {
        if !parola.isEmpty {
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 4) {
                    ForEach(0..<4, id: \.self) { index in
                        Capsule()
                            .fill(index < scor ? culoare : Color.secondary.opacity(0.2))
                            .frame(height: 6)
                    }
                }
                Text("Parolă \(Self.etichete[scor].lowercased())")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.primary.opacity(0.8))
            }
            .animation(.easeOut(duration: 0.2), value: scor)
            .padding(.horizontal, 4)
        }
    }
}

/// Comutatorul Autentificare / Înregistrare, cu o pastilă care alunecă.
struct ComutatorAuth: View {
    @Binding var inregistrare: Bool
    @Namespace private var pastila

    var body: some View {
        HStack(spacing: 0) {
            optiune("Autentificare", activ: !inregistrare) { inregistrare = false }
            optiune("Înregistrare", activ: inregistrare) { inregistrare = true }
        }
        .padding(4)
        .background(Color.primary.opacity(0.06), in: .rect(cornerRadius: 14, style: .continuous))
    }

    private func optiune(_ text: String, activ: Bool, actiune: @escaping () -> Void) -> some View {
        Button {
            withAnimation(.snappy(duration: 0.28)) { actiune() }
        } label: {
            Text(text)
                .font(.subheadline.weight(activ ? .semibold : .regular))
                .foregroundStyle(activ ? Color.primary : .secondary)
                .frame(maxWidth: .infinity)
                .frame(height: 38)
                .background {
                    if activ {
                        RoundedRectangle(cornerRadius: 11, style: .continuous)
                            .fill(Tema.fisa)
                            .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
                            .matchedGeometryEffect(id: "pastila", in: pastila)
                    }
                }
        }
        .buttonStyle(.plain)
    }
}
