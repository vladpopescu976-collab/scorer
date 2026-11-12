import SwiftUI

/// „Găsește meci”: anunțuri ale celor care mai au nevoie de jucători, după
/// oraș și sport. Te alături cu un tap sau pui tu un anunț.
struct MeciuriView: View {
    @Environment(Sesiune.self) private var sesiune

    @State private var meciuri: [Meci] = []
    @State private var oras = ""
    @State private var sport: Sport?
    @State private var seIncarca = true
    @State private var eroare: String?
    @State private var arataAnunt = false
    @State private var arataAutentificarea = false
    @State private var inLucru: String?

    private let sporturi: [Sport] = [.fotbal, .baschet, .tenis, .padel, .volei, .handbal, .badminton]
    private var estePersonal: Bool { sesiune.esteConectat && !sesiune.esteBusiness }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                antet
                lista
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .background(Tema.fundal.ignoresSafeArea())
        .navigationTitle("Găsește meci")
        .navigationBarTitleDisplayMode(.large)
        .navigationDestination(for: String.self) { _ in JucatoriView(orasInitial: oras) }
        .sheet(isPresented: $arataAnunt) {
            NavigationStack {
                PosteazaMeciView(orasInitial: oras.isEmpty ? (sesiune.utilizator?.oras ?? "") : oras) {
                    Task { await incarca() }
                }
            }
        }
        .sheet(isPresented: $arataAutentificarea) { AutentificareView() }
        .task {
            if oras.isEmpty, let din = sesiune.utilizator?.oras { oras = din }
            await incarca()
        }
        .refreshable { await incarca() }
    }

    // MARK: - Antet

    private var antet: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Alege orașul și vezi cine mai are nevoie de jucători.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack(spacing: 10) {
                Image(systemName: "mappin.and.ellipse").foregroundStyle(Tema.accent)
                TextField("Orașul tău, ex. Timișoara", text: $oras)
                    .submitLabel(.search)
                    .onSubmit { Task { await incarca() } }
                if !oras.isEmpty {
                    Button { oras = ""; Task { await incarca() } } label: {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(.tertiary)
                    }
                }
            }
            .padding(.horizontal, 16)
            .frame(height: 50)
            .background(Tema.fisa, in: .capsule)
            .shadow(color: .black.opacity(0.06), radius: 12, y: 5)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    cip("Toate", activ: sport == nil) { sport = nil }
                    ForEach(sporturi, id: \.self) { s in
                        cip(s.eticheta, activ: sport == s) { sport = sport == s ? nil : s }
                    }
                }
                .padding(.horizontal, 20)
            }
            .padding(.horizontal, -20)

            HStack(spacing: 10) {
                Button {
                    if estePersonal { arataAnunt = true } else { arataAutentificarea = true }
                } label: {
                    Label("Pune un anunț", systemImage: "plus")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 46)
                        .background(Tema.gradientAccent, in: .capsule)
                        .shadow(color: Tema.accent.opacity(0.3), radius: 10, y: 5)
                }
                NavigationLink(value: "jucatori") {
                    Label("Caută jucători", systemImage: "person.2.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Tema.accent)
                        .frame(maxWidth: .infinity)
                        .frame(height: 46)
                        .background(Tema.accent.opacity(0.1), in: .capsule)
                }
            }
            .buttonStyle(.plain)
        }
    }

    private func cip(_ text: String, activ: Bool, actiune: @escaping () -> Void) -> some View {
        Button {
            actiune()
            Task { await incarca() }
        } label: {
            Text(text)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(activ ? .white : .primary)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(activ ? AnyShapeStyle(Tema.accent) : AnyShapeStyle(Tema.fisa), in: .capsule)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Listă

    @ViewBuilder
    private var lista: some View {
        if seIncarca && meciuri.isEmpty {
            ForEach(0..<2, id: \.self) { _ in ScheletFisa(inaltime: 200) }
        } else if let eroare, meciuri.isEmpty {
            VStack(spacing: 10) {
                Text(eroare).font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
                Button("Reîncearcă") { Task { await incarca() } }.font(.subheadline.weight(.semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 30)
        } else if meciuri.isEmpty {
            VStack(spacing: 10) {
                Image(systemName: "trophy")
                    .font(.system(size: 26))
                    .foregroundStyle(Tema.accent)
                    .frame(width: 60, height: 60)
                    .background(Tema.accent.opacity(0.1), in: .circle)
                Text(oras.isEmpty ? "Niciun meci deocamdată" : "Niciun meci în \(oras)")
                    .font(.headline)
                Text("Fii primul: pune un anunț și ceilalți se pot alătura imediat.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 36)
        } else {
            Text("\(meciuri.count) \(meciuri.count == 1 ? "meci caută" : "meciuri caută") jucători")
                .font(.footnote)
                .foregroundStyle(.secondary)
            ForEach(Array(meciuri.enumerated()), id: \.element.id) { index, meci in
                card(meci).intrareElement(index)
            }
        }
    }

    private func card(_ meci: Meci) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label {
                    Text(meci.format.map { "\(meci.sport.eticheta) · \($0)" } ?? meci.sport.eticheta)
                } icon: {
                    Image(systemName: meci.sport.simbol)
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Tema.accent)
                .padding(.horizontal, 11)
                .padding(.vertical, 6)
                .background(Tema.accent.opacity(0.1), in: .capsule)
                Spacer()
                if let nivel = NivelJoc.eticheta(meci.nivel) {
                    Text(nivel).font(.caption).foregroundStyle(.secondary)
                }
            }

            VStack(alignment: .leading, spacing: 5) {
                Text(meci.inceput.formatted(.dateTime.weekday(.wide).day().month(.wide).hour().minute().locale(.aplicatie).inRomania).capitalized)
                    .font(.system(size: 18, weight: .semibold))
                Label(meci.locatie.map { "\($0), \(meci.oras)" } ?? meci.oras, systemImage: "mappin.and.ellipse")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if let descriere = meci.descriere {
                Text(descriere).font(.subheadline).foregroundStyle(.primary.opacity(0.8))
            }

            VStack(alignment: .leading, spacing: 7) {
                HStack {
                    Text(meci.ramase == 0 ? "Echipa e completă"
                         : meci.ramase == 1 ? "Mai trebuie un jucător" : "Mai trebuie \(meci.ramase) jucători")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(meci.ramase == 0 ? Color.secondary : Tema.accent)
                    Spacer()
                    Text("\(meci.jucatoriAlaturati)/\(meci.jucatoriNecesari)")
                        .font(.footnote.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
                GeometryReader { g in
                    Capsule().fill(Color.primary.opacity(0.07))
                        .overlay(alignment: .leading) {
                            Capsule().fill(Tema.gradientAccent)
                                .frame(width: g.size.width * min(1, CGFloat(meci.jucatoriAlaturati) / CGFloat(max(1, meci.jucatoriNecesari))))
                        }
                }
                .frame(height: 6)
            }

            Divider()

            HStack(spacing: 10) {
                AvatarPersoana(nume: meci.organizator.nume, poza: meci.organizator.poza, marime: 34)
                VStack(alignment: .leading, spacing: 1) {
                    Text(meci.organizator.nume).font(.subheadline.weight(.medium)).lineLimit(1)
                    Text("organizator").font(.caption).foregroundStyle(.secondary)
                }
                HStack(spacing: -8) {
                    ForEach(meci.jucatori.prefix(4)) { j in
                        AvatarPersoana(nume: j.nume, poza: j.poza, marime: 26)
                            .overlay { Circle().strokeBorder(Tema.fisa, lineWidth: 2) }
                    }
                }
                Spacer(minLength: 6)
                butonActiune(meci)
            }

            if let telefon = meci.telefonOrganizator,
               let url = URL(string: "tel:\(telefon.filter { $0.isNumber || $0 == "+" })") {
                Link(destination: url) {
                    Label("Sună organizatorul: \(telefon)", systemImage: "phone.fill")
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                        .background(Tema.accent.opacity(0.1), in: .rect(cornerRadius: 12, style: .continuous))
                        .foregroundStyle(Tema.accent)
                }
            }
        }
        .padding(18)
        .background(Tema.fisa, in: .rect(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 1, y: 1)
        .shadow(color: .black.opacity(0.07), radius: 18, y: 8)
    }

    @ViewBuilder
    private func butonActiune(_ meci: Meci) -> some View {
        let ocupat = inLucru == meci.id
        if meci.esteAlMeu {
            Button("Șterge", role: .destructive) { actiune(meci, "sterge") }
                .font(.subheadline.weight(.semibold))
                .disabled(ocupat)
        } else if meci.mAmAlaturat {
            Button("Ies") { actiune(meci, "iesi") }
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 14).padding(.vertical, 8)
                .background(Color.primary.opacity(0.06), in: .capsule)
                .buttonStyle(.plain)
                .disabled(ocupat)
        } else {
            Button {
                if estePersonal { actiune(meci, "alatura") } else { arataAutentificarea = true }
            } label: {
                Group {
                    if ocupat { ProgressView().tint(.white) } else { Text(meci.ramase == 0 ? "Complet" : "Mă alătur") }
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 16).padding(.vertical, 9)
                .background(meci.ramase == 0 ? AnyShapeStyle(Color.gray.opacity(0.4)) : AnyShapeStyle(Tema.gradientAccent), in: .capsule)
            }
            .buttonStyle(.plain)
            .disabled(ocupat || meci.ramase == 0)
        }
    }

    // MARK: - Date

    private func incarca() async {
        seIncarca = true
        defer { seIncarca = false }
        var parametri: [String: String] = [:]
        if !oras.trimmingCharacters(in: .whitespaces).isEmpty { parametri["oras"] = oras }
        if let sport { parametri["sport"] = sport.rawValue }
        do {
            let noi = try await ApiClient.shared.cere("meciuri", parametri: parametri, ca: [Meci].self)
            eroare = nil
            withAnimation(.smooth) { meciuri = noi }
        } catch {
            eroare = error.localizedDescription
        }
    }

    private func actiune(_ meci: Meci, _ tip: String) {
        inLucru = meci.id
        Task {
            defer { inLucru = nil }
            do {
                switch tip {
                case "alatura":
                    let actualizat = try await ApiClient.shared.cere("meciuri/\(meci.id)/alaturare", metoda: "POST", ca: Meci.self)
                    if let i = meciuri.firstIndex(where: { $0.id == meci.id }) {
                        withAnimation(.smooth) { meciuri[i] = actualizat }
                    }
                case "iesi":
                    try await ApiClient.shared.cereFaraRaspuns("meciuri/\(meci.id)/alaturare", metoda: "DELETE")
                    await incarca()
                default:
                    try await ApiClient.shared.cereFaraRaspuns("meciuri/\(meci.id)", metoda: "DELETE")
                    withAnimation(.smooth) { meciuri.removeAll { $0.id == meci.id } }
                }
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}

/// Formularul „Mai am nevoie de jucători”.
struct PosteazaMeciView: View {
    let orasInitial: String
    let laFinal: () -> Void

    @Environment(\.dismiss) private var inchide

    @State private var sport: Sport = .fotbal
    @State private var format: String?
    @State private var oras = ""
    @State private var inceput = Calendar.current.date(byAdding: .hour, value: 3, to: .now) ?? .now
    @State private var locatie = ""
    @State private var necesari = 2
    @State private var nivel = ""
    @State private var descriere = ""
    @State private var arataTelefon = true
    @State private var eroare: String?
    @State private var seTrimite = false

    var body: some View {
        Form {
            Section("Sport") {
                Picker("Sport", selection: $sport) {
                    ForEach(Sport.allCases.filter { $0 != .altele }, id: \.self) { s in
                        Label(s.eticheta, systemImage: s.simbol).tag(s)
                    }
                }
                if !sport.formate.isEmpty {
                    Picker("Dimensiune", selection: $format) {
                        Text("Oricare").tag(String?.none)
                        ForEach(sport.formate, id: \.cod) { f in Text(f.cod).tag(Optional(f.cod)) }
                    }
                }
            }
            Section("Când și unde") {
                DatePicker("Data și ora", selection: $inceput, in: Date()..., displayedComponents: [.date, .hourAndMinute])
                TextField("Oraș", text: $oras)
                TextField("Teren sau adresă (opțional)", text: $locatie)
            }
            Section {
                Stepper("Mai caut \(necesari) \(necesari == 1 ? "jucător" : "jucători")", value: $necesari, in: 1...30)
                Picker("Nivel", selection: $nivel) {
                    Text("Oricine").tag("")
                    Text("Începători").tag("INCEPATOR")
                    Text("Mediu").tag("MEDIU")
                    Text("Avansați").tag("AVANSAT")
                }
            }
            Section {
                TextField("Detalii (opțional)", text: $descriere, axis: .vertical).lineLimit(2...5)
                Toggle("Arată telefonul meu celor care se alătură", isOn: $arataTelefon)
            }
            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }
            Section {
                Button(action: trimite) {
                    HStack {
                        Spacer()
                        if seTrimite { ProgressView().tint(.white) } else { Text("Publică anunțul").fontWeight(.semibold) }
                        Spacer()
                    }
                }
                .listRowBackground(Tema.accent)
                .foregroundStyle(.white)
                .disabled(seTrimite)
            }
        }
        .navigationTitle("Pune un anunț")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } } }
        .onAppear { if oras.isEmpty { oras = orasInitial } }
        .onChange(of: sport) { format = nil }
    }

    private func trimite() {
        eroare = nil
        guard oras.trimmingCharacters(in: .whitespaces).count >= 2 else { eroare = "Scrie orașul."; return }
        struct Corp: Encodable {
            let sport: String
            let oras: String
            let inceput: Date
            let locatie: String?
            let format: String?
            let jucatoriNecesari: Int
            let nivel: String?
            let descriere: String?
            let arataTelefon: Bool
        }
        let corp = Corp(
            sport: sport.rawValue, oras: oras, inceput: inceput,
            locatie: locatie.isEmpty ? nil : locatie, format: format,
            jucatoriNecesari: necesari, nivel: nivel.isEmpty ? nil : nivel,
            descriere: descriere.isEmpty ? nil : descriere, arataTelefon: arataTelefon
        )
        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                try await ApiClient.shared.cereFaraRaspuns("meciuri", metoda: "POST", corp: corp)
                laFinal()
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}

/// „Caută jucători”: cei care au ales să fie găsiți, după oraș, nume și sport.
struct JucatoriView: View {
    let orasInitial: String

    @Environment(Sesiune.self) private var sesiune
    @State private var jucatori: [JucatorPublic] = []
    @State private var oras = ""
    @State private var nume = ""
    @State private var sport: Sport?
    @State private var seIncarca = true
    @State private var vizibil = false

    var body: some View {
        List {
            Section {
                TextField("Oraș", text: $oras).onSubmit { Task { await incarca() } }
                TextField("Nume (opțional)", text: $nume).onSubmit { Task { await incarca() } }
                Picker("Sport", selection: $sport) {
                    Text("Toate").tag(Sport?.none)
                    ForEach(Sport.allCases.filter { $0 != .altele }, id: \.self) { s in Text(s.eticheta).tag(Optional(s)) }
                }
                Button("Caută") { Task { await incarca() } }.fontWeight(.semibold)
            }

            if sesiune.esteConectat && !sesiune.esteBusiness {
                Section {
                    Toggle("Apar și eu în căutare", isOn: $vizibil)
                        .tint(Tema.accent)
                        .onChange(of: vizibil) { _, nou in
                            Task {
                                struct Corp: Encodable { let vizibil: Bool }
                                try? await ApiClient.shared.cereFaraRaspuns("eu/vizibilitate", metoda: "PUT", corp: Corp(vizibil: nou))
                                await sesiune.reincarcaProfil()
                            }
                        }
                } footer: {
                    Text("Ceilalți îți văd doar numele, poza, orașul, sporturile și nivelul.")
                }
            }

            Section {
                if seIncarca && jucatori.isEmpty {
                    ProgressView().frame(maxWidth: .infinity)
                } else if jucatori.isEmpty {
                    Text("Niciun jucător găsit. Apar aici doar cei care au ales asta.")
                        .font(.subheadline).foregroundStyle(.secondary)
                } else {
                    ForEach(jucatori) { j in
                        HStack(spacing: 14) {
                            AvatarPersoana(nume: j.nume, poza: j.poza, marime: 48)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(j.nume).font(.body.weight(.semibold))
                                Text([j.oras, NivelJoc.eticheta(j.nivel)].compactMap { $0 }.joined(separator: " · "))
                                    .font(.footnote).foregroundStyle(.secondary)
                                if !j.sporturi.isEmpty {
                                    Text(j.sporturi.map(\.eticheta).joined(separator: ", "))
                                        .font(.caption.weight(.medium)).foregroundStyle(Tema.accent)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            } header: {
                Text(jucatori.isEmpty ? "" : "\(jucatori.count) jucători")
            }
        }
        .navigationTitle("Caută jucători")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if oras.isEmpty { oras = orasInitial }
            vizibil = sesiune.utilizator?.vizibilInCautare ?? false
            await incarca()
        }
    }

    private func incarca() async {
        seIncarca = true
        defer { seIncarca = false }
        var parametri: [String: String] = [:]
        if !oras.trimmingCharacters(in: .whitespaces).isEmpty { parametri["oras"] = oras }
        if !nume.trimmingCharacters(in: .whitespaces).isEmpty { parametri["nume"] = nume }
        if let sport { parametri["sport"] = sport.rawValue }
        jucatori = (try? await ApiClient.shared.cere("jucatori", parametri: parametri, ca: [JucatorPublic].self)) ?? []
    }
}
