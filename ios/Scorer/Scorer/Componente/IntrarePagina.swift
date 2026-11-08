import SwiftUI

/// Felul în care intră o pagină: fiecare tab are mișcarea lui, ca trecerea
/// dintre ele să se simtă, nu doar să se schimbe ecranul.
enum StilIntrare {
    /// Urcă ușor de jos.
    case ridicare
    /// Vine din adânc: pornește puțin mai mică.
    case apropiere
    /// Alunecă dinspre dreapta.
    case glisare
    /// Se clarifică dintr-o ceață.
    case clarificare
}

/// Intrarea unei pagini, reluată la fiecare apariție. Se leagă de apariție și
/// dispariție (nu de tabul ales), fiindcă un tab ascuns nu primește
/// actualizări și starea lui ar rămâne „deja intrată”.
private struct IntrarePagina: ViewModifier {
    let stil: StilIntrare

    @Environment(\.accessibilityReduceMotion) private var faraMiscare
    @State private var vizibil = false

    func body(content: Content) -> some View {
        let ascuns = !vizibil && !faraMiscare
        content
            .opacity(vizibil || faraMiscare ? 1 : 0)
            .offset(x: ascuns && stil == .glisare ? 34 : 0,
                    y: ascuns && stil == .ridicare ? 26 : 0)
            .scaleEffect(ascuns && stil == .apropiere ? 0.94 : 1)
            .blur(radius: ascuns && stil == .clarificare ? 12 : 0)
            .onAppear {
                withAnimation(.spring(response: 0.62, dampingFraction: 0.86)) { vizibil = true }
            }
            .onDisappear { vizibil = false }
    }
}

/// Un element dintr-o listă care intră la rând după cele de deasupra.
private struct IntrareElement: ViewModifier {
    let index: Int

    @Environment(\.accessibilityReduceMotion) private var faraMiscare
    @State private var aparut = false

    func body(content: Content) -> some View {
        content
            .opacity(aparut || faraMiscare ? 1 : 0)
            .offset(y: aparut || faraMiscare ? 0 : 30)
            .scaleEffect(aparut || faraMiscare ? 1 : 0.96, anchor: .top)
            .onAppear {
                let intarziere = 0.1 + Double(min(index, 6)) * 0.07
                withAnimation(.spring(response: 0.7, dampingFraction: 0.84).delay(intarziere)) { aparut = true }
            }
            .onDisappear { aparut = false }
    }
}

extension View {
    /// Intrarea unei pagini întregi, reluată de fiecare dată când pagina apare.
    func intrarePagina(_ stil: StilIntrare) -> some View {
        modifier(IntrarePagina(stil: stil))
    }

    /// Intrarea pe rând a unui element dintr-o listă (cardul cu numărul `index`).
    func intrareElement(_ index: Int) -> some View {
        modifier(IntrareElement(index: index))
    }
}
