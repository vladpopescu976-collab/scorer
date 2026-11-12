import SwiftUI
import PhotosUI

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

    enum TabAles: Hashable { case acasa, cauta, meciuri, rezervari, cont }

    @State private var tab = TabAles.acasa
    /// Ce a cerut „Acasă” de la Caută: un sport sau filtrele deschise.
    @State private var cerereCautare: CerereCautare?

    var body: some View {
        TabView(selection: $tab) {
            Tab("Acasă", systemImage: "house", value: TabAles.acasa) {
                NavigationStack {
                    AcasaView { cerere in
                        cerereCautare = cerere
                        tab = .cauta
                    }
                }
                .intrarePagina(.clarificare)
            }
            Tab("Caută", systemImage: "magnifyingglass", value: TabAles.cauta) {
                NavigationStack { CautaTerenuriView(cerere: $cerereCautare) }
                    .intrarePagina(.ridicare)
            }
            // Favoritele s-au mutat în Cont, ca bara de jos să aibă loc de Meciuri.
            Tab("Meciuri", systemImage: "figure.run", value: TabAles.meciuri) {
                NavigationStack { MeciuriView() }
                    .intrarePagina(.apropiere)
            }
            Tab("Rezervări", systemImage: "calendar", value: TabAles.rezervari) {
                NavigationStack { RezervarileMeleView() }
                    .intrarePagina(.glisare)
            }
            Tab("Cont", systemImage: "person", value: TabAles.cont) {
                NavigationStack { ContView() }
                    .intrarePagina(.clarificare)
            }
        }
        .environment(\.deschideCont, { tab = .cont })
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
    @State private var pozaAleasa: PhotosPickerItem?
    @State private var arataAlegerea = false
    @State private var arataOptiuniPoza = false
    @State private var seIncarcaPoza = false
    @State private var eroarePoza: String?
    @State private var pozaSchimbata = 0

    var body: some View {
        ZStack {
            Tema.fundal.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 30) {
                    if let utilizator = sesiune.utilizator {
                        antet(utilizator)
                        sectiune("Date de contact") {
                            rand("Email", u: utilizator.email, simbol: "envelope.fill") { deSchimbat = .email }
                            separator
                            rand("Telefon", u: (utilizator.telefon?.isEmpty == false) ? utilizator.telefon! : "Adaugă un număr",
                                 simbol: "phone.fill") { deSchimbat = .telefon }
                        }
                        sectiune("Securitate", nota: "Orice schimbare cere parola actuală și un cod primit pe email.") {
                            rand("Parolă", u: "••••••••••", simbol: "lock.fill") { deSchimbat = .parola }
                        }
                        if !sesiune.esteBusiness {
                            sectiune("Activitate") {
                                NavigationLink { FavoriteView() } label: {
                                    HStack(spacing: 14) {
                                        Image(systemName: "heart.fill")
                                            .font(.system(size: 15, weight: .semibold))
                                            .foregroundStyle(.pink)
                                            .frame(width: 40, height: 40)
                                            .background(Color.pink.opacity(0.1), in: .rect(cornerRadius: 12, style: .continuous))
                                        Text("Terenuri favorite").font(.body.weight(.medium)).foregroundStyle(.primary)
                                        Spacer(minLength: 8)
                                        Image(systemName: "chevron.right")
                                            .font(.footnote.weight(.semibold))
                                            .foregroundStyle(.tertiary)
                                    }
                                    .padding(.vertical, 14)
                                    .contentShape(.rect)
                                }
                                .buttonStyle(.plain)
                            }
                        }
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
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 40)
            }
        }
        .navigationTitle("Contul meu")
        .navigationBarTitleDisplayMode(.inline)
        .photosPicker(isPresented: $arataAlegerea, selection: $pozaAleasa, matching: .images)
        .confirmationDialog("Poza de profil", isPresented: $arataOptiuniPoza, titleVisibility: .visible) {
            Button("Alege din galerie") { arataAlegerea = true }
            if sesiune.utilizator?.poza != nil {
                Button("Scoate poza", role: .destructive) { scoatePoza() }
            }
        }
        .onChange(of: pozaAleasa) { _, noua in
            guard let noua else { return }
            incarca(noua)
        }
        .sensoryFeedback(.success, trigger: pozaSchimbata)
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
        VStack(spacing: 14) {
            Button {
                if u.poza == nil { arataAlegerea = true } else { arataOptiuniPoza = true }
            } label: {
                ZStack(alignment: .bottomTrailing) {
                    AvatarUtilizator(utilizator: u, marime: 112)
                        .overlay {
                            if seIncarcaPoza {
                                Circle().fill(.black.opacity(0.35))
                                ProgressView().tint(.white)
                            }
                        }
                        .overlay { Circle().strokeBorder(.white, lineWidth: 4) }
                        .shadow(color: .black.opacity(0.08), radius: 2, y: 1)
                        .shadow(color: Tema.accent.opacity(0.25), radius: 18, y: 10)

                    Image(systemName: "camera.fill")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .background(Tema.gradientAccent, in: .circle)
                        .overlay { Circle().strokeBorder(Tema.fundal, lineWidth: 3) }
                        .offset(x: 2, y: 2)
                }
            }
            .buttonStyle(.plain)
            .disabled(seIncarcaPoza)
            .accessibilityLabel(u.poza == nil ? "Adaugă o poză de profil" : "Schimbă poza de profil")

            VStack(spacing: 5) {
                Text(u.nume)
                    .font(.system(size: 26, weight: .bold))
                    .tracking(-0.5)
                    .multilineTextAlignment(.center)
                Text(u.email)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            HStack(spacing: 8) {
                Label(u.rol == .business ? "Cont Business" : "Cont Personal",
                      systemImage: u.rol == .business ? "building.2.fill" : "person.fill")
                if let din = u.membruDin {
                    Text("·")
                    Text("din \(din.formatted(.dateTime.month(.wide).year().locale(.aplicatie).inRomania))")
                }
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(Tema.accent)
            .padding(.horizontal, 14)
            .padding(.vertical, 7)
            .background(Tema.accent.opacity(0.1), in: .capsule)

            if u.poza == nil && !seIncarcaPoza {
                Text("Atinge cercul ca să-ți pui o poză.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            if let eroarePoza {
                Text(eroarePoza)
                    .font(.footnote)
                    .foregroundStyle(Tema.ocupat)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 10)
    }

    // MARK: Secțiuni

    private func sectiune<Continut: View>(
        _ titlu: String, nota: String? = nil, @ViewBuilder continut: () -> Continut
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(titlu.uppercased())
                .font(.caption.weight(.semibold))
                .tracking(0.8)
                .foregroundStyle(.secondary)
                .padding(.leading, 6)
            VStack(spacing: 0) { continut() }
                .padding(.horizontal, 16)
                .background(Tema.fisa, in: .rect(cornerRadius: 22, style: .continuous))
                .shadow(color: .black.opacity(0.03), radius: 1, y: 1)
                .shadow(color: .black.opacity(0.05), radius: 14, y: 6)
            if let nota {
                Text(nota)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 6)
            }
        }
    }

    private var separator: some View {
        Divider().padding(.leading, 54)
    }

    private func rand(_ eticheta: String, u valoare: String, simbol: String, actiune: (() -> Void)? = nil) -> some View {
        let continut = HStack(spacing: 14) {
            Image(systemName: simbol)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Tema.accent)
                .frame(width: 40, height: 40)
                .background(Tema.accent.opacity(0.1), in: .rect(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(eticheta).font(.footnote).foregroundStyle(.secondary)
                Text(valoare).font(.body.weight(.medium)).foregroundStyle(.primary).lineLimit(1)
            }
            Spacer(minLength: 8)
            if actiune != nil {
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 14)
        .contentShape(.rect)

        return Group {
            if let actiune {
                Button(action: actiune) { continut }.buttonStyle(.plain)
            } else {
                continut
            }
        }
    }

    @ViewBuilder
    private func profil(_ u: Utilizator) -> some View {
        let randuri: [(String, String, String)] = [
            ("Oraș", u.oras ?? "", "mappin.and.ellipse"),
            ("Firmă", u.numeFirma ?? "", "building.2.fill"),
            ("Sporturi", (u.sporturi ?? []).map(\.eticheta).joined(separator: ", "), "figure.run"),
        ].filter { !$0.1.isEmpty }
        if !randuri.isEmpty {
            sectiune("Profil") {
                ForEach(Array(randuri.enumerated()), id: \.offset) { index, rand in
                    if index > 0 { separator }
                    self.rand(rand.0, u: rand.1, simbol: rand.2)
                }
            }
        }
    }

    // MARK: Acțiuni

    private var actiuni: some View {
        VStack(spacing: 18) {
            Button {
                Task { await sesiune.deconecteaza() }
                inchide()
            } label: {
                Label("Deconectare", systemImage: "rectangle.portrait.and.arrow.right")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.primary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(Tema.fisa, in: .rect(cornerRadius: 18, style: .continuous))
                    .shadow(color: .black.opacity(0.05), radius: 12, y: 5)
            }
            .buttonStyle(.plain)

            Button("Șterge contul") { arataStergerea = true }
                .font(.footnote.weight(.medium))
                .foregroundStyle(Tema.ocupat)
        }
        .padding(.top, 4)
    }

    // MARK: Poza

    private func incarca(_ element: PhotosPickerItem) {
        eroarePoza = nil
        seIncarcaPoza = true
        Task {
            defer {
                seIncarcaPoza = false
                pozaAleasa = nil
            }
            do {
                guard let date = try await element.loadTransferable(type: Data.self),
                      let pregatita = PozaProfil.pregateste(date)
                else {
                    eroarePoza = "Poza nu a putut fi citită. Încearcă alta."
                    return
                }
                try await sesiune.schimbaPoza(pregatita)
                pozaSchimbata += 1
            } catch {
                eroarePoza = error.localizedDescription
            }
        }
    }

    private func scoatePoza() {
        eroarePoza = nil
        seIncarcaPoza = true
        Task {
            defer { seIncarcaPoza = false }
            do {
                try await sesiune.stergePoza()
            } catch {
                eroarePoza = error.localizedDescription
            }
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
