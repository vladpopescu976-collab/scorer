import SwiftUI

import PassKit

/// Plata în aplicație: Apple Pay sau la teren. DOAR DEMONSTRATIV: nu există
/// încă un procesator de plăți, deci tokenul Apple Pay nu se trimite nicăieri
/// și nimic nu se debitează. În aplicație nu se scriu date de card de mână.
enum MetodaPlata: String, CaseIterable, Identifiable {
    case applePay, teren
    var id: String { rawValue }
    var titlu: String { self == .applePay ? "Apple Pay" : "La teren" }
    var detaliu: String { self == .applePay ? "Plătești acum, rezervarea e garantată" : "Numerar sau card, la sosire" }
    var simbol: String { self == .applePay ? "apple.logo" : "banknote.fill" }
}

/// Foaia Apple Pay a sistemului. La autorizare răspunde „succes” fără să
/// trimită tokenul nicăieri — e o demonstrație.
@MainActor
final class ApplePay: NSObject, PKPaymentAuthorizationControllerDelegate {
    static let identificatorComerciant = "merchant.ro.scorer.app"

    private var laFinal: ((Bool) -> Void)?
    private var platit = false

    func plateste(suma: Double, descriere: String, laFinal: @escaping (Bool) -> Void) {
        let cerere = PKPaymentRequest()
        cerere.merchantIdentifier = Self.identificatorComerciant
        cerere.supportedNetworks = [.visa, .masterCard, .maestro, .amex]
        cerere.merchantCapabilities = .threeDSecure
        cerere.countryCode = "RO"
        cerere.currencyCode = "RON"
        let total = NSDecimalNumber(value: suma)
        cerere.paymentSummaryItems = [
            PKPaymentSummaryItem(label: descriere, amount: total),
            PKPaymentSummaryItem(label: "Scorer", amount: total),
        ]

        self.laFinal = laFinal
        platit = false
        let controler = PKPaymentAuthorizationController(paymentRequest: cerere)
        controler.delegate = self
        controler.present { prezentat in
            if !prezentat {
                Task { @MainActor in
                    self.laFinal?(false)
                    self.laFinal = nil
                }
            }
        }
    }

    nonisolated func paymentAuthorizationController(
        _ controller: PKPaymentAuthorizationController,
        didAuthorizePayment payment: PKPayment,
        handler completion: @escaping (PKPaymentAuthorizationResult) -> Void
    ) {
        // Demonstrativ: fără procesator, tokenul rămâne pe telefon și se aruncă.
        Task { @MainActor in self.platit = true }
        completion(PKPaymentAuthorizationResult(status: .success, errors: nil))
    }

    nonisolated func paymentAuthorizationControllerDidFinish(_ controller: PKPaymentAuthorizationController) {
        controller.dismiss {
            Task { @MainActor in
                self.laFinal?(self.platit)
                self.laFinal = nil
            }
        }
    }
}

struct AlegeMetodaPlata: View {
    @Binding var metoda: MetodaPlata?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Cum dorești să rezervi?").font(.subheadline.weight(.medium))
            HStack(spacing: 10) {
                ForEach(MetodaPlata.allCases) { optiune in
                    let ales = metoda == optiune
                    Button { withAnimation(.snappy) { metoda = optiune } } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Image(systemName: optiune.simbol)
                                .font(.system(size: 18))
                                .foregroundStyle(ales ? Tema.accent : .secondary)
                            Text(optiune.titlu).font(.subheadline.weight(.semibold))
                            Text(optiune.detaliu).font(.caption).foregroundStyle(.secondary)
                                .multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                        .background(ales ? Tema.accent.opacity(0.08) : Tema.fisa, in: .rect(cornerRadius: 16, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .strokeBorder(ales ? Tema.accent : Color.primary.opacity(0.1), lineWidth: ales ? 1.5 : 1)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .fisa()
    }
}
