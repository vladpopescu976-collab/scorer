import SwiftUI
import UIKit
import UserNotifications

extension Notification.Name {
    /// Atingerea unei notificări despre rezervări: aplicația deschide tabul Rezervări.
    static let deschideRezervari = Notification.Name("scorer.deschideRezervari")
    /// Atingerea unei notificări despre un meci: aplicația deschide tabul Meciuri.
    static let deschideMeciuri = Notification.Name("scorer.deschideMeciuri")
}

/// Notificările de pe telefon: permisiunea, tokenul dat de Apple și trimiterea
/// lui la server, ca proprietarul să afle imediat de o rezervare nouă.
/// O notificare păstrată pe server (lista din aplicație și cele arătate pe telefon).
struct NotificareCont: Codable, Identifiable, Sendable {
    let id: String
    let titlu: String
    let text: String
    let ecran: String?
    let citita: Bool
    let creataLa: Date
}

/// Ce așteaptă acum răspunsul tău (o mutare propusă, o cerere de confirmat).
struct DeRezolvat: Codable, Identifiable, Sendable {
    let id: String
    let titlu: String
    let text: String
    let ecran: String?
}

struct RaspunsNotificari: Codable, Sendable {
    let necitite: Int
    var deRezolvat: [DeRezolvat]?
    let notificari: [NotificareCont]
}

@MainActor
@Observable
final class Notificari {
    static let shared = Notificari()
    @ObservationIgnored private let cheieToken = "scorer.tokenNotificari"
    @ObservationIgnored private let cheieUltima = "scorer.ultimaNotificare"
    /// Câte notificări necitite are contul (insigna din Cont).
    private(set) var necitite = 0
    @ObservationIgnored private var bucla: Task<Void, Never>?

    /// Tokenul acestui telefon, primit de la Apple.
    @ObservationIgnored private(set) var token: String? = UserDefaults.standard.string(forKey: "scorer.tokenNotificari")

    /// Cere voie o singură dată (iOS ține minte răspunsul) și înregistrează telefonul.
    func porneste() async {
        let centru = UNUserNotificationCenter.current()
        let setari = await centru.notificationSettings()
        switch setari.authorizationStatus {
        case .notDetermined:
            let permis = (try? await centru.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
            if permis { UIApplication.shared.registerForRemoteNotifications() }
        case .authorized, .provisional, .ephemeral:
            UIApplication.shared.registerForRemoteNotifications()
        default:
            break
        }
    }

    func primitToken(_ date: Data) {
        let text = date.map { String(format: "%02x", $0) }.joined()
        token = text
        UserDefaults.standard.set(text, forKey: cheieToken)
        Task { await trimiteLaServer() }
    }

    /// Leagă telefonul de contul conectat. Fără cont, nu face nimic.
    func trimiteLaServer() async {
        guard let token, Keychain.citeste("scorer.token") != nil else { return }
        struct Corp: Encodable { let token: String }
        try? await ApiClient.shared.cereFaraRaspuns("eu/dispozitiv", metoda: "POST", corp: Corp(token: token))
    }

    /// La deconectare: telefonul nu mai primește notificările contului.
    func dezleaga() async {
        reseteaza()
        guard let token else { return }
        struct Corp: Encodable { let token: String }
        try? await ApiClient.shared.cereFaraRaspuns("eu/dispozitiv", metoda: "DELETE", corp: Corp(token: token))
    }

    func golesteInsigna() {
        UNUserNotificationCenter.current().setBadgeCount(0)
    }

    // MARK: - Fără cheia Apple: aplicația își ia singură notificările

    /// Cât timp aplicația e deschisă, verifică des dacă s-a întâmplat ceva.
    func pornesteVerificarea() {
        bucla?.cancel()
        bucla = Task { [weak self] in
            while !Task.isCancelled {
                await self?.verifica()
                try? await Task.sleep(for: .seconds(15))
            }
        }
    }

    func opresteVerificarea() {
        bucla?.cancel()
        bucla = nil
    }

    /// Ia de pe server ce e nou și arată pe telefon fiecare notificare.
    func verifica() async {
        guard Keychain.citeste("scorer.token") != nil else { return }
        let ultima = UserDefaults.standard.string(forKey: cheieUltima)
        var parametri: [String: String] = [:]
        if let ultima { parametri["dupa"] = ultima }
        guard let raspuns = try? await ApiClient.shared.cere("notificari", parametri: parametri, ca: RaspunsNotificari.self) else { return }
        necitite = raspuns.necitite

        // Ce așteaptă răspunsul tău: arătat o singură dată pe telefon, fiecare.
        var aratate = Set(UserDefaults.standard.stringArray(forKey: "scorer.deRezolvatAratate") ?? [])
        for d in raspuns.deRezolvat ?? [] where !aratate.contains(d.id) {
            let continut = UNMutableNotificationContent()
            continut.title = d.titlu
            continut.body = d.text
            continut.sound = .default
            if let ecran = d.ecran { continut.userInfo = ["ecran": ecran] }
            try? await UNUserNotificationCenter.current().add(
                UNNotificationRequest(identifier: d.id, content: continut, trigger: nil)
            )
            aratate.insert(d.id)
        }
        UserDefaults.standard.set(Array(aratate), forKey: "scorer.deRezolvatAratate")

        guard let cea_mai_noua = raspuns.notificari.first else {
            if ultima == nil { UserDefaults.standard.set(Date().formatted(.iso8601cuFractiuni), forKey: cheieUltima) }
            return
        }
        UserDefaults.standard.set(cea_mai_noua.creataLa.formatted(.iso8601cuFractiuni), forKey: cheieUltima)
        // Prima verificare pe acest telefon: nu arătăm tot istoricul dintr-odată.
        guard ultima != nil else { return }

        for n in raspuns.notificari.reversed() {
            let continut = UNMutableNotificationContent()
            continut.title = n.titlu
            continut.body = n.text
            continut.sound = .default
            if let ecran = n.ecran { continut.userInfo = ["ecran": ecran] }
            // Același id ca pe server: nu apare de două ori.
            try? await UNUserNotificationCenter.current().add(
                UNNotificationRequest(identifier: n.id, content: continut, trigger: nil)
            )
        }
    }

    func marcheazaCitite() async {
        necitite = 0
        try? await ApiClient.shared.cereFaraRaspuns("notificari/citite", metoda: "POST")
    }

    func reseteaza() {
        opresteVerificarea()
        necitite = 0
        UserDefaults.standard.removeObject(forKey: cheieUltima)
    }
}

/// Delegatul aplicației, doar pentru notificări.
final class DelegatAplicatie: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { @MainActor in Notificari.shared.primitToken(deviceToken) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Notificări indisponibile:", error.localizedDescription)
    }

    /// Notificarea apare și când aplicația e deschisă.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound]
    }

    /// Atingerea notificării deschide Rezervările.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let ecran = response.notification.request.content.userInfo["ecran"] as? String
        await MainActor.run {
            NotificationCenter.default.post(name: ecran == "meciuri" ? .deschideMeciuri : .deschideRezervari, object: nil)
        }
    }
}
