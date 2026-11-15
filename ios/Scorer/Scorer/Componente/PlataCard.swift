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
    /// Split the bill: organizatorul plătește partea lui, primește în câți se împarte.
    var laImpartire: ((Int) -> Void)?
    /// Buton mic „Test”: sare peste Apple Pay și merge mai departe (cu `parti` la split the bill).
    var laTest: ((Int?) -> Void)?
    /// Începutul rezervării: split the bill merge doar cu minim 12 ore înainte.
    var inceput: Date?

    private var oreStrangere: Int? {
        inceput.flatMap { Impartire.oreDeStrans(oreInainte: $0.timeIntervalSinceNow / 3600) }
    }

    @State private var metoda: MetodaPlata?
    @State private var imparte = false
    @State private var parti = 10
    @State private var inaltime: PresentationDetent = .height(530)

    var body: some View {
        Group {
            if imparte { continutImparte } else { continutAlege }
        }
        .padding(Tema.spatiu)
        .padding(.top, 14)
        .animation(.snappy, value: metoda)
        .animation(.snappy, value: imparte)
        .presentationDetents([.height(530), .large], selection: $inaltime)
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
        .presentationBackground(Tema.fundal)
    }

    /// Split the bill: alegi în câți se împarte și îți plătești partea cu Apple Pay.
    private var continutImparte: some View {
        let parteaMea = Impartire.calculeaza(total: suma, parti: parti).parteaMea
        return VStack(alignment: .leading, spacing: 16) {
            Button {
                imparte = false
                inaltime = .height(530)
            } label: {
                Label("Plătesc tot eu", systemImage: "chevron.left").font(.subheadline.weight(.medium))
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 4) {
                Text("Împarte nota").font(.title3.weight(.bold))
                Text("Plătești doar partea ta. Ceilalți primesc un link și plătesc fiecare partea lui.")
                    .font(.subheadline).foregroundStyle(.secondary)
            }

            PasImparteNota(total: suma, parti: $parti, oreStrangere: oreStrangere)

            Spacer(minLength: 0)

            PayWithApplePayButton(.plain) { laImpartire?(parti) }
                .payWithApplePayButtonStyle(.black)
                .frame(height: 52)
                .clipShape(.rect(cornerRadius: 14, style: .continuous))
            Text("Partea ta: \(Impartire.lei(parteaMea)) RON · demonstrativ, nu se debitează nimic")
                .font(.caption).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
            if let laTest { ButonTest { laTest(parti) } }
        }
    }

    private var continutAlege: some View {
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
            if let laTest { ButonTest { laTest(nil) } }
        }
    }

    /// Split the bill: fiecare își plătește partea. Fără `laImpartire` (ex. la modificare), nu apare.
    @ViewBuilder
    private var randInCurand: some View {
        if laImpartire != nil {
            let permis = oreStrangere != nil
            Button {
                metoda = nil
                imparte = true
                inaltime = .large
            } label: {
                HStack(spacing: 14) {
                    Image(systemName: "person.3.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Tema.accentDeschis)
                        .frame(width: 54, height: 38)
                        .background(Color(red: 0.043, green: 0.165, blue: 0.11), in: .rect(cornerRadius: 9, style: .continuous))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Split the bill").font(.body.weight(.semibold)).foregroundStyle(permis ? .primary : .secondary)
                        Text(permis ? "Fiecare își plătește partea" : "Doar dacă rezervi cu minim 12 ore înainte")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 0)
                    if permis {
                        Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
                    }
                }
                .padding(14)
                .background(Tema.fisa, in: .rect(cornerRadius: 18, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                }
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .disabled(!permis)
            .opacity(permis ? 1 : 0.6)
        }
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

/// Buton mic de test: sare peste plată și merge mai departe, ca să vezi toată procedura.
struct ButonTest: View {
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            Text("TEST")
                .font(.caption2.weight(.bold))
                .tracking(1.4)
                .foregroundStyle(Color(red: 0.70, green: 0.44, blue: 0.02))
                .padding(.horizontal, 12).padding(.vertical, 5)
                .background(Color.orange.opacity(0.12), in: .capsule)
                .overlay { Capsule().strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 3])).foregroundStyle(Color.orange.opacity(0.5)) }
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }
}
