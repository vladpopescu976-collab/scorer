import SwiftUI

import PassKit

/// Plata în aplicație: Apple Pay sau la teren. DOAR DEMONSTRATIV: nu există
/// încă un procesator de plăți, deci tokenul Apple Pay nu se trimite nicăieri
/// și nimic nu se debitează. În aplicație nu se scriu date de card de mână.
enum MetodaPlata: String, CaseIterable, Identifiable {
    case applePay, teren
    var id: String { rawValue }
    var titlu: String { self == .applePay ? "Plată cu cardul" : "La teren" }
    var detaliu: String { self == .applePay ? "Prin Apple Pay, rezervarea e garantată" : "Numerar sau card, la sosire" }
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

/// Foaia „Cum dorești să rezervi?”: plată cu cardul (Apple Pay) sau la teren.
/// Alegerea trăiește doar cât e deschisă foaia.
struct FoaieMetodaPlata: View {
    let suma: Double
    let rezumat: String
    let laApplePay: () -> Void
    let laTeren: () -> Void

    @State private var metoda: MetodaPlata?

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Cum dorești să rezervi?")
                    .font(.title3.weight(.bold))
                Text(rezumat)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            HStack {
                Text("Total de plată")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(Int(suma)) RON")
                    .font(.title2.weight(.bold))
                    .monospacedDigit()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Tema.accent.opacity(0.08), in: .rect(cornerRadius: 16, style: .continuous))

            VStack(spacing: 10) {
                ForEach(MetodaPlata.allCases) { optiune in
                    rand(optiune)
                }
                randInCurand
            }

            Spacer(minLength: 0)

            if metoda == .applePay {
                // Butonul oficial Apple Pay, cum îl recunoaște oricine.
                PayWithApplePayButton(.book) { laApplePay() }
                    .payWithApplePayButtonStyle(.black)
                    .frame(height: 52)
                    .clipShape(.rect(cornerRadius: 14, style: .continuous))
                    .transition(.opacity)
            } else {
                ButonPrincipal(
                    titlu: metoda == .teren ? "Trimite cererea" : "Alege o variantă",
                    simbol: metoda == .teren ? "paperplane.fill" : nil,
                    activ: metoda != nil,
                    actiune: { if metoda == .teren { laTeren() } }
                )
                .transition(.opacity)
            }
        }
        .padding(Tema.spatiu)
        .padding(.top, 14)
        .animation(.snappy, value: metoda)
        .presentationDetents([.height(530)])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
        .presentationBackground(Tema.fundal)
    }

    /// Împărțirea plății între prieteni: se vede, dar nu se poate alege încă.
    private var randInCurand: some View {
        HStack(spacing: 14) {
            Image(systemName: "person.3.fill")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.secondary)
                .frame(width: 54, height: 38)
                .background(Color.primary.opacity(0.06), in: .rect(cornerRadius: 9, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text("Split the bill").font(.body.weight(.semibold)).foregroundStyle(.secondary)
                Text("ÎN CURÂND")
                    .font(.caption2.weight(.bold))
                    .tracking(1.2)
                    .foregroundStyle(Tema.accent)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(Tema.fisa.opacity(0.6), in: .rect(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [5, 4]))
                .foregroundStyle(Color.primary.opacity(0.15))
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Split the bill, în curând")
    }

    private func rand(_ optiune: MetodaPlata) -> some View {
        let ales = metoda == optiune
        return Button { metoda = optiune } label: {
            HStack(spacing: 14) {
                Group {
                    if optiune == .applePay {
                        HStack(spacing: 1) {
                            Image(systemName: "apple.logo").font(.system(size: 13, weight: .semibold))
                            Text("Pay").font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .frame(width: 54, height: 38)
                        .background(.black, in: .rect(cornerRadius: 9, style: .continuous))
                    } else {
                        Image(systemName: optiune.simbol)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 54, height: 38)
                            .background(Tema.gradientAccent, in: .rect(cornerRadius: 9, style: .continuous))
                    }
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(optiune.titlu).font(.body.weight(.semibold))
                    Text(optiune.detaliu).font(.footnote).foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)

                ZStack {
                    Circle().strokeBorder(ales ? Tema.accent : Color.secondary.opacity(0.35), lineWidth: 2)
                    if ales { Circle().fill(Tema.accent).padding(5) }
                }
                .frame(width: 22, height: 22)
            }
            .padding(14)
            .background(ales ? Tema.accent.opacity(0.07) : Tema.fisa, in: .rect(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .strokeBorder(ales ? Tema.accent : Color.primary.opacity(0.08), lineWidth: ales ? 1.5 : 1)
            }
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(ales ? .isSelected : [])
    }
}
