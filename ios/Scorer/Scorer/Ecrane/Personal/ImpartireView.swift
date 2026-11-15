import SwiftUI
import PassKit

/// Split the bill: cine a plătit, cât mai e de strâns și linkul pentru prieteni.
/// Organizatorul e mereu primul, cu „Organizator” sub nume.
struct ImpartireView: View {
    let cod: String
    var initiala: Impartire?

    @Environment(\.dismiss) private var inchide
    @State private var date: Impartire?
    @State private var eroare: String?
    @State private var sePlateste = false
    @State private var applePay = ApplePay()
    @State private var aparut = false

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                if let date {
                    antet(date)
                    actiune(date)
                    lista(date)
                    Label("Mod demonstrativ: nu se debitează nimic.", systemImage: "checkmark.shield")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 4)
                } else if let eroare {
                    StareGoala(simbol: "link.badge.plus", titlu: "Nu am putut deschide", detaliu: eroare).fisa()
                } else {
                    ScheletFisa(inaltime: 260)
                    ScheletFisa(inaltime: 220)
                }
            }
            .padding(.horizontal, Tema.spatiu)
            .padding(.top, 8)
            .padding(.bottom, 30)
        }
        .background(Tema.fundal.ignoresSafeArea())
        .navigationTitle("Split the bill")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Gata") { inchide() } } }
        .refreshable { await incarca() }
        .task {
            if date == nil { date = initiala }
            await incarca()
            withAnimation(.smooth(duration: 1)) { aparut = true }
        }
        .sensoryFeedback(.success, trigger: date?.platite)
    }

    // MARK: Antet

    private func antet(_ d: Impartire) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Split the bill", systemImage: "person.3.fill")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(.white.opacity(0.12), in: .capsule)
                        .overlay { Capsule().strokeBorder(.white.opacity(0.15)) }
                    Text(d.teren.nume)
                        .font(.system(size: 24, weight: .semibold))
                        .fixedSize(horizontal: false, vertical: true)
                    Label(d.cand, systemImage: "calendar")
                        .font(.subheadline).opacity(0.75)
                    Label(d.teren.oras, systemImage: "mappin.and.ellipse")
                        .font(.subheadline).opacity(0.75)
                }
                Spacer(minLength: 0)
                inel(d)
            }

            HStack(spacing: 8) {
                caseta("Fiecare", d.sumaParte)
                caseta("Strâns", d.colectat)
                caseta("Rămas", d.ramas)
            }

            GeometryReader { g in
                Capsule().fill(.white.opacity(0.1))
                    .overlay(alignment: .leading) {
                        Capsule().fill(Tema.accentDeschis)
                            .frame(width: g.size.width * (aparut ? min(1, d.colectat / max(1, d.total)) : 0))
                    }
            }
            .frame(height: 6)
        }
        .foregroundStyle(Color(red: 0.95, green: 0.94, blue: 0.90))
        .padding(20)
        .background {
            RadialGradient(
                colors: [Color(red: 0.09, green: 0.33, blue: 0.23), Color(red: 0.043, green: 0.165, blue: 0.11), Color(red: 0.027, green: 0.086, blue: 0.06)],
                center: .topLeading, startRadius: 0, endRadius: 480
            )
        }
        .clipShape(.rect(cornerRadius: 28, style: .continuous))
        .shadow(color: .black.opacity(0.25), radius: 24, y: 14)
    }

    private func inel(_ d: Impartire) -> some View {
        ZStack {
            Circle().stroke(.white.opacity(0.12), lineWidth: 7)
            Circle()
                .trim(from: 0, to: aparut ? CGFloat(d.platite) / CGFloat(max(1, d.numarParti)) : 0)
                .stroke(Tema.accentDeschis, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 2) {
                (Text("\(d.platite)").font(.title2.weight(.semibold))
                 + Text("/\(d.numarParti)").font(.subheadline).foregroundStyle(.white.opacity(0.55)))
                    .monospacedDigit()
                Text("PLĂTIT").font(.system(size: 9, weight: .bold)).tracking(1).opacity(0.55)
            }
        }
        .frame(width: 86, height: 86)
    }

    private func caseta(_ eticheta: String, _ suma: Double) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(eticheta.uppercased()).font(.system(size: 10, weight: .bold)).tracking(0.8).opacity(0.55)
            (Text(Impartire.lei(suma)).font(.headline) + Text(" RON").font(.caption2).foregroundStyle(.white.opacity(0.55)))
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12).padding(.vertical, 10)
        .background(.white.opacity(0.07), in: .rect(cornerRadius: 14, style: .continuous))
    }

    // MARK: Acțiunea principală

    @ViewBuilder
    private func actiune(_ d: Impartire) -> some View {
        if d.inchisa {
            mesaj("Rezervarea a fost anulată. Nu mai e nimic de plătit.", culoare: .secondary)
        } else if d.esteOrganizator {
            ShareLink(
                item: URL(string: d.link) ?? URL(string: "https://eterenuri.vercel.app")!,
                subject: Text("Split the bill · Scorer"),
                message: Text("Hai la meci! \(d.teren.nume), \(d.cand). Partea ta: \(Impartire.lei(d.sumaParte)) RON.")
            ) {
                Label("Trimite linkul prietenilor", systemImage: "paperplane.fill")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(Tema.gradientAccent, in: .capsule)
            }
            .buttonStyle(.plain)
        } else if d.amPlatit {
            mesaj("Ți-ai plătit partea. Ne vedem pe teren!", culoare: Tema.accent, simbol: "checkmark.seal.fill")
        } else if d.platite >= d.numarParti {
            mesaj("Nota e plătită integral.", culoare: Tema.accent)
        } else if d.potPlati {
            PayWithApplePayButton(.plain) { plateste(d) }
                .payWithApplePayButtonStyle(.black)
                .frame(height: 52)
                .clipShape(.capsule)
                .disabled(sePlateste)
                .overlay(alignment: .top) {
                    Text("Partea ta: \(Impartire.lei(d.sumaParte)) RON")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .offset(y: -22)
                }
                .padding(.top, 14)
            ButonTest { platesteDirect() }
        } else {
            mesaj("Meciul a început deja.", culoare: .secondary)
        }
    }

    private func mesaj(_ text: String, culoare: Color, simbol: String? = nil) -> some View {
        HStack(spacing: 8) {
            if let simbol { Image(systemName: simbol) }
            Text(text)
        }
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(culoare)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 15)
        .background(culoare.opacity(0.1), in: .rect(cornerRadius: 18, style: .continuous))
    }

    // MARK: Lista

    private func lista(_ d: Impartire) -> some View {
        let libere = max(0, d.numarParti - d.platite)
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("CINE A PLĂTIT").font(.caption.weight(.bold)).tracking(0.8).foregroundStyle(.secondary)
                Spacer()
                Text("\(d.platite) din \(d.numarParti)").font(.caption.monospacedDigit()).foregroundStyle(.secondary)
            }
            VStack(spacing: 0) {
                ForEach(Array(d.parti.enumerated()), id: \.element.id) { i, p in
                    if i > 0 { Divider().padding(.leading, 70) }
                    randPlatit(p).intrareElement(i)
                }
                ForEach(0..<min(libere, 4), id: \.self) { _ in
                    Divider().padding(.leading, 70)
                    randLiber(d.sumaParte)
                }
                if libere > 4 {
                    Divider()
                    Text("încă \(libere - 4) \(libere - 4 == 1 ? "loc liber" : "locuri libere")")
                        .font(.footnote).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
            }
            .background(Tema.fisa, in: .rect(cornerRadius: 22, style: .continuous))
            .shadow(color: .black.opacity(0.05), radius: 14, y: 6)
        }
    }

    private func randPlatit(_ p: Impartire.Parte) -> some View {
        HStack(spacing: 12) {
            AvatarPersoana(nume: p.nume, poza: p.poza, marime: 44)
                .overlay(alignment: .topTrailing) {
                    if p.esteOrganizator {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color(red: 0.35, green: 0.24, blue: 0))
                            .frame(width: 20, height: 20)
                            .background(Color(red: 0.96, green: 0.76, blue: 0.26), in: .circle)
                            .overlay { Circle().strokeBorder(Tema.fisa, lineWidth: 2) }
                            .offset(x: 5, y: -5)
                    }
                }
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(p.nume).font(.body.weight(.semibold)).lineLimit(1)
                    if p.eu { Text("(tu)").font(.footnote).foregroundStyle(.secondary) }
                }
                if p.esteOrganizator {
                    Text("Organizator")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Color(red: 0.72, green: 0.47, blue: 0.12))
                } else {
                    Text("Plătit \(p.platitLa.formatted(.relative(presentation: .named).locale(.aplicatie)))")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 6)
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(Impartire.lei(p.suma)) RON").font(.subheadline.weight(.semibold).monospacedDigit())
                Label("Plătit", systemImage: "checkmark")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Tema.accent)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    private func randLiber(_ suma: Double) -> some View {
        HStack(spacing: 12) {
            Circle()
                .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [4, 4]))
                .foregroundStyle(Color.secondary.opacity(0.4))
                .frame(width: 44, height: 44)
            VStack(alignment: .leading, spacing: 2) {
                Text("Loc liber").font(.body.weight(.medium)).foregroundStyle(.secondary)
                Text("Așteaptă plata").font(.footnote).foregroundStyle(.tertiary)
            }
            Spacer()
            Text("\(Impartire.lei(suma)) RON").font(.subheadline.monospacedDigit()).foregroundStyle(.secondary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    // MARK: Date

    private func incarca() async {
        do {
            let noi = try await ApiClient.shared.cere("impartiri/\(cod)", ca: Impartire.self)
            withAnimation(.smooth) { date = noi }
            eroare = nil
        } catch {
            if date == nil { eroare = error.localizedDescription }
        }
    }

    private func plateste(_ d: Impartire) {
        applePay.plateste(suma: d.sumaParte, descriere: "Partea ta · \(d.teren.nume)") { platit in
            guard platit else { return }
            platesteDirect()
        }
    }

    /// Înregistrează partea plătită (după Apple Pay sau din butonul „Test”).
    private func platesteDirect() {
        sePlateste = true
        Task {
            defer { sePlateste = false }
            do {
                let noi = try await ApiClient.shared.cere("impartiri/\(cod)/plata", metoda: "POST", ca: Impartire.self)
                withAnimation(.smooth) { date = noi }
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}

/// Pasul „Împarte nota” din foaia de plată: câți împart, cât dă fiecare, cine e în cerc.
struct PasImparteNota: View {
    let total: Double
    @Binding var parti: Int

    var body: some View {
        let (sumaParte, parteaMea) = Impartire.calculeaza(total: total, parti: parti)
        let vizibili = min(parti - 1, 7)
        VStack(spacing: 18) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("TOTAL").font(.system(size: 10, weight: .bold)).tracking(1).opacity(0.6)
                    Text("\(Impartire.lei(total)) RON").font(.subheadline.weight(.medium).monospacedDigit())
                }
                Spacer()
                HStack(spacing: 2) {
                    Button { parti = max(2, parti - 1) } label: {
                        Image(systemName: "minus").frame(width: 34, height: 34)
                    }
                    .disabled(parti <= 2)
                    Text("\(parti) pers.")
                        .font(.subheadline.weight(.semibold).monospacedDigit())
                        .frame(width: 62)
                        .contentTransition(.numericText())
                    Button { parti = min(30, parti + 1) } label: {
                        Image(systemName: "plus").frame(width: 34, height: 34)
                    }
                    .disabled(parti >= 30)
                }
                .font(.system(size: 14, weight: .bold))
                .buttonStyle(.plain)
                .padding(3)
                .background(.white.opacity(0.1), in: .capsule)
                .overlay { Capsule().strokeBorder(.white.opacity(0.15)) }
                .sensoryFeedback(.selection, trigger: parti)
            }

            VStack(spacing: 4) {
                Text("FIECARE PLĂTEȘTE").font(.system(size: 10, weight: .bold)).tracking(1).opacity(0.6)
                (Text(Impartire.lei(sumaParte)).font(.system(size: 44, weight: .semibold))
                 + Text(" RON").font(.headline).foregroundStyle(.white.opacity(0.6)))
                    .monospacedDigit()
                    .contentTransition(.numericText())
            }

            HStack(spacing: -10) {
                Text("Tu")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(Color(red: 0.03, green: 0.09, blue: 0.06))
                    .frame(width: 42, height: 42)
                    .background(Tema.accentDeschis, in: .circle)
                    .overlay(alignment: .top) {
                        Image(systemName: "crown.fill").font(.system(size: 11)).foregroundStyle(.yellow).offset(y: -12)
                    }
                    .zIndex(1)
                ForEach(0..<vizibili, id: \.self) { _ in
                    Circle()
                        .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                        .foregroundStyle(.white.opacity(0.35))
                        .background(Circle().fill(Color(red: 0.043, green: 0.165, blue: 0.11)))
                        .frame(width: 42, height: 42)
                        .transition(.scale)
                }
                if parti - 1 > vizibili {
                    Text("+\(parti - 1 - vizibili)")
                        .font(.caption.weight(.semibold))
                        .frame(width: 42, height: 42)
                        .background(Color(red: 0.12, green: 0.25, blue: 0.18), in: .circle)
                }
            }
            .animation(.snappy, value: parti)

            (Text("Tu plătești acum ") + Text("\(Impartire.lei(parteaMea)) RON").bold() + Text(". Linkul îl trimiți după rezervare."))
                .font(.footnote)
                .opacity(0.75)
                .multilineTextAlignment(.center)
        }
        .foregroundStyle(Color(red: 0.95, green: 0.94, blue: 0.90))
        .padding(18)
        .background {
            RadialGradient(
                colors: [Color(red: 0.09, green: 0.33, blue: 0.23), Color(red: 0.043, green: 0.165, blue: 0.11), Color(red: 0.027, green: 0.086, blue: 0.06)],
                center: .topLeading, startRadius: 0, endRadius: 420
            )
        }
        .clipShape(.rect(cornerRadius: 24, style: .continuous))
        .animation(.snappy, value: parti)
    }
}
