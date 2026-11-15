import SwiftUI

/// „Altele” din panoul business: în loc de lista simplă a sistemului, un ecran
/// cu profilul firmei pe verde și carduri mari, cu date adevărate în ele.
struct AlteleBusinessView: View {
    @Environment(Sesiune.self) private var sesiune

    @State private var recenzii: [Recenzie] = []
    @State private var necitite = 0
    @State private var seIncarca = true
    @State private var terenNou = false
    @State private var confirmaIesirea = false

    private var medie: Double? {
        recenzii.isEmpty ? nil : Double(recenzii.map(\.nota).reduce(0, +)) / Double(recenzii.count)
    }

    private var faraRaspuns: Int { recenzii.filter { $0.raspunsProprietar == nil }.count }

    var body: some View {
        ZStack {
            Tema.fundal.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 14) {
                    cardRecenzii
                    HStack(spacing: 14) {
                        NavigationLink { ContView() } label: {
                            Tigla(
                                simbol: "person.crop.circle.fill",
                                titlu: "Contul meu",
                                detaliu: "Date, parolă și poză"
                            )
                        }
                        NavigationLink { NotificariView() } label: {
                            Tigla(
                                simbol: "bell.badge.fill",
                                titlu: "Notificări",
                                detaliu: necitite > 0 ? "\(necitite) \(necitite == 1 ? "necitită" : "necitite")" : "Totul la zi",
                                insigna: necitite > 0 ? "\(min(necitite, 99))" : nil
                            )
                        }
                    }
                    HStack(spacing: 14) {
                        Button { terenNou = true } label: {
                            Tigla(simbol: "plus.square.fill", titlu: "Teren nou", detaliu: "Poze, program și preț")
                        }
                        Link(destination: URL(string: "https://eterenuri.vercel.app/dashboard/business")!) {
                            Tigla(simbol: "safari.fill", titlu: "Panoul web", detaliu: "Totul și pe calculator")
                        }
                    }
                    cardDistribuie
                    subsol
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 16)
                .padding(.bottom, 30)
            }
            .refreshable { await incarca() }
        }
        .safeAreaInset(edge: .top, spacing: 16) { antet }
        .navigationTitle("Altele")
        .navigationBarTitleDisplayMode(.inline)
        .faraTitluSus()
        .task { await incarca() }
        .sheet(isPresented: $terenNou) {
            NavigationStack { FormularTerenView(teren: nil) {} }
        }
        .confirmationDialog("Te deconectezi?", isPresented: $confirmaIesirea, titleVisibility: .visible) {
            Button("Deconectează-mă", role: .destructive) { Task { await sesiune.deconecteaza() } }
            Button("Renunță", role: .cancel) {}
        }
    }

    // MARK: Antet

    /// Firma pe verde: poza, numele, tipul contului și nota medie, dintr-o privire.
    private var antet: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 14) {
                AvatarUtilizator(utilizator: sesiune.utilizator, marime: 64)
                    .overlay { Circle().strokeBorder(Tema.accentDeschis.opacity(0.7), lineWidth: 2) }
                    .shadow(color: .black.opacity(0.3), radius: 10, y: 4)
                VStack(alignment: .leading, spacing: 3) {
                    Text("Business · Scorer")
                        .font(.footnote.weight(.medium))
                        .opacity(0.6)
                    Text(sesiune.utilizator?.numeFirma ?? sesiune.utilizator?.nume ?? "Contul tău")
                        .font(.system(size: 26, weight: .semibold))
                        .tracking(-0.5)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    if let email = sesiune.utilizator?.email {
                        Text(email).font(.footnote).opacity(0.6).lineLimit(1)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 20)

            HStack(spacing: 8) {
                pastila(simbol: "checkmark.seal.fill", text: "Cont Business", accent: true)
                if let oras = sesiune.utilizator?.oras, !oras.isEmpty {
                    pastila(simbol: "mappin.and.ellipse", text: oras)
                }
                if let medie {
                    pastila(simbol: "star.fill", text: String(format: "%.1f", medie).replacingOccurrences(of: ".", with: ","))
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 20)
        }
        .foregroundStyle(Tema.creta)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 4)
        .padding(.bottom, 22)
        .background { FundalVerde() }
    }

    private func pastila(simbol: String, text: String, accent: Bool = false) -> some View {
        Label(text, systemImage: simbol)
            .font(.caption.weight(.semibold))
            .lineLimit(1)
            .foregroundStyle(accent ? Color(red: 0.043, green: 0.165, blue: 0.11) : Tema.creta.opacity(0.85))
            .padding(.horizontal, 11)
            .padding(.vertical, 6)
            .background(accent ? AnyShapeStyle(Tema.accentDeschis) : AnyShapeStyle(.white.opacity(0.1)), in: .capsule)
    }

    // MARK: Recenzii

    /// Cardul mare: nota, stelele, câte așteaptă răspuns și ultima părere primită.
    private var cardRecenzii: some View {
        NavigationLink { RecenziiBusinessView() } label: {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .firstTextBaseline) {
                    Label("Recenzii", systemImage: "star.bubble.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Tema.accent)
                    Spacer()
                    if faraRaspuns > 0 {
                        Text("\(faraRaspuns) fără răspuns")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Tema.asteptare)
                            .padding(.horizontal, 9).padding(.vertical, 4)
                            .background(Tema.asteptare.opacity(0.12), in: .capsule)
                    }
                    Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
                }

                if seIncarca {
                    ProgressView().frame(maxWidth: .infinity, minHeight: 70)
                } else if let medie {
                    HStack(alignment: .center, spacing: 16) {
                        Text(String(format: "%.1f", medie).replacingOccurrences(of: ".", with: ","))
                            .font(.system(size: 52, weight: .semibold).monospacedDigit())
                            .tracking(-1.5)
                        VStack(alignment: .leading, spacing: 5) {
                            HStack(spacing: 3) {
                                ForEach(1...5, id: \.self) { i in
                                    Image(systemName: Double(i) <= medie.rounded() ? "star.fill" : "star")
                                        .font(.system(size: 14))
                                        .foregroundStyle(Double(i) <= medie.rounded() ? Color.yellow : Color.secondary.opacity(0.35))
                                }
                            }
                            Text("din \(recenzii.count) \(recenzii.count == 1 ? "recenzie" : "recenzii")")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 0)
                    }
                    if let ultima = recenzii.first(where: { !($0.comentariu ?? "").isEmpty }), let text = ultima.comentariu {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("„\(text)”")
                                .font(.system(.subheadline, design: .serif).italic())
                                .lineLimit(2)
                            Text("— \(ultima.autor)\(ultima.teren.map { " · \($0)" } ?? "")")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Tema.accent.opacity(0.06), in: .rect(cornerRadius: 16, style: .continuous))
                    }
                } else {
                    Text("Încă nu ai recenzii. Apar aici după primele meciuri jucate la tine.")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Tema.fisa, in: .rect(cornerRadius: 24, style: .continuous))
            .shadow(color: .black.opacity(0.04), radius: 1, y: 1)
            .shadow(color: .black.opacity(0.07), radius: 18, y: 8)
            .contentShape(.rect(cornerRadius: 24))
        }
    }

    // MARK: Distribuie și subsol

    /// O invitație de dat mai departe: alți proprietari sau jucătorii tăi.
    private var cardDistribuie: some View {
        ShareLink(
            item: URL(string: "https://eterenuri.vercel.app")!,
            subject: Text("Scorer"),
            message: Text("Rezervă terenul online, pe Scorer.")
        ) {
            HStack(spacing: 14) {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Color(red: 0.043, green: 0.165, blue: 0.11))
                    .frame(width: 46, height: 46)
                    .background(Tema.accentDeschis, in: .rect(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Trimite Scorer jucătorilor tăi").font(.subheadline.weight(.semibold))
                    Text("Mai multe rezervări online, mai puține telefoane.")
                        .font(.footnote).opacity(0.65)
                }
                Spacer(minLength: 0)
                Image(systemName: "arrow.up.right").font(.footnote.weight(.bold)).opacity(0.6)
            }
            .foregroundStyle(Tema.creta)
            .padding(16)
            .background { FundalVerdeCard() }
        }
    }

    private var subsol: some View {
        VStack(spacing: 14) {
            Button(role: .destructive) { confirmaIesirea = true } label: {
                Label("Deconectează-te", systemImage: "rectangle.portrait.and.arrow.right")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Tema.ocupat)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Tema.ocupat.opacity(0.08), in: .capsule)
            }
            (Text("Scorer").bold() + Text(" Business · ") + Text("Restul e joc.").italic())
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.top, 8)
    }

    private func incarca() async {
        async let r = try? await ApiClient.shared.cere("recenzii", ca: [Recenzie].self)
        async let n = try? await ApiClient.shared.cere("notificari", ca: RaspunsNotificari.self)
        let (rec, notif) = await (r, n)
        withAnimation(.smooth) {
            recenzii = rec ?? []
            necitite = notif?.necitite ?? 0
            seIncarca = false
        }
    }
}

/// O țiglă din grila „Altele”: iconiță în gradient, titlu, un rând de context.
private struct Tigla: View {
    let simbol: String
    let titlu: String
    let detaliu: String
    var insigna: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                Image(systemName: simbol)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Tema.gradientAccent, in: .rect(cornerRadius: 14, style: .continuous))
                    .shadow(color: Tema.accent.opacity(0.35), radius: 8, y: 4)
                Spacer(minLength: 0)
                if let insigna {
                    Text(insigna)
                        .font(.caption2.weight(.bold).monospacedDigit())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 7).padding(.vertical, 3)
                        .background(Tema.ocupat, in: .capsule)
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(titlu).font(.headline)
                Text(detaliu).font(.footnote).foregroundStyle(.secondary).lineLimit(1)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, minHeight: 132, alignment: .topLeading)
        .background(Tema.fisa, in: .rect(cornerRadius: 22, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 1, y: 1)
        .shadow(color: .black.opacity(0.06), radius: 14, y: 6)
        .contentShape(.rect(cornerRadius: 22))
    }
}

/// Verdele benzii, dar ca un card rotunjit de sine stătător.
private struct FundalVerdeCard: View {
    var body: some View {
        RadialGradient(
            colors: [Color(red: 0.09, green: 0.33, blue: 0.23), Color(red: 0.043, green: 0.165, blue: 0.11), Color(red: 0.027, green: 0.086, blue: 0.06)],
            center: .topLeading, startRadius: 0, endRadius: 360
        )
        .clipShape(.rect(cornerRadius: 22, style: .continuous))
        .shadow(color: .black.opacity(0.15), radius: 14, y: 6)
    }
}
