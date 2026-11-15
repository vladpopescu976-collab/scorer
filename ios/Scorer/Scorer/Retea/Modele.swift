import Foundation

// Formele întoarse de /api/mobil. Numele câmpurilor sunt identice cu cele din
// JSON, ca să nu fie nevoie de CodingKeys.

enum Rol: String, Codable, Sendable {
    case personal = "PERSONAL"
    case business = "BUSINESS"
}

/// Dimensiunea unui teren, cum o spun jucătorii. Același catalog ca pe site
/// (`src/lib/formate-teren.ts`).
struct FormatTeren: Hashable, Sendable {
    let cod: String
    /// Jucători în total, ambele echipe.
    let jucatori: Int
    var nota: String?

    var detaliu: String { "\(jucatori) jucători" + (nota.map { " · \($0)" } ?? "") }
}

extension Sport {
    var formate: [FormatTeren] {
        switch self {
        case .fotbal: [
            FormatTeren(cod: "4+1", jucatori: 10), FormatTeren(cod: "5+1", jucatori: 12),
            FormatTeren(cod: "6+1", jucatori: 14), FormatTeren(cod: "7+1", jucatori: 16),
            FormatTeren(cod: "8+1", jucatori: 18), FormatTeren(cod: "10+1", jucatori: 22, nota: "teren mare"),
        ]
        case .baschet: [
            FormatTeren(cod: "3x3", jucatori: 6, nota: "jumătate de teren"),
            FormatTeren(cod: "5x5", jucatori: 10, nota: "teren întreg"),
        ]
        case .tenis, .badminton: [
            FormatTeren(cod: "1x1", jucatori: 2, nota: "simplu"),
            FormatTeren(cod: "2x2", jucatori: 4, nota: "dublu"),
        ]
        case .volei: [
            FormatTeren(cod: "2x2", jucatori: 4, nota: "plajă"), FormatTeren(cod: "4x4", jucatori: 8),
            FormatTeren(cod: "6x6", jucatori: 12, nota: "sală"),
        ]
        case .handbal: [
            FormatTeren(cod: "4+1", jucatori: 10, nota: "minihandbal"), FormatTeren(cod: "6+1", jucatori: 14),
        ]
        case .padel: [
            FormatTeren(cod: "1x1", jucatori: 2, nota: "single"),
            FormatTeren(cod: "2x2", jucatori: 4, nota: "dublu"),
        ]
        case .altele: []
        }
    }

    /// Formatele salvate ale unui teren, în ordinea din catalog.
    func formateAlese(_ coduri: [String]?) -> [FormatTeren] {
        formate.filter { (coduri ?? []).contains($0.cod) }
    }
}

enum Sport: String, Codable, CaseIterable, Sendable {
    case fotbal = "FOOTBALL"
    case baschet = "BASKETBALL"
    case tenis = "TENNIS"
    case volei = "VOLLEYBALL"
    case handbal = "HANDBALL"
    case padel = "PADEL"
    case badminton = "BADMINTON"
    case altele = "OTHER"

    var eticheta: String {
        switch self {
        case .fotbal: "Fotbal"
        case .baschet: "Baschet"
        case .tenis: "Tenis"
        case .volei: "Volei"
        case .handbal: "Handbal"
        case .padel: "Padel"
        case .badminton: "Badminton"
        case .altele: "Altele"
        }
    }

    var simbol: String {
        switch self {
        case .fotbal: "soccerball"
        case .baschet: "basketball"
        case .tenis: "tennisball"
        case .volei: "volleyball"
        case .handbal: "figure.handball"
        case .padel: "figure.tennis"
        case .badminton: "figure.badminton"
        case .altele: "sportscourt"
        }
    }
}

enum StatusRezervare: String, Codable, Sendable {
    case inAsteptare = "PENDING"
    case confirmata = "CONFIRMED"
    case respinsa = "REJECTED"
    case mutarePropusa = "RESCHEDULE_PROPOSED"
    case anulata = "CANCELLED"
    /// Ora a trecut fără ca proprietarul să răspundă.
    case expirata = "EXPIRED"
    /// Un status adăugat pe server după ce a fost publicată aplicația.
    case necunoscut = "NECUNOSCUT"

    /// Fără asta, un status nou pe server ar face să eșueze decodarea întregii
    /// liste de rezervări, nu doar afișarea lui.
    init(from decoder: Decoder) throws {
        let text = try decoder.singleValueContainer().decode(String.self)
        self = StatusRezervare(rawValue: text) ?? .necunoscut
    }

    var eticheta: String {
        switch self {
        case .inAsteptare: "În așteptare"
        case .confirmata: "Confirmată"
        case .respinsa: "Respinsă"
        case .mutarePropusa: "Mutare propusă"
        case .anulata: "Anulată"
        case .expirata: "Expirată"
        case .necunoscut: "Status necunoscut"
        }
    }
}

/// Nocturnă, închiriere echipament, vestiar privat — definite de proprietar.
struct OptiuneTeren: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let nume: String
    let pret: Double
    /// Fals înseamnă că se plătește o singură dată pe rezervare.
    let peOra: Bool
    /// Se adaugă singură pe orele fără lumină naturală.
    let automatLaIntuneric: Bool
    /// Se adaugă singură în sezonul rece (oct–apr): încălzire balon.
    /// Opțional, ca aplicația să meargă și cu un server mai vechi.
    var automatLaFrig: Bool?

    var laFrig: Bool { automatLaFrig ?? false }
    var automata: Bool { automatLaIntuneric || laFrig }
}

/// Lunile în care încălzirea balonului se adaugă singură — aceleași ca pe server.
enum SezonRece {
    static let luni: Set<Int> = [10, 11, 12, 1, 2, 3, 4]
    static func cuprinde(_ data: Date) -> Bool {
        luni.contains(Calendar.current.component(.month, from: data))
    }
}

struct Utilizator: Codable, Identifiable, Sendable {
    let id: String
    let nume: String
    let email: String
    let rol: Rol
    let telefon: String?
    // Completate la înregistrare. Opționale, fiindcă conturile mai vechi
    // n-au fost întrebate.
    var oras: String?
    var sporturi: [Sport]?
    var numeFirma: String?
    var membruDin: Date?
    /// Poza de profil; lipsă = se arată inițialele.
    var poza: String?
    /// Apare în „Caută jucători”.
    var vizibilInCautare: Bool?
}

/// Cineva arătat pe scurt: nume și poză.
struct PersoanaScurta: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let nume: String
    let poza: String?
    /// Doar pentru organizator: telefonul jucătorului care vine.
    var telefon: String?
}

/// Un jucător într-un meci (acceptat sau care a cerut să vină).
struct JucatorInMeci: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let nume: String
    let poza: String?
    /// Doar organizatorul îl vede, ca să-l poată suna.
    let telefon: String?
    var pozitii: [String]?
    var nivel: String?

    var detalii: String {
        [(pozitii ?? []).joined(separator: ", "), NivelJoc.eticheta(nivel) ?? ""]
            .filter { !$0.isEmpty }
            .joined(separator: " · ")
    }
}

/// Un anunț din „Găsește meci”: cineva mai caută jucători.
struct Meci: Codable, Identifiable, Sendable {
    let id: String
    let sport: Sport
    let oras: String
    let inceput: Date
    let locatie: String?
    let format: String?
    let jucatoriNecesari: Int
    let jucatoriAlaturati: Int
    let nivel: String?
    let descriere: String?
    let organizator: PersoanaScurta
    /// Doar pentru cei alăturați, dacă organizatorul l-a arătat.
    let telefonOrganizator: String?
    let esteAlMeu: Bool
    let mAmAlaturat: Bool
    /// „CERERE”, „ACCEPTAT”, „RESPINS” sau nil dacă n-ai cerut.
    var cerereaMea: String?
    /// Cei acceptați în echipă.
    let jucatori: [JucatorInMeci]
    /// Doar pentru organizator: cine vrea să vină și așteaptă răspuns.
    var cereri: [JucatorInMeci]?

    var ramase: Int { max(0, jucatoriNecesari - jucatoriAlaturati) }
}

/// Un jucător care a ales să apară în căutare. Fără email sau telefon.
struct JucatorPublic: Codable, Identifiable, Sendable {
    let id: String
    let nume: String
    let poza: String?
    let oras: String?
    let sporturi: [Sport]
    let nivel: String?
}

/// „Caută echipă”: un jucător care vrea să joace.
struct AnuntJucator: Codable, Identifiable, Sendable {
    struct Invitatie: Codable, Identifiable, Sendable {
        let id: String
        let nume: String
        let poza: String?
        let telefon: String?
        let mesaj: String?
    }
    let id: String
    let sport: Sport
    let oras: String
    let pozitii: [String]
    let nivel: String?
    let descriere: String?
    /// 1 = luni … 7 = duminică; goală = oricând.
    var zile: [Int]?
    var oraDe: Int?
    var oraPana: Int?
    let jucator: PersoanaScurta
    let esteAlMeu: Bool
    let lAmInvitat: Bool
    /// Doar jucătorul o oprește. Lipsește pe serverele mai vechi.
    var primesteInvitatii: Bool?
    let telefonJucator: String?
    let invitatii: [Invitatie]
}

extension AnuntJucator {
    static let zileScurte = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"]

    /// „Vin, Sâm, Dum · 18:00–22:00”, sau nil dacă n-a spus nimic.
    var disponibilitate: String? {
        let z = (zile ?? []).sorted()
        let parteZile: String? = switch z {
        case []: nil
        case [1, 2, 3, 4, 5, 6, 7]: "Zilnic"
        case [1, 2, 3, 4, 5]: "Luni–vineri"
        case [6, 7]: "Weekend"
        default: z.compactMap { (1...7).contains($0) ? Self.zileScurte[$0 - 1] : nil }.joined(separator: ", ")
        }
        let parteOre: String? = if let oraDe, let oraPana {
            String(format: "%02d:00–%02d:00", oraDe, oraPana)
        } else { nil }
        let parti = [parteZile, parteOre].compactMap { $0 }
        return parti.isEmpty ? nil : parti.joined(separator: " · ")
    }
}

extension Sport {
    /// Pozițiile din fiecare sport (aceleași ca pe server).
    var pozitii: [String] {
        switch self {
        case .fotbal: ["Portar", "Fundaș", "Mijlocaș", "Atacant"]
        case .baschet: ["Conducător", "Extremă", "Pivot"]
        case .handbal: ["Portar", "Extremă", "Inter", "Centru", "Pivot"]
        case .volei: ["Ridicător", "Trăgător", "Central", "Libero"]
        default: []
        }
    }
}

enum NivelJoc {
    static func eticheta(_ cod: String?) -> String? {
        switch cod {
        case "INCEPATOR": "Începători"
        case "MEDIU": "Nivel mediu"
        case "AVANSAT": "Avansați"
        case "COMPETITIV": "Competitiv"
        default: nil
        }
    }
}

struct RaspunsAutentificare: Codable, Sendable {
    let token: String
    let utilizator: Utilizator
}

struct Teren: Codable, Identifiable, Sendable {
    let id: String
    let nume: String
    let sport: Sport
    let oras: String
    let adresa: String
    let descriere: String?
    let pretPeOra: Double
    let poze: [String]
    let facilitati: [String]
    /// Dimensiunea în jucători („5+1”, „3x3”…). Lipsește pe serverele mai vechi.
    var formate: [String]?
    let oraDeschidere: Int
    let oraInchidere: Int
    let telefonContact: String?
    let activ: Bool
    let notaMedie: Double?
    let numarRecenzii: Int
    /// Ce se poate adăuga peste prețul orei. Lipsește pe serverele mai vechi.
    var optiuni: [OptiuneTeren]?
    let favorit: Bool
}

struct Recenzie: Codable, Identifiable, Sendable {
    let id: String
    let nota: Int
    let comentariu: String?
    let raspunsProprietar: String?
    let autor: String
    let data: String
    let teren: String?
}

struct DetaliuTeren: Codable, Sendable {
    let teren: Teren
    let esteProprietar: Bool
    let recenzii: [Recenzie]
}

struct Interval: Codable, Sendable {
    let inceput: Date
    let sfarsit: Date
}

struct Disponibilitate: Codable, Sendable {
    let oraDeschidere: Int
    let oraInchidere: Int
    let ocupate: [Interval]
}

struct TerenScurt: Codable, Sendable {
    let id: String
    let nume: String
    let oras: String
    let oraDeschidere: Int
    let oraInchidere: Int
}

struct ClientRezervare: Codable, Sendable {
    let nume: String
    let telefon: String?
}

struct RecenzieRezervare: Codable, Sendable {
    let nota: Int
    let comentariu: String?
    let raspunsProprietar: String?
}

struct Rezervare: Codable, Identifiable, Sendable {
    let id: String
    let status: StatusRezervare
    let inceput: Date
    let sfarsit: Date
    let inceputPropus: Date?
    let sfarsitPropus: Date?
    let notaMutare: String?
    /// Când a fost făcută cererea. Lipsește pe serverele mai vechi.
    var creataLa: Date?
    let pretTotal: Double
    let observatii: String?
    let teren: TerenScurt
    let client: ClientRezervare?
    let recenzie: RecenzieRezervare?
}

struct Blocare: Codable, Identifiable, Sendable {
    let id: String
    let terenId: String
    let terenNume: String?
    let inceput: Date
    let sfarsit: Date
    let motiv: String?
    /// Completat când intervalul e o rezervare notată manual, nu o blocare.
    let clientNume: String?
    let clientTelefon: String?
    /// Prezent când blocarea face parte dintr-o serie săptămânală.
    var serieId: String?
}

struct TerenStatistic: Codable, Identifiable, Sendable {
    let id: String
    let nume: String
    let activ: Bool
    let rezervari: Int
}

struct OraDeVarf: Codable, Identifiable, Sendable {
    let ora: Int
    let rezervari: Int
    var id: Int { ora }
}

struct Statistici: Codable, Sendable {
    let venitLunaCurenta: Int
    let totalRezervari: Int
    let inAsteptare: Int
    let oreOcupate: Int
    let gradOcupare: Int
    let terenuri: [TerenStatistic]
    let oreDeVarf: [OraDeVarf]
}

struct StareFavorit: Codable, Sendable {
    let favorit: Bool
}

struct OrasDisponibil: Codable, Identifiable, Sendable {
    let oras: String
    let terenuri: Int
    var id: String { oras }
}
