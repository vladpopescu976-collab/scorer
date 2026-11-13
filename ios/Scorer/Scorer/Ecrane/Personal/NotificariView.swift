import SwiftUI

/// Tot ce i s-a întâmplat contului: rezervări, anulări, mutări, meciuri, recenzii.
struct NotificariView: View {
    @State private var notificari: [NotificareCont] = []
    @State private var deRezolvat: [DeRezolvat] = []
    @State private var rezultatTest: String?
    @State private var seIncarca = true

    var body: some View {
        List {
            if !deRezolvat.isEmpty {
                Section("Așteaptă răspunsul tău") {
                    ForEach(deRezolvat) { d in
                        Button {
                            NotificationCenter.default.post(name: d.ecran == "meciuri" ? .deschideMeciuri : .deschideRezervari, object: nil)
                        } label: {
                            HStack(alignment: .top, spacing: 12) {
                                Image(systemName: "exclamationmark")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(.white)
                                    .frame(width: 36, height: 36)
                                    .background(Tema.asteptare, in: .rect(cornerRadius: 10, style: .continuous))
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(d.titlu).font(.subheadline.weight(.bold)).foregroundStyle(.primary)
                                    Text(d.text).font(.footnote).foregroundStyle(.secondary)
                                }
                                Spacer(minLength: 0)
                                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
                            }
                            .padding(.vertical, 4)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            if seIncarca && notificari.isEmpty && deRezolvat.isEmpty {
                HStack { Spacer(); ProgressView(); Spacer() }
            } else if notificari.isEmpty && deRezolvat.isEmpty {
                StareGoala(
                    simbol: "bell",
                    titlu: "Nicio notificare",
                    detaliu: "Aici apar rezervările, confirmările, anulările, mutările și meciurile tale."
                )
                .listRowSeparator(.hidden)
            } else {
                ForEach(notificari) { n in
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: simbol(n.ecran))
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 36, height: 36)
                            .background(Tema.gradientAccent, in: .rect(cornerRadius: 10, style: .continuous))
                        VStack(alignment: .leading, spacing: 3) {
                            HStack(alignment: .firstTextBaseline) {
                                Text(n.titlu).font(.subheadline.weight(n.citita ? .medium : .bold))
                                Spacer(minLength: 6)
                                Text(n.creataLa, format: .relative(presentation: .named))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Text(n.text).font(.footnote).foregroundStyle(.secondary)
                        }
                        if !n.citita {
                            Circle().fill(Tema.accent).frame(width: 8, height: 8).padding(.top, 6)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle("Notificări")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Test", systemImage: "bell.badge") { Task { await test() } }
            }
        }
        .alert("Notificare de test", isPresented: .init(get: { rezultatTest != nil }, set: { if !$0 { rezultatTest = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(rezultatTest ?? "")
        }
        .refreshable { await incarca() }
        .task {
            await incarca()
            await Notificari.shared.marcheazaCitite()
        }
    }

    private func simbol(_ ecran: String?) -> String {
        switch ecran {
        case "meciuri": "figure.run"
        case "recenzii": "star.fill"
        default: "calendar"
        }
    }

    /// Trimite o notificare de test și spune ce lipsește, dacă lipsește ceva.
    private func test() async {
        struct Raspuns: Decodable { let cheieApple: Bool; let telefoaneInregistrate: Int; let tabelLipsa: Bool }
        guard let r = try? await ApiClient.shared.cere("notificari/test", metoda: "POST", ca: Raspuns.self) else {
            rezultatTest = "Serverul nu a răspuns. Încearcă din nou."
            return
        }
        if r.tabelLipsa {
            rezultatTest = "Baza de date nu are încă tabelele pentru notificări. Rulează actualizarea bazei (prisma migrate deploy)."
        } else if !r.cheieApple {
            rezultatTest = "Serverul nu are cheia Apple, deci nu poate trimite notificări cu aplicația închisă. Notificarea a fost salvată și apare doar cât aplicația e deschisă."
        } else if r.telefoaneInregistrate == 0 {
            rezultatTest = "Telefonul nu s-a înregistrat pentru notificări. Verifică în Setări → Scorer → Notificări că sunt permise, apoi deschide din nou aplicația."
        } else {
            rezultatTest = "Trimisă către \(r.telefoaneInregistrate) \(r.telefoaneInregistrate == 1 ? "telefon" : "telefoane"). Închide aplicația: ar trebui să apară în câteva secunde."
        }
        await Notificari.shared.trimiteLaServer()
    }

    private func incarca() async {
        if let r = try? await ApiClient.shared.cere("notificari", ca: RaspunsNotificari.self) {
            notificari = r.notificari
            deRezolvat = r.deRezolvat ?? []
        }
        seIncarca = false
    }
}
