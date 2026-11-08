import SwiftUI

/// Plata cu cardul — DOAR DEMONSTRATIV. Nu există încă un procesator de plăți:
/// datele cardului rămân în memoria ecranului, nu se trimit nicăieri și nimic
/// nu se debitează. Când se conectează Stripe sau Netopia, ecranul acesta se
/// înlocuiește cu foaia lor securizată (sau Apple Pay).
enum MetodaPlata: String, CaseIterable, Identifiable {
    case card, teren
    var id: String { rawValue }
    var titlu: String { self == .card ? "Card online" : "La teren" }
    var detaliu: String { self == .card ? "Plătești acum, rezervarea e garantată" : "Numerar sau card, la sosire" }
    var simbol: String { self == .card ? "creditcard.fill" : "banknote.fill" }
}

struct AlegeMetodaPlata: View {
    @Binding var metoda: MetodaPlata

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Plata").font(.subheadline.weight(.medium))
            HStack(spacing: 10) {
                ForEach(MetodaPlata.allCases) { optiune in
                    let ales = metoda == optiune
                    Button { withAnimation(.snappy) { metoda = optiune } } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Image(systemName: optiune.simbol)
                                .font(.system(size: 18))
                                .foregroundStyle(ales ? Tema.accent : .secondary)
                            Text(optiune.titlu).font(.subheadline.weight(.semibold))
                            Text(optiune.detaliu).font(.caption).foregroundStyle(.secondary)
                                .multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                        .background(ales ? Tema.accent.opacity(0.08) : Tema.fisa, in: .rect(cornerRadius: 16, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .strokeBorder(ales ? Tema.accent : Color.primary.opacity(0.1), lineWidth: ales ? 1.5 : 1)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .fisa()
    }
}

struct PlataCardView: View {
    let suma: Double
    /// Chemat după plata simulată: aici se trimite rezervarea.
    let laPlata: () -> Void

    @Environment(\.dismiss) private var inchide
    @State private var numar = ""
    @State private var nume = ""
    @State private var expira = ""
    @State private var cvc = ""
    @State private var stare = Stare.formular
    @State private var eroare: String?
    @FocusState private var camp: Camp?

    enum Stare { case formular, procesare, gata }
    enum Camp { case numar, nume, expira, cvc }

    private var cifre: String { numar.filter(\.isNumber) }
    private var intors: Bool { camp == .cvc }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                cardVizual
                switch stare {
                case .formular: formular
                case .procesare:
                    VStack(spacing: 12) {
                        ProgressView().controlSize(.large)
                        Text("Se procesează plata…").foregroundStyle(.secondary)
                    }
                    .padding(.top, 20)
                case .gata:
                    VStack(spacing: 12) {
                        SuccesAnimat(simbol: "checkmark")
                        Text("Plata a fost acceptată").font(.headline)
                    }
                    .padding(.top, 20)
                }
            }
            .padding(20)
            .animation(.snappy, value: stare)
        }
        .background(Tema.fundal.ignoresSafeArea())
        .navigationTitle("Plată cu cardul")
        .navigationBarTitleDisplayMode(.inline)
        .interactiveDismissDisabled(stare != .formular)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Renunță") { inchide() }.disabled(stare != .formular)
            }
        }
    }

    // MARK: Cardul

    private var cardVizual: some View {
        ZStack {
            fataCardului.opacity(intors ? 0 : 1)
            spateleCardului.opacity(intors ? 1 : 0).rotation3DEffect(.degrees(180), axis: (0, 1, 0))
        }
        .rotation3DEffect(.degrees(intors ? 180 : 0), axis: (0, 1, 0), perspective: 0.5)
        .animation(.spring(response: 0.6, dampingFraction: 0.8), value: intors)
        .aspectRatio(1.586, contentMode: .fit)
        .frame(maxWidth: 360)
        .shadow(color: Tema.accent.opacity(0.35), radius: 18, y: 10)
    }

    private var fundalCard: some View {
        RoundedRectangle(cornerRadius: 20, style: .continuous)
            .fill(LinearGradient(colors: [Color(red: 0.055, green: 0.42, blue: 0.227), Color(red: 0.184, green: 0.647, blue: 0.376)],
                                 startPoint: .topLeading, endPoint: .bottomTrailing))
    }

    private var fataCardului: some View {
        fundalCard.overlay(alignment: .topLeading) {
            VStack(alignment: .leading) {
                HStack {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(LinearGradient(colors: [.yellow.opacity(0.6), .orange.opacity(0.7)], startPoint: .top, endPoint: .bottom))
                        .frame(width: 44, height: 32)
                    Spacer()
                    Text(marca).font(.subheadline.weight(.heavy)).italic()
                }
                Spacer()
                Text(grupe).font(.system(size: 21, weight: .medium, design: .monospaced)).minimumScaleFactor(0.7).lineLimit(1)
                Spacer()
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("TITULAR").font(.caption2).opacity(0.7)
                        Text(nume.isEmpty ? "Nume Prenume" : nume).font(.subheadline.weight(.medium)).lineLimit(1)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("EXPIRĂ").font(.caption2).opacity(0.7)
                        Text(expira.isEmpty ? "LL/AA" : expira).font(.system(.subheadline, design: .monospaced))
                    }
                }
            }
            .foregroundStyle(.white)
            .padding(20)
        }
    }

    private var spateleCardului: some View {
        fundalCard.overlay(alignment: .top) {
            VStack(spacing: 16) {
                Rectangle().fill(.black.opacity(0.7)).frame(height: 42).padding(.top, 24)
                HStack {
                    Spacer()
                    Text(cvc.isEmpty ? "•••" : cvc)
                        .font(.system(.body, design: .monospaced))
                        .foregroundStyle(.black)
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .background(.white.opacity(0.9), in: .rect(cornerRadius: 4))
                }
                .padding(.horizontal, 20)
            }
        }
    }

    private var grupe: String {
        let completat = cifre.padding(toLength: 16, withPad: "•", startingAt: 0)
        return stride(from: 0, to: 16, by: 4).map { i in
            String(completat[completat.index(completat.startIndex, offsetBy: i)..<completat.index(completat.startIndex, offsetBy: i + 4)])
        }.joined(separator: " ")
    }

    private var marca: String {
        if cifre.hasPrefix("4") { return "VISA" }
        if let doi = Int(cifre.prefix(2)), (51...55).contains(doi) || (22...27).contains(doi) { return "mastercard" }
        if cifre.hasPrefix("34") || cifre.hasPrefix("37") { return "AMEX" }
        return ""
    }

    // MARK: Formular

    private var formular: some View {
        VStack(spacing: 16) {
            CampAuth(titlu: "Numărul cardului", simbol: "creditcard", text: $numar, tipTastatura: .numberPad,
                     exemplu: "1234 5678 9012 3456")
                .focused($camp, equals: .numar)
                .onChange(of: numar) { _, nou in
                    let c = String(nou.filter(\.isNumber).prefix(16))
                    let formatat = stride(from: 0, to: c.count, by: 4).map { i -> String in
                        let start = c.index(c.startIndex, offsetBy: i)
                        return String(c[start..<c.index(start, offsetBy: min(4, c.count - i))])
                    }.joined(separator: " ")
                    if formatat != nou { numar = formatat }
                }
            CampAuth(titlu: "Numele de pe card", simbol: "person", text: $nume, exemplu: "Ion Popescu")
                .focused($camp, equals: .nume)
            HStack(spacing: 12) {
                CampAuth(titlu: "Expiră", simbol: "calendar", text: $expira, tipTastatura: .numberPad, exemplu: "LL/AA")
                    .focused($camp, equals: .expira)
                    .onChange(of: expira) { _, nou in
                        let c = String(nou.filter(\.isNumber).prefix(4))
                        let formatat = c.count > 2 ? "\(c.prefix(2))/\(c.dropFirst(2))" : c
                        if formatat != nou { expira = formatat }
                    }
                CampAuth(titlu: "CVC", simbol: "lock", text: $cvc, tipTastatura: .numberPad, exemplu: "123")
                    .focused($camp, equals: .cvc)
                    .onChange(of: cvc) { _, nou in
                        let c = String(nou.filter(\.isNumber).prefix(4))
                        if c != nou { cvc = c }
                    }
            }

            if let eroare {
                Text(eroare).font(.footnote).foregroundStyle(Tema.ocupat).frame(maxWidth: .infinity, alignment: .leading)
            }

            ButonPrincipal(titlu: "Plătește \(Int(suma)) RON", simbol: "lock.fill") { plateste() }

            Label("Mod demonstrativ: cardul nu este debitat, iar datele nu sunt trimise nicăieri.", systemImage: "checkmark.shield.fill")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    // MARK: Plata simulată

    private func luhn(_ s: String) -> Bool {
        var suma = 0
        for (i, ch) in s.reversed().enumerated() {
            guard var c = ch.wholeNumberValue else { return false }
            if i % 2 == 1 { c *= 2; if c > 9 { c -= 9 } }
            suma += c
        }
        return s.count >= 13 && suma % 10 == 0
    }

    private func plateste() {
        eroare = nil
        let parti = expira.split(separator: "/").compactMap { Int($0) }
        let acum = Calendar.current.dateComponents([.year, .month], from: Date())
        let expirat = parti.count != 2 || !(1...12).contains(parti[0])
            || (2000 + parti[1], parti[0]) < (acum.year ?? 0, acum.month ?? 0)
        guard luhn(cifre) else { eroare = "Numărul cardului nu este valid."; return }
        guard nume.trimmingCharacters(in: .whitespaces).count >= 3 else { eroare = "Scrie numele de pe card."; return }
        guard !expirat else { eroare = "Data de expirare nu este validă."; return }
        guard (3...4).contains(cvc.count) else { eroare = "CVC-ul are 3 sau 4 cifre."; return }

        camp = nil
        stare = .procesare
        Task {
            try? await Task.sleep(for: .seconds(1.6))
            stare = .gata
            try? await Task.sleep(for: .seconds(1.1))
            // Datele cardului nu pleacă nicăieri: se trimite doar rezervarea.
            numar = ""; cvc = ""; expira = ""; nume = ""
            laPlata()
            inchide()
        }
    }
}
