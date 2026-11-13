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
@MainActor
final class Notificari {
    static let shared = Notificari()
    private let cheieToken = "scorer.tokenNotificari"

    /// Tokenul acestui telefon, primit de la Apple.
    private(set) var token: String? = UserDefaults.standard.string(forKey: "scorer.tokenNotificari")

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
        guard let token else { return }
        struct Corp: Encodable { let token: String }
        try? await ApiClient.shared.cereFaraRaspuns("eu/dispozitiv", metoda: "DELETE", corp: Corp(token: token))
    }

    func golesteInsigna() {
        UNUserNotificationCenter.current().setBadgeCount(0)
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
