import SwiftUI

/// Butonul de acțiune care stă centrat, lipit deasupra barei de taburi, ca o
/// continuare a ei. Bara se desenează peste conținut, deci butonul nu poate intra sub ea fără să fie tăiat.
struct ButonPlutitor: View {
    let titlu: String
    let simbol: String
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            HStack(spacing: 8) {
                Image(systemName: simbol)
                    .font(.system(size: 14, weight: .bold))
                    .frame(width: 28, height: 28)
                    .background(.white.opacity(0.22), in: .circle)
                Text(titlu)
                    .font(.subheadline.weight(.semibold))
            }
            .padding(.leading, 8)
            .padding(.trailing, 18)
            .frame(height: 46)
            .foregroundStyle(.white)
            .background(Tema.gradientAccent, in: .capsule)
            .overlay {
                Capsule().strokeBorder(.white.opacity(0.35), lineWidth: 1)
            }
            .shadow(color: Tema.accent.opacity(0.4), radius: 14, y: 8)
            .shadow(color: .black.opacity(0.08), radius: 2, y: 1)
        }
        .apasabil()
        .accessibilityLabel(titlu)
    }
}

extension View {
    /// Pune butonul deasupra barei de taburi. Spațiul lui se adaugă la zona
    /// sigură de jos, ca ultimul rând din listă să nu rămână ascuns sub el.
    func butonPlutitor(_ titlu: String, simbol: String, actiune: @escaping () -> Void) -> some View {
        safeAreaInset(edge: .bottom, spacing: 0) {
            ButonPlutitor(titlu: titlu, simbol: simbol, actiune: actiune)
                .padding(.bottom, 10)
                .frame(maxWidth: .infinity)
        }
    }
}
