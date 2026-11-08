import SwiftUI

struct PersonalTabView: View {
    #if DEBUG
    /// Deschide direct rezervarea unui teren, pentru verificări automate.
    @State private var terenDebug: String? =
        ProcessInfo.processInfo.environment["SCORER_REZERVA"]
    @State private var terenIncarcat: Teren?
    /// Deschide direct foaia de autentificare, pentru verificări automate.
    @State private var arataAutentificarea =
        ProcessInfo.processInfo.environment["SCORER_AUTENTIFICARE"] == "1"
    #endif

    var body: some View {
        TabView {
            Tab("Caută", systemImage: "magnifyingglass") {
                NavigationStack { CautaTerenuriView() }
            }
            Tab("Favorite", systemImage: "heart") {
                NavigationStack { FavoriteView() }
            }
            Tab("Rezervări", systemImage: "calendar") {
                NavigationStack { RezervarileMeleView() }
            }
            Tab("Cont", systemImage: "person") {
                NavigationStack { ContView() }
            }
        }
        #if DEBUG
        .sheet(isPresented: $arataAutentificarea) { AutentificareView() }
        .sheet(item: Binding(
            get: { terenIncarcat },
            set: { _ in terenIncarcat = nil }
        )) { teren in
            NavigationStack {
                RezervaView(
                    teren: teren,
                    ziInitiala: Calendar.current.date(byAdding: .day, value: 1, to: Date()),
                    oraInitiala: ProcessInfo.processInfo.environment["SCORER_ORA"].flatMap(Int.init)
                ) {}
            }
        }
        .task {
            guard let id = terenDebug else { return }
            let detaliu: DetaliuTeren? = try? await ApiClient.shared.cere(
                "terenuri/\(id)", ca: DetaliuTeren.self
            )
            terenIncarcat = detaliu?.teren
        }
        #endif
    }
}

struct ContView: View {
    @Environment(Sesiune.self) private var sesiune
    @Environment(\.dismiss) private var inchide

    @State private var arataStergerea = false
    @State private var deSchimbat: SchimbareCont?

    var body: some View {
        ZStack {
            Tema.fundal.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 18) {
                    if let utilizator = sesiune.utilizator {
                        antet(utilizator)
                        securitate(utilizator)
                        profil(utilizator)
                        actiuni
                    } else {
                        CereCont(
                            simbol: "person.crop.circle",
                            titlu: "Nu ești conectat",
                            detaliu: "Poți răsfoi terenurile liber. Pentru rezervări și favorite ai nevoie de un cont Personal, iar dacă ai terenuri, de unul Business."
                        )
                        .fisa()
                    }
                }
                .padding(.horizontal, Tema.spatiu)
                .padding(.vertical, 8)
                .padding(.bottom, 24)
            }
        }
        .navigationTitle("Contul meu")
        .sheet(isPresented: $arataStergerea) {
            NavigationStack { StergeContulView() }
                .presentationDetents([.height(380)])
        }
        .sheet(item: $deSchimbat) { schimbare in
            NavigationStack { SchimbaDateView(tip: schimbare) }
        }
    }

    // MARK: Antet

    private func antet(_ u: Utilizator) -> some View {
        let initiale = u.nume.split(separator: " ").prefix(2).compactMap(\.first).map { String($0).uppercased() }.joined()
        return HStack(spacing: 16) {
            Text(initiale.isEmpty ? "?" : initiale)
                .font(.system(size: 26, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .frame(width: 68, height: 68)
                .background(.white.opacity(0.16), in: .rect(cornerRadius: 20, style: .continuous))
                .overlay { RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(.white.opacity(0.3)) }

            VStack(alignment: .leading, spacing: 5) {
                Text(u.nume).font(.title3.weight(.semibold)).lineLimit(1)
                Text(u.email).font(.subheadline).opacity(0.85).lineLimit(1)
                HStack(spacing: 6) {
                    Label(u.rol == .business ? "Business" : "Personal",
                          systemImage: u.rol == .business ? "building.2.fill" : "person.fill")
                    if let din = u.membruDin {
                        Text("· din \(din.formatted(.dateTime.month(.wide).year().locale(.aplicatie)))")
                    }
                }
                .font(.caption.weight(.medium))
                .opacity(0.9)
                .padding(.top, 2)
            }
            Spacer(minLength: 0)
        }
        .foregroundStyle(.white)
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(LinearGradient(colors: [Color(red: 0.055, green: 0.42, blue: 0.227), Color(red: 0.184, green: 0.647, blue: 0.376)],
                                     startPoint: .topLeading, endPoint: .bottomTrailing))
                .overlay(alignment: .topTrailing) {
                    Circle().fill(.white.opacity(0.1)).frame(width: 160).blur(radius: 30).offset(x: 50, y: -60)
                }
                .clipShape(.rect(cornerRadius: 26, style: .continuous))
        }
        .shadow(color: Tema.accent.opacity(0.25), radius: 18, y: 10)
    }

    // MARK: Contact și securitate

    private func securitate(_ u: Utilizator) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.shield.fill").foregroundStyle(Tema.accent)
                Text("Contact și securitate")
            }
            .font(.headline)
                .padding(.bottom, 4)
            Text("Orice schimbare cere parola actuală și un cod primit pe email.")
                .font(.footnote).foregroundStyle(.secondary)
                .padding(.bottom, 10)

            rand("Email", u.email, "envelope.fill", .email)
            Divider().padding(.leading, 56)
            rand("Telefon", (u.telefon?.isEmpty == false) ? u.telefon! : "Nesetat", "phone.fill", .telefon)
            Divider().padding(.leading, 56)
            rand("Parolă", "••••••••••", "key.fill", .parola)
        }
        .fisa()
    }

    private func rand(_ eticheta: String, _ valoare: String, _ simbol: String, _ tip: SchimbareCont) -> some View {
        Button { deSchimbat = tip } label: {
            HStack(spacing: 14) {
                Image(systemName: simbol)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Tema.accent)
                    .frame(width: 42, height: 42)
                    .background(Tema.accent.opacity(0.12), in: .rect(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(eticheta).font(.footnote).foregroundStyle(.secondary)
                    Text(valoare).font(.body.weight(.medium)).foregroundStyle(.primary).lineLimit(1)
                }
                Spacer(minLength: 8)
                Text("Schimbă")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Tema.accent)
                    .padding(.horizontal, 12).padding(.vertical, 7)
                    .background(Tema.accent.opacity(0.1), in: .capsule)
            }
            .padding(.vertical, 10)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }

    // MARK: Profil

    @ViewBuilder
    private func profil(_ u: Utilizator) -> some View {
        let randuri: [(String, String)] = [
            ("Oraș", u.oras ?? ""),
            ("Firmă", u.numeFirma ?? ""),
            ("Sporturi", (u.sporturi ?? []).map(\.eticheta).joined(separator: ", ")),
        ].filter { !$0.1.isEmpty }
        if !randuri.isEmpty {
            VStack(alignment: .leading, spacing: 14) {
                Text("Profil").font(.headline)
                ForEach(randuri, id: \.0) { eticheta, valoare in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(eticheta).font(.footnote).foregroundStyle(.secondary)
                        Text(valoare).font(.body.weight(.medium))
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .fisa()
        }
    }

    // MARK: Acțiuni

    private var actiuni: some View {
        VStack(spacing: 12) {
            Button {
                Task { await sesiune.deconecteaza() }
                inchide()
            } label: {
                Label("Deconectare", systemImage: "rectangle.portrait.and.arrow.right")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(Tema.fisa, in: .rect(cornerRadius: 16, style: .continuous))
                    .overlay { RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Color.primary.opacity(0.08)) }
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 8) {
                Text("Zonă periculoasă").font(.footnote.weight(.semibold)).foregroundStyle(Tema.ocupat)
                Text(sesiune.esteBusiness
                     ? "Se șterg definitiv contul, terenurile publicate și istoricul rezervărilor."
                     : "Se șterg definitiv contul, rezervările, favoritele și recenziile tale.")
                    .font(.footnote).foregroundStyle(.secondary)
                Button("Șterge contul", role: .destructive) { arataStergerea = true }
                    .font(.subheadline.weight(.semibold))
                    .padding(.top, 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(Tema.ocupat.opacity(0.06), in: .rect(cornerRadius: 16, style: .continuous))
            .overlay { RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Tema.ocupat.opacity(0.2)) }
        }
    }
}

/// Ștergerea contului cere parola din nou: nu se poate desface, iar un telefon
/// lăsat deblocat pe masă n-ar trebui să fie de ajuns.
private struct StergeContulView: View {
    @Environment(Sesiune.self) private var sesiune
    @Environment(\.dismiss) private var inchide

    @State private var parola = ""
    @State private var confirmare = ""
    @State private var eroare: String?
    @State private var seSterge = false

    private let cuvant = "STERGE"

    private var gata: Bool {
        !parola.isEmpty && confirmare.trimmingCharacters(in: .whitespaces).uppercased() == cuvant
    }

    var body: some View {
        Form {
            Section {
                SecureField("Parola contului", text: $parola)
                    .textContentType(.password)
                TextField("Scrie \(cuvant)", text: $confirmare)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
            } footer: {
                Text("Operațiunea nu poate fi anulată, iar datele nu pot fi recuperate.")
            }

            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }

            Section {
                Button(role: .destructive) {
                    sterge()
                } label: {
                    HStack {
                        Spacer()
                        if seSterge { ProgressView() } else { Text("Șterge definitiv").fontWeight(.semibold) }
                        Spacer()
                    }
                }
                .disabled(!gata || seSterge)
            }
        }
        .navigationTitle("Ștergi contul?")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } }
        }
    }

    private func sterge() {
        eroare = nil
        seSterge = true
        Task {
            defer { seSterge = false }
            do {
                try await sesiune.stergeContul(parola: parola)
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}
