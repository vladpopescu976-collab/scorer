import SwiftUI

@main
struct ScorerApp: App {
    @UIApplicationDelegateAdaptor(DelegatAplicatie.self) private var delegat
    @Environment(\.scenePhase) private var faza
    @State private var sesiune = Sesiune()

    init() {
        // Terenurile sunt în România: orele alese și afișate sunt ora României,
        // oricare ar fi fusul telefonului. Pe un telefon setat pe CET (o oră în
        // urmă), „20:00–22:00” pleca drept 21:00–23:00 și serverul răspundea că
        // terenul e închis la 22:00.
        NSTimeZone.default = .aplicatie
    }

    var body: some Scene {
        WindowGroup {
            RadacinaView()
                .environment(sesiune)
                .task { await sesiune.porneste() }
                .tint(Tema.accent)
                .environment(\.locale, .aplicatie)
                .environment(\.timeZone, .aplicatie)
                .onChange(of: faza) { _, noua in
                    if noua == .active { Notificari.shared.golesteInsigna() }
                }
        }
    }
}

struct RadacinaView: View {
    @Environment(Sesiune.self) private var sesiune

    var body: some View {
        Group {
            if sesiune.seIncarca {
                ProgressView().controlSize(.large)
            } else if sesiune.esteBusiness {
                // Rolurile sunt complet separate, ca pe web: un cont Business
                // nu vede niciodată ecranele de jucător.
                BusinessTabView()
            } else {
                // Fără cont, aplicația se deschide tot aici: terenurile se pot
                // răsfoi liber, iar contul se cere abia la rezervare.
                PersonalTabView()
            }
        }
        .animation(.easeInOut(duration: 0.25), value: sesiune.esteBusiness)
    }
}
