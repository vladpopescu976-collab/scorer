import Foundation

/// Răsăritul și apusul, calculate pe loc.
///
/// „Nocturnă” nu se poate lega de o oră fixă: la 18:00 în decembrie e beznă,
/// iar în iunie mai sunt trei ore de lumină. Aceleași formule rulează și pe
/// server, ca totalul arătat aici să fie cel care se și salvează.
enum Soare {
    /// Coordonatele reședințelor de județ, plus câteva orașe mari.
    private static let coordonate: [String: (lat: Double, lon: Double)] = [
        "alba iulia": (46.07, 23.58), "arad": (46.18, 21.32), "pitesti": (44.86, 24.87),
        "bacau": (46.57, 26.91), "oradea": (47.06, 21.93), "bistrita": (47.13, 24.49),
        "botosani": (47.75, 26.66), "brasov": (45.66, 25.61), "braila": (45.27, 27.96),
        "buzau": (45.15, 26.82), "resita": (45.3, 21.89), "cluj-napoca": (46.77, 23.6),
        "constanta": (44.18, 28.63), "sfantu gheorghe": (45.86, 25.79),
        "targoviste": (44.93, 25.46), "craiova": (44.32, 23.8), "galati": (45.44, 28.05),
        "giurgiu": (43.9, 25.97), "targu jiu": (45.04, 23.27),
        "miercurea ciuc": (46.36, 25.8), "deva": (45.88, 22.9), "slobozia": (44.56, 27.37),
        "iasi": (47.16, 27.59), "bucuresti": (44.43, 26.11), "baia mare": (47.66, 23.58),
        "drobeta-turnu severin": (44.63, 22.66), "targu mures": (46.54, 24.56),
        "piatra neamt": (46.93, 26.37), "slatina": (44.43, 24.37), "ploiesti": (44.94, 26.03),
        "satu mare": (47.79, 22.88), "zalau": (47.19, 23.06), "sibiu": (45.79, 24.15),
        "suceava": (47.65, 26.26), "alexandria": (43.97, 25.33), "timisoara": (45.75, 21.23),
        "tulcea": (45.18, 28.8), "vaslui": (46.64, 27.73), "ramnicu valcea": (45.1, 24.37),
        "focsani": (45.7, 27.18), "calarasi": (44.2, 27.33),
    ]

    /// Mijlocul țării — folosit când orașul nu e în listă.
    private static let implicit = (lat: 45.9, lon: 24.9)

    private static func cheie(_ oras: String) -> String {
        oras.folding(options: [.diacriticInsensitive], locale: Locale(identifier: "ro_RO"))
            .lowercased()
            .trimmingCharacters(in: .whitespaces)
    }

    static func coordonateleOrasului(_ oras: String) -> (lat: Double, lon: Double) {
        coordonate[cheie(oras)] ?? implicit
    }

    private static func grade(_ valoare: Double) -> Double { valoare * .pi / 180 }
    private static func sin(_ g: Double) -> Double { Foundation.sin(grade(g)) }
    private static func cos(_ g: Double) -> Double { Foundation.cos(grade(g)) }

    static func rasaritSiApus(zi: Date, lat: Double, lon: Double) -> (rasarit: Date, apus: Date)? {
        let zilaJuliana = zi.timeIntervalSince1970 / 86_400 + 2_440_587.5
        let nrZile = (zilaJuliana - 2_451_545.0 + 0.0008).rounded()

        // Longitudinea estică se scade: mai la est, Soarele ajunge la zenit mai devreme.
        let amiazaMedie = nrZile - lon / 360

        let anomalie = (357.5291 + 0.98560028 * amiazaMedie).truncatingRemainder(dividingBy: 360)
        let ecuatia = 1.9148 * sin(anomalie) + 0.02 * sin(2 * anomalie) + 0.0003 * sin(3 * anomalie)
        let longitudineEcliptica = (anomalie + ecuatia + 180 + 102.9372)
            .truncatingRemainder(dividingBy: 360)

        let tranzit = 2_451_545.0 + amiazaMedie + 0.0053 * sin(anomalie)
            - 0.0069 * sin(2 * longitudineEcliptica)

        let sinDeclinatie = sin(longitudineEcliptica) * sin(23.44)
        let declinatie = asin(sinDeclinatie) * 180 / .pi

        // -0,833° ține cont de refracția atmosferică și de raza discului solar.
        let cosUnghiOrar = (sin(-0.833) - sin(lat) * sinDeclinatie) / (cos(lat) * cos(declinatie))
        guard cosUnghiOrar <= 1, cosUnghiOrar >= -1 else { return nil }

        let unghiOrar = acos(cosUnghiOrar) * 180 / .pi
        func instant(_ zileJuliene: Double) -> Date {
            Date(timeIntervalSince1970: (zileJuliene - 2_440_587.5) * 86_400)
        }
        return (instant(tranzit - unghiOrar / 360), instant(tranzit + unghiOrar / 360))
    }

    /// Câte ore din interval au nevoie de lumină artificială. Se numără ora cu
    /// ora: 17:00–20:00 în octombrie are două ore de nocturnă, nu trei.
    static func oreDeIntuneric(inceput: Date, sfarsit: Date, oras: String) -> Int {
        let loc = coordonateleOrasului(oras)
        var intunecate = 0
        var ora = inceput

        while ora < sfarsit {
            let urmatoarea = min(ora.addingTimeInterval(3600), sfarsit)
            // Mijlocul orei decide: o oră care începe fix la apus e deja în amurg.
            let mijloc = Date(timeIntervalSince1970: (ora.timeIntervalSince1970 + urmatoarea.timeIntervalSince1970) / 2)
            if let lumina = rasaritSiApus(zi: mijloc, lat: loc.lat, lon: loc.lon),
               mijloc < lumina.rasarit || mijloc > lumina.apus {
                intunecate += 1
            }
            ora = urmatoarea
        }
        return intunecate
    }
}
