import SwiftUI

/// Numărul de contact, pregătit pentru afișare și pentru apel.
///
/// Aceleași reguli ca pe web (`src/lib/telefon.ts`): linkul se construiește
/// mereu în format internațional, fiindcă un `tel:` cu spații sau cu prefix
/// local nu se comportă la fel peste tot, iar afișarea se derivă din aceeași
/// valoare, ca „0040…”, „+40 722…” și „0722123456” să arate la fel.
enum Telefon {
    /// Prefixul țării în care sunt terenurile.
    private static let prefixTara = "40"
    /// Câte cifre are un număr național, fără zeroul din față.
    private static let cifreNationale = 9

    private static func doarCifre(_ valoare: String) -> String {
        valoare.filter(\.isNumber)
    }

    /// Numărul în format internațional, pentru `tel:`. Nil dacă valoarea nu
    /// seamănă a număr de telefon.
    static func pentruApel(_ valoare: String?) -> String? {
        guard let valoare else { return nil }
        let curat = valoare.trimmingCharacters(in: .whitespaces)
        let scrisInternational = curat.hasPrefix("+") || doarCifre(curat).hasPrefix("00")

        var cifre = doarCifre(curat)
        if cifre.hasPrefix("00") { cifre = String(cifre.dropFirst(2)) }

        if scrisInternational {
            return cifre.count >= 8 ? "+" + cifre : nil
        }
        if cifre.hasPrefix("0"), cifre.count == cifreNationale + 1 {
            return "+" + prefixTara + cifre.dropFirst()
        }
        // Verificăm explicit că nu începe cu 0, altfel un număr incomplet ar
        // primi prefixul peste zero.
        if !cifre.hasPrefix("0"), cifre.count == cifreNationale {
            return "+" + prefixTara + cifre
        }
        return cifre.count >= 7 ? cifre : nil
    }

    /// Numărul așa cum e citit cel mai ușor: „0722 123 456”. Dacă nu e un
    /// număr național, rămâne exact cum l-a scris proprietarul.
    static func afisat(_ valoare: String?) -> String? {
        guard let valoare else { return nil }
        let curat = valoare.trimmingCharacters(in: .whitespaces)
        guard !curat.isEmpty else { return nil }

        guard let international = pentruApel(curat),
              international.hasPrefix("+" + prefixTara)
        else { return curat }

        let national = String(international.dropFirst(prefixTara.count + 1))
        guard national.count == cifreNationale else { return curat }

        let cifre = Array(national)
        return "0\(String(cifre[0..<3])) \(String(cifre[3..<6])) \(String(cifre[6...]))"
    }
}

/// Numărul ca buton de apel. O apăsare deschide apelul; dacă valoarea nu e un
/// număr, rămâne text simplu — un `tel:` gol ar fi doar un rând mort.
struct TelefonApelabil: View {
    let telefon: String?
    var marime: Font = .subheadline

    var body: some View {
        if let afisat = Telefon.afisat(telefon) {
            if let deApelat = Telefon.pentruApel(telefon),
               let adresa = URL(string: "tel:\(deApelat)") {
                Link(destination: adresa) {
                    Label(afisat, systemImage: "phone.fill")
                        .font(marime)
                        .foregroundStyle(Tema.accent)
                }
                .accessibilityLabel("Sună la \(afisat)")
            } else {
                Label(afisat, systemImage: "phone").font(marime)
            }
        }
    }
}
