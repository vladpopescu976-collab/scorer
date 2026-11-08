import SwiftUI

/// Poza de copertă a unui teren, cu simbolul sportului când lipsește sau nu se încarcă.
struct PozaTeren: View {
    let cale: String?
    let sport: Sport
    /// Arată toată poza, nedecupată; spațiul rămas se umple cu aceeași poză,
    /// estompată, ca să nu apară benzi goale.
    var intreaga = false

    var body: some View {
        ZStack {
            Tema.gradientLoc

            if let cale, let url = Config.urlPoza(cale) {
                AsyncImage(url: url) { faza in
                    switch faza {
                    case .success(let imagine):
                        if intreaga {
                            // Poza întreagă dictează doar ce se vede; fundalul
                            // estompat stă în spate și nu schimbă mărimea cardului.
                            imagine.resizable().scaledToFit()
                                .shadow(color: .black.opacity(0.25), radius: 10, y: 4)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .background {
                                    imagine.resizable().scaledToFill()
                                        .blur(radius: 26)
                                        .overlay(Color.black.opacity(0.18))
                                }
                                .clipped()
                        } else {
                            imagine.resizable().scaledToFill()
                        }
                    case .failure:
                        simbol
                    default:
                        ProgressView()
                    }
                }
            } else {
                simbol
            }
        }
        .clipped()
    }

    private var simbol: some View {
        Image(systemName: sport.simbol)
            .font(.system(size: 32))
            .foregroundStyle(Tema.accent.opacity(0.42))
    }
}

struct Stelute: View {
    let nota: Double
    var marime: CGFloat = 12

    var body: some View {
        HStack(spacing: 1) {
            ForEach(1...5, id: \.self) { i in
                Image(systemName: Double(i) <= nota.rounded() ? "star.fill" : "star")
                    .font(.system(size: marime))
                    .foregroundStyle(Double(i) <= nota.rounded() ? .yellow : .secondary.opacity(0.4))
            }
        }
    }
}





