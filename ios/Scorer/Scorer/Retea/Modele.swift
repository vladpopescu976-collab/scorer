import Foundation

// Formele întoarse de /api/mobil. Numele câmpurilor sunt identice cu cele din
// JSON, ca să nu fie nevoie de CodingKeys.

enum Rol: String, Codable, Sendable {
    case personal = "PERSONAL"
    case business = "BUSINESS"
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
