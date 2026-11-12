import SwiftUI
import UIKit

/// Poza de profil, rotundă. Fără poză: inițialele pe verdele aplicației.
struct AvatarUtilizator: View {
    let utilizator: Utilizator?
    var marime: CGFloat = 38

    var body: some View {
        ZStack {
            if let utilizator {
                Circle().fill(Tema.gradientAccent)
                Text(Self.initiale(utilizator.nume))
                    .font(.system(size: marime * 0.36, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                if let cale = utilizator.poza, let url = Config.urlPoza(cale) {
                    AsyncImage(url: url, transaction: Transaction(animation: .easeOut(duration: 0.25))) { faza in
                        if case .success(let imagine) = faza {
                            imagine.resizable().scaledToFill().transition(.opacity)
                        }
                    }
                }
            } else {
                Circle().fill(Tema.fisa)
                Image(systemName: "person.crop.circle")
                    .font(.system(size: marime * 0.52))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: marime, height: marime)
        .clipShape(.circle)
        .accessibilityLabel(utilizator.map { "Contul lui \($0.nume)" } ?? "Cont")
    }

    static func initiale(_ nume: String) -> String {
        let litere = nume.split(separator: " ").prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
            .uppercased()
        return litere.isEmpty ? "?" : litere
    }
}

enum PozaProfil {
    /// Taie poza la pătrat, din mijloc, și o micșorează: o poză de profil nu
    /// are nevoie de 12 megapixeli, iar încărcarea se face pe date mobile.
    static func pregateste(_ date: Data, latura: CGFloat = 640) -> Data? {
        guard let imagine = UIImage(data: date) else { return nil }
        let minim = min(imagine.size.width, imagine.size.height)
        guard minim > 0 else { return nil }
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let desen = UIGraphicsImageRenderer(size: CGSize(width: latura, height: latura), format: format)
        let rezultat = desen.image { _ in
            let scara = latura / minim
            let w = imagine.size.width * scara, h = imagine.size.height * scara
            imagine.draw(in: CGRect(x: (latura - w) / 2, y: (latura - h) / 2, width: w, height: h))
        }
        return rezultat.jpegData(compressionQuality: 0.85)
    }
}
