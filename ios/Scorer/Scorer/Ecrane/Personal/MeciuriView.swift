import SwiftUI

/// „Găsește meci”: anunțuri ale celor care mai au nevoie de jucători, după
/// oraș și sport. Te alături cu un tap sau pui tu un anunț.
struct MeciuriView: View {
    @Environment(Sesiune.self) private var sesiune

    enum Sectiune: String, CaseIterable, Identifiable {
        case jucatori = "Caută jucători"
        case echipa = "Caută echipă"
        var id: String { rawValue }
    }

    @State private var sectiune = Sectiune.jucatori
    @State private var arataOrase = false
    @State private var meciuri: [Meci] = []
    @State private var deEvaluat: [MeciDeEvaluat] = []
    @State private var deNotat: NotaDeDat?

    struct NotaDeDat: Identifiable {
        let meci: MeciDeEvaluat
        let persoana: MeciDeEvaluat.Persoana
        var id: String { meci.id + persoana.id }
    }
    @State private var jucatoriLiberi: [AnuntJucator] = []
    @State private var arataAnuntJucator = false
    @State private var deInvitat: AnuntJucator?
    @State private var mesajInvitatie = ""
    /// Meciul la care vrei să te alături: întâi cerem telefonul.
    @State private var deAlaturat: Meci?
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
                if !deEvaluat.isEmpty { sectiuneEvaluare }
                lista
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .background(Tema.fundal.ignoresSafeArea())
        .navigationTitle("Găsește meci")
        .navigationBarTitleDisplayMode(.large)
        .sheet(isPresented: $arataAnunt) {
            NavigationStack {
                PosteazaMeciView(orasInitial: oras.isEmpty ? (sesiune.utilizator?.oras ?? "") : oras) {
                    Task { await incarca() }
                }
            }
        }
        .sheet(isPresented: $arataAutentificarea) { AutentificareView() }
        .sheet(isPresented: $arataAnuntJucator) {
            NavigationStack {
                PuneAnuntJucatorView(orasInitial: oras.isEmpty ? (sesiune.utilizator?.oras ?? "") : oras) {
                    Task { await incarca() }
                }
            }
        }
        .alert("Îl iei în echipa ta?", isPresented: .init(get: { deInvitat != nil }, set: { if !$0 { deInvitat = nil } })) {
            TextField("Mesaj (opțional)", text: $mesajInvitatie)
            Button("Trimite invitația") { if let a = deInvitat { invita(a) } }
            Button("Renunță", role: .cancel) {}
        } message: {
            Text("\(deInvitat?.jucator.nume ?? "") primește o notificare și vă vedeți telefoanele.")
        }
        .sheet(item: $deNotat) { d in
            NavigationStack {
                NotaMeciView(meciId: d.meci.id, persoana: d.persoana) { Task { await incarcaDeEvaluat() } }
            }
            .presentationDetents([.medium, .large])
        }
        .sheet(item: $deAlaturat) { meci in
            NavigationStack {
                CerereMeciView(meci: meci, telefonInitial: sesiune.utilizator?.telefon ?? "") { actualizat in
                    if let i = meciuri.firstIndex(where: { $0.id == actualizat.id }) {
                        withAnimation(.smooth) { meciuri[i] = actualizat }
                    }
                }
            }
            .presentationDetents([.large])
        }
        .onChange(of: sectiune) { Task { await incarca() } }
        .onChange(of: oras) { Task { await incarca() } }
        .sheet(isPresented: $arataOrase) {
            NavigationStack { AlegeOrasView(ales: $oras) }
        }
        .task {
            if oras.isEmpty, let din = sesiune.utilizator?.oras { oras = din }
            await incarca()
        }
        .refreshable { await incarca() }
    }

    // MARK: - Antet

    private var antet: some View {
        VStack(alignment: .leading, spacing: 16) {
            Picker("Secțiune", selection: $sectiune) {
                ForEach(Sectiune.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)

            Text(sectiune == .jucatori
                 ? "Echipe care mai au nevoie de jucători. Te alături cu un tap."
                 : "Jucători care caută echipă. Îi inviți, iar ei primesc o notificare.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Button { arataOrase = true } label: {
                HStack(spacing: 10) {
                    Image(systemName: "mappin.and.ellipse").foregroundStyle(Tema.accent)
                    Text(oras.isEmpty ? "Toate orașele" : oras)
                        .foregroundStyle(oras.isEmpty ? .secondary : .primary)
                    Spacer()
                    Image(systemName: "chevron.down").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
                }
                .padding(.horizontal, 16)
                .frame(height: 50)
                .background(Tema.fisa, in: .capsule)
                .shadow(color: .black.opacity(0.06), radius: 12, y: 5)
            }
            .buttonStyle(.plain)

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
                    if !estePersonal { arataAutentificarea = true }
                    else if sectiune == .jucatori { arataAnunt = true }
                    else { arataAnuntJucator = true }
                } label: {
                    Label(sectiune == .jucatori ? "Caut jucători" : "Caut echipă", systemImage: "plus")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 46)
                        .background(Tema.gradientAccent, in: .capsule)
                        .shadow(color: Tema.accent.opacity(0.3), radius: 10, y: 5)
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

    /// „Cum a fost meciul?”: notele pentru organizator sau jucători, după meci.
    private var sectiuneEvaluare: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("CUM A FOST MECIUL?").font(.caption.weight(.bold)).tracking(0.8).foregroundStyle(.secondary)
            ForEach(deEvaluat) { m in
                VStack(alignment: .leading, spacing: 10) {
                    Text("\(m.sport.eticheta) · \(m.inceput.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(.aplicatie).inRomania).capitalized)")
                        .font(.subheadline.weight(.semibold))
                    ForEach(m.persoane) { p in
                        Button { deNotat = NotaDeDat(meci: m, persoana: p) } label: {
                            HStack(spacing: 10) {
                                AvatarPersoana(nume: p.nume, poza: p.poza, marime: 34)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(p.nume).font(.subheadline.weight(.medium)).foregroundStyle(.primary)
                                    Text(p.rol).font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                HStack(spacing: 2) {
                                    ForEach(1...5, id: \.self) { n in
                                        Image(systemName: n <= (p.notaMea ?? 0) ? "star.fill" : "star")
                                            .font(.system(size: 14))
                                            .foregroundStyle(n <= (p.notaMea ?? 0) ? Color.yellow : Color.secondary.opacity(0.4))
                                    }
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(16)
                .background(Tema.fisa, in: .rect(cornerRadius: 20, style: .continuous))
                .shadow(color: .black.opacity(0.05), radius: 12, y: 5)
            }
        }
    }

    private func incarcaDeEvaluat() async {
        guard estePersonal else { deEvaluat = []; return }
        deEvaluat = (try? await ApiClient.shared.cere("meciuri/de-evaluat", ca: [MeciDeEvaluat].self)) ?? []
    }

    @ViewBuilder
    private var lista: some View {
        if sectiune == .echipa {
            listaJucatori
        } else {
            listaMeciuri
        }
    }

    @ViewBuilder
    private var listaJucatori: some View {
        if seIncarca && jucatoriLiberi.isEmpty {
            ForEach(0..<2, id: \.self) { _ in ScheletFisa(inaltime: 160) }
        } else if jucatoriLiberi.isEmpty {
            VStack(spacing: 10) {
                Image(systemName: "person.badge.plus")
                    .font(.system(size: 26))
                    .foregroundStyle(Tema.accent)
                    .frame(width: 60, height: 60)
                    .background(Tema.accent.opacity(0.1), in: .circle)
                Text(oras.isEmpty ? "Niciun jucător nu caută echipă" : "Niciun jucător în \(oras)")
                    .font(.headline)
                Text("Cauți tu echipă? Apasă „Caut echipă” și spune ce poziție joci.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 36)
        } else {
            ForEach(Array(jucatoriLiberi.enumerated()), id: \.element.id) { index, anunt in
                cardJucator(anunt).intrareElement(index)
            }
        }
    }

    private func cardJucator(_ a: AnuntJucator) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                AvatarPersoana(nume: a.jucator.nume, poza: a.jucator.poza, marime: 52)
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(a.jucator.nume).font(.headline)
                        if a.esteAlMeu {
                            Text("anunțul tău").font(.caption.weight(.semibold)).foregroundStyle(Tema.accent)
                        }
                    }
                    Text([a.oras, NivelJoc.eticheta(a.nivel)].compactMap { $0 }.joined(separator: " · "))
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    Label(a.sport.eticheta, systemImage: a.sport.simbol)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Tema.accent)
                        .padding(.horizontal, 11).padding(.vertical, 6)
                        .background(Tema.accent.opacity(0.1), in: .capsule)
                    ForEach(a.pozitii, id: \.self) { p in
                        Text(p)
                            .font(.footnote.weight(.medium))
                            .padding(.horizontal, 11).padding(.vertical, 6)
                            .background(Color.primary.opacity(0.06), in: .capsule)
                    }
                }
            }

            if let disp = a.disponibilitate {
                Label("Disponibil: \(disp)", systemImage: "calendar.badge.clock")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.primary)
            }
            if let d = a.descriere { Text(d).font(.subheadline).foregroundStyle(.primary.opacity(0.8)) }

            if a.esteAlMeu {
                // Doar jucătorul decide când nu mai vrea invitații.
                Toggle(isOn: Binding(
                    get: { a.primesteInvitatii ?? true },
                    set: { nou in seteazaInvitatii(a, nou) }
                )) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Primesc invitații").font(.subheadline.weight(.medium))
                        Text((a.primesteInvitatii ?? true) ? "Oricâte echipe te pot invita." : "Oprit: echipele nu te mai pot invita.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                .tint(Tema.accent)
                if a.invitatii.isEmpty {
                    Text("Nicio invitație încă. Te anunțăm când te vrea o echipă.")
                        .font(.footnote).foregroundStyle(.secondary)
                } else {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("TE VOR ÎN ECHIPĂ").font(.caption.weight(.bold)).tracking(0.8).foregroundStyle(Tema.accent)
                        ForEach(a.invitatii) { i in
                            HStack(spacing: 10) {
                                AvatarPersoana(nume: i.nume, poza: i.poza, marime: 32)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(i.nume).font(.subheadline.weight(.medium))
                                    if let m = i.mesaj { Text("„\(m)”").font(.caption).foregroundStyle(.secondary) }
                                }
                                Spacer()
                                if let t = i.telefon, let url = URL(string: "tel:\(t.filter { $0.isNumber || $0 == "+" })") {
                                    Link(destination: url) { Label(t, systemImage: "phone.fill").font(.footnote.weight(.semibold)) }
                                }
                            }
                        }
                    }
                    .padding(12)
                    .background(Tema.accent.opacity(0.06), in: .rect(cornerRadius: 14, style: .continuous))
                }
                Button("Scoate anunțul", role: .destructive) { stergeAnuntJucator(a) }
                    .font(.subheadline.weight(.semibold))
            } else if a.lAmInvitat {
                Text("L-ai invitat. A primit o notificare.").font(.footnote.weight(.medium)).foregroundStyle(Tema.accent)
                if let t = a.telefonJucator, let url = URL(string: "tel:\(t.filter { $0.isNumber || $0 == "+" })") {
                    Link(destination: url) {
                        Label("Sună-l: \(t)", systemImage: "phone.fill")
                            .font(.subheadline.weight(.medium))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 11)
                            .background(Tema.accent.opacity(0.1), in: .rect(cornerRadius: 12, style: .continuous))
                            .foregroundStyle(Tema.accent)
                    }
                }
            } else if a.primesteInvitatii == false {
                Text("Nu primește invitații momentan")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 11)
                    .background(Color.primary.opacity(0.05), in: .rect(cornerRadius: 12, style: .continuous))
            } else {
                Button {
                    if estePersonal { mesajInvitatie = ""; deInvitat = a } else { arataAutentificarea = true }
                } label: {
                    Label(inLucru == a.id ? "Se trimite…" : "Ia-l în echipă", systemImage: "person.badge.plus")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(Tema.gradientAccent, in: .capsule)
                }
                .buttonStyle(.plain)
                .disabled(inLucru == a.id)
            }
        }
        .padding(18)
        .background(Tema.fisa, in: .rect(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 1, y: 1)
        .shadow(color: .black.opacity(0.07), radius: 18, y: 8)
    }

    @ViewBuilder
    private var listaMeciuri: some View {
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
            Text("\(meciuri.count) \(meciuri.count == 1 ? "echipă caută" : "echipe caută") jucători")
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

            switch meci.cerereaMea {
            case "CERERE":
                Label("Cererea ta așteaptă răspunsul organizatorului.", systemImage: "hourglass")
                    .font(.footnote.weight(.medium)).foregroundStyle(Tema.asteptare)
            case "ACCEPTAT":
                Label("Ești în echipă!", systemImage: "checkmark.seal.fill")
                    .font(.footnote.weight(.semibold)).foregroundStyle(Tema.accent)
            case "RESPINS":
                Text("Organizatorul a ales alți jucători.").font(.footnote).foregroundStyle(.secondary)
            default:
                EmptyView()
            }

            if meci.esteAlMeu, let cereri = meci.cereri, !cereri.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("VOR SĂ VINĂ · \(cereri.count)").font(.caption.weight(.bold)).tracking(0.8).foregroundStyle(Tema.asteptare)
                    ForEach(cereri) { j in
                        randJucator(j) {
                            Button { raspunde(j, din: meci, accepta: true) } label: {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(.white)
                                    .frame(width: 34, height: 34)
                                    .background(meci.ramase == 0 ? AnyShapeStyle(Color.gray.opacity(0.4)) : AnyShapeStyle(Tema.gradientAccent), in: .circle)
                            }
                            .buttonStyle(.plain)
                            .disabled(meci.ramase == 0)
                            .accessibilityLabel("Acceptă-l pe \(j.nume)")
                            Button { raspunde(j, din: meci, accepta: false) } label: {
                                Image(systemName: "xmark")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(.secondary)
                                    .frame(width: 34, height: 34)
                                    .background(Color.primary.opacity(0.07), in: .circle)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Refuză-l pe \(j.nume)")
                        }
                    }
                }
                .padding(12)
                .background(Tema.asteptare.opacity(0.07), in: .rect(cornerRadius: 14, style: .continuous))
            }

            if meci.esteAlMeu && !meci.jucatori.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("ÎN ECHIPĂ").font(.caption.weight(.bold)).tracking(0.8).foregroundStyle(Tema.accent)
                    ForEach(meci.jucatori) { j in
                        randJucator(j) {
                            Button(role: .destructive) { scoate(j, din: meci) } label: {
                                Label("Scoate", systemImage: "person.fill.xmark").font(.caption.weight(.semibold))
                            }
                            .buttonStyle(.borderless)
                        }
                    }
                }
                .padding(12)
                .background(Tema.accent.opacity(0.06), in: .rect(cornerRadius: 14, style: .continuous))
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
        } else if meci.cerereaMea == "RESPINS" {
            EmptyView()
        } else if meci.mAmAlaturat || meci.cerereaMea == "CERERE" {
            Button(meci.mAmAlaturat ? "Ies" : "Retrag") { actiune(meci, "iesi") }
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 14).padding(.vertical, 8)
                .background(Color.primary.opacity(0.06), in: .capsule)
                .buttonStyle(.plain)
                .disabled(ocupat)
        } else {
            Button {
                if estePersonal { deAlaturat = meci } else { arataAutentificarea = true }
            } label: {
                Group {
                    if ocupat { ProgressView().tint(.white) } else { Text(meci.ramase == 0 ? "Complet" : "Vreau să vin") }
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
        Task { await incarcaDeEvaluat() }
        seIncarca = true
        defer { seIncarca = false }
        var parametri: [String: String] = [:]
        if !oras.trimmingCharacters(in: .whitespaces).isEmpty { parametri["oras"] = oras }
        if let sport { parametri["sport"] = sport.rawValue }
        do {
            if sectiune == .echipa {
                let noi = try await ApiClient.shared.cere("jucatori-liberi", parametri: parametri, ca: [AnuntJucator].self)
                eroare = nil
                withAnimation(.smooth) { jucatoriLiberi = noi }
            } else {
                let noi = try await ApiClient.shared.cere("meciuri", parametri: parametri, ca: [Meci].self)
                eroare = nil
                withAnimation(.smooth) { meciuri = noi }
            }
        } catch {
            eroare = error.localizedDescription
        }
    }

    private func randJucator<Butoane: View>(_ j: JucatorInMeci, @ViewBuilder butoane: () -> Butoane) -> some View {
        HStack(spacing: 10) {
            AvatarPersoana(nume: j.nume, poza: j.poza, marime: 36)
            VStack(alignment: .leading, spacing: 2) {
                Text(j.nume).font(.subheadline.weight(.medium))
                if !j.detalii.isEmpty { Text(j.detalii).font(.caption).foregroundStyle(.secondary) }
                if let t = j.telefon, let url = URL(string: "tel:\(t.filter { $0.isNumber || $0 == "+" })") {
                    Link(destination: url) { Label(t, systemImage: "phone.fill").font(.caption.weight(.semibold)) }
                }
            }
            Spacer(minLength: 6)
            butoane()
        }
    }

    /// Organizatorul acceptă sau refuză o cerere.
    private func raspunde(_ j: JucatorInMeci, din meci: Meci, accepta: Bool) {
        Task {
            struct Corp: Encodable { let accepta: Bool }
            do {
                try await ApiClient.shared.cereFaraRaspuns("meciuri/\(meci.id)/cereri/\(j.id)", metoda: "POST", corp: Corp(accepta: accepta))
                await incarca()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }

    /// Organizatorul scoate un jucător; locul se eliberează pentru altcineva.
    private func scoate(_ j: JucatorInMeci, din meci: Meci) {
        Task {
            do {
                try await ApiClient.shared.cereFaraRaspuns("meciuri/\(meci.id)/jucatori/\(j.id)", metoda: "DELETE")
                await incarca()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }

    private func invita(_ a: AnuntJucator) {
        inLucru = a.id
        let mesaj = mesajInvitatie
        Task {
            defer { inLucru = nil }
            struct Corp: Encodable { let mesaj: String? }
            do {
                let actualizat = try await ApiClient.shared.cere(
                    "jucatori-liberi/\(a.id)/invita", metoda: "POST",
                    corp: Corp(mesaj: mesaj.isEmpty ? nil : mesaj), ca: AnuntJucator.self
                )
                if let i = jucatoriLiberi.firstIndex(where: { $0.id == a.id }) {
                    withAnimation(.smooth) { jucatoriLiberi[i] = actualizat }
                }
            } catch {
                eroare = error.localizedDescription
            }
        }
    }

    private func seteazaInvitatii(_ a: AnuntJucator, _ deschis: Bool) {
        Task {
            struct Corp: Encodable { let primesteInvitatii: Bool }
            try? await ApiClient.shared.cereFaraRaspuns("jucatori-liberi/\(a.id)", metoda: "PATCH", corp: Corp(primesteInvitatii: deschis))
            await incarca()
        }
    }

    private func stergeAnuntJucator(_ a: AnuntJucator) {
        Task {
            try? await ApiClient.shared.cereFaraRaspuns("jucatori-liberi/\(a.id)", metoda: "DELETE")
            withAnimation(.smooth) { jucatoriLiberi.removeAll { $0.id == a.id } }
        }
    }

    private func actiune(_ meci: Meci, _ tip: String) {
        inLucru = meci.id
        Task {
            defer { inLucru = nil }
            do {
                switch tip {
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
                NavigationLink { AlegeOrasView(permiteToate: false, ales: $oras) } label: {
                    HStack {
                        Text("Oraș")
                        Spacer()
                        Text(oras.isEmpty ? "Alege" : oras).foregroundStyle(.secondary)
                    }
                }
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

/// „Caut echipă”: jucătorul își pune anunțul cu sportul, orașul și poziția.
struct PuneAnuntJucatorView: View {
    let orasInitial: String
    let laFinal: () -> Void

    @Environment(\.dismiss) private var inchide

    @State private var sport: Sport = .fotbal
    @State private var pozitii: Set<String> = []
    @State private var oras = ""
    @State private var nivel = ""
    @State private var descriere = ""
    @State private var arataTelefon = true
    @State private var zile: Set<Int> = []
    @State private var oraDe: Int?
    @State private var oraPana: Int?
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
            }
            Section {
                HStack(spacing: 6) {
                    ForEach(1...7, id: \.self) { zi in
                        let ales = zile.contains(zi)
                        Button {
                            if ales { zile.remove(zi) } else { zile.insert(zi) }
                        } label: {
                            Text(AnuntJucator.zileScurte[zi - 1])
                                .font(.caption.weight(.semibold))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(ales ? Tema.accent : Tema.fundal, in: .rect(cornerRadius: 9, style: .continuous))
                                .foregroundStyle(ales ? .white : .primary)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 4)
                HStack(spacing: 16) {
                    Button("Weekend") { zile = [6, 7] }
                    Button("Luni–vineri") { zile = [1, 2, 3, 4, 5] }
                    Button("Oricând") { zile = [] }
                }
                .font(.footnote.weight(.semibold))
                .buttonStyle(.borderless)
                Picker("De la", selection: $oraDe) {
                    Text("Oricând").tag(Int?.none)
                    ForEach(0..<24, id: \.self) { Text(String(format: "%02d:00", $0)).tag(Optional($0)) }
                }
                Picker("Până la", selection: $oraPana) {
                    Text("Oricând").tag(Int?.none)
                    ForEach(1...24, id: \.self) { Text(String(format: "%02d:00", $0)).tag(Optional($0)) }
                }
            } header: {
                Text("Când poți juca?")
            } footer: {
                Text("De exemplu vineri, sâmbătă, duminică, de la 18:00 la 22:00.")
            }
            if !sport.pozitii.isEmpty {
                Section {
                    LazyVGrid(columns: [.init(.adaptive(minimum: 100), spacing: 8)], spacing: 8) {
                        ForEach(sport.pozitii, id: \.self) { p in
                            let ales = pozitii.contains(p)
                            Button {
                                if ales { pozitii.remove(p) } else { pozitii.insert(p) }
                            } label: {
                                Text(p)
                                    .font(.subheadline.weight(.medium))
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(ales ? Tema.accent : Tema.fundal, in: .rect(cornerRadius: 10, style: .continuous))
                                    .foregroundStyle(ales ? .white : .primary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("Pe ce poziție joci?")
                } footer: {
                    Text("Poți alege mai multe.")
                }
            }
            Section {
                NavigationLink { AlegeOrasView(permiteToate: false, ales: $oras) } label: {
                    HStack {
                        Text("Oraș")
                        Spacer()
                        Text(oras.isEmpty ? "Alege" : oras).foregroundStyle(.secondary)
                    }
                }
                Picker("Nivel", selection: $nivel) {
                    Text("Nu spun").tag("")
                    Text("Începător").tag("INCEPATOR")
                    Text("Mediu").tag("MEDIU")
                    Text("Avansat").tag("AVANSAT")
                    Text("Competitiv").tag("COMPETITIV")
                }
                TextField("Despre tine (opțional)", text: $descriere, axis: .vertical).lineLimit(2...5)
                Toggle("Arată telefonul meu echipelor care mă invită", isOn: $arataTelefon)
            }
            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }
            Section {
                Button(action: trimite) {
                    HStack {
                        Spacer()
                        if seTrimite { ProgressView().tint(.white) } else { Text("Pune-mă pe listă").fontWeight(.semibold) }
                        Spacer()
                    }
                }
                .listRowBackground(Tema.accent)
                .foregroundStyle(.white)
                .disabled(seTrimite)
            }
        }
        .navigationTitle("Caut echipă")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } } }
        .onAppear { if oras.isEmpty { oras = orasInitial } }
        .onChange(of: sport) { pozitii = [] }
    }

    private func trimite() {
        eroare = nil
        guard oras.trimmingCharacters(in: .whitespaces).count >= 2 else { eroare = "Alege orașul."; return }
        if let oraDe, let oraPana, oraPana <= oraDe {
            eroare = "Ora de final trebuie să fie după cea de început."; return
        }
        struct Corp: Encodable {
            let sport: String
            let oras: String
            let zile: [Int]
            let oraDe: Int?
            let oraPana: Int?
            let pozitii: [String]
            let nivel: String?
            let descriere: String?
            let arataTelefon: Bool
        }
        let corp = Corp(
            sport: sport.rawValue, oras: oras,
            zile: zile.sorted(), oraDe: oraDe, oraPana: oraPana,
            pozitii: sport.pozitii.filter { pozitii.contains($0) },
            nivel: nivel.isEmpty ? nil : nivel,
            descriere: descriere.isEmpty ? nil : descriere,
            arataTelefon: arataTelefon
        )
        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                try await ApiClient.shared.cereFaraRaspuns("jucatori-liberi", metoda: "POST", corp: corp)
                laFinal()
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}

/// Cererea de a veni la un meci: telefon (obligatoriu), poziția și nivelul.
/// Organizatorul alege apoi pe cine ia.
struct CerereMeciView: View {
    let meci: Meci
    let telefonInitial: String
    let laTrimis: (Meci) -> Void

    @Environment(\.dismiss) private var inchide
    @State private var telefon = ""
    @State private var pozitii: Set<String> = []
    @State private var nivel = ""
    @State private var eroare: String?
    @State private var seTrimite = false

    var body: some View {
        Form {
            Section {
                TextField("07xx xxx xxx", text: $telefon)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
            } header: {
                Text("Telefon (obligatoriu)")
            } footer: {
                Text("Îl vede doar organizatorul, ca să te poată suna dacă nu ajungi.")
            }
            if !meci.sport.pozitii.isEmpty {
                Section("Pe ce poziție joci?") {
                    LazyVGrid(columns: [.init(.adaptive(minimum: 100), spacing: 8)], spacing: 8) {
                        ForEach(meci.sport.pozitii, id: \.self) { p in
                            let ales = pozitii.contains(p)
                            Button {
                                if ales { pozitii.remove(p) } else { pozitii.insert(p) }
                            } label: {
                                Text(p)
                                    .font(.subheadline.weight(.medium))
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(ales ? Tema.accent : Tema.fundal, in: .rect(cornerRadius: 10, style: .continuous))
                                    .foregroundStyle(ales ? .white : .primary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            Section {
                Picker("Nivelul tău", selection: $nivel) {
                    Text("Nu spun").tag("")
                    Text("Începător").tag("INCEPATOR")
                    Text("Mediu").tag("MEDIU")
                    Text("Avansat").tag("AVANSAT")
                    Text("Competitiv").tag("COMPETITIV")
                }
            } footer: {
                Text("Organizatorul vede cererile și alege pe cine ia. Primești o notificare.")
            }
            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }
            Section {
                Button(action: trimite) {
                    HStack {
                        Spacer()
                        if seTrimite { ProgressView().tint(.white) } else { Text("Trimite cererea").fontWeight(.semibold) }
                        Spacer()
                    }
                }
                .listRowBackground(Tema.accent)
                .foregroundStyle(.white)
                .disabled(seTrimite)
            }
        }
        .navigationTitle("Vreau să vin")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } } }
        .onAppear { if telefon.isEmpty { telefon = telefonInitial } }
    }

    private func trimite() {
        eroare = nil
        guard telefon.filter(\.isNumber).count >= 9 else { eroare = "Lasă un număr de telefon valid."; return }
        struct Corp: Encodable { let telefon: String; let pozitii: [String]; let nivel: String? }
        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                let actualizat = try await ApiClient.shared.cere(
                    "meciuri/\(meci.id)/alaturare", metoda: "POST",
                    corp: Corp(telefon: telefon, pozitii: meci.sport.pozitii.filter { pozitii.contains($0) }, nivel: nivel.isEmpty ? nil : nivel),
                    ca: Meci.self
                )
                laTrimis(actualizat)
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}

/// Nota de după meci: 1–5 stele și câteva cuvinte.
struct NotaMeciView: View {
    let meciId: String
    let persoana: MeciDeEvaluat.Persoana
    let laSalvat: () -> Void

    @Environment(\.dismiss) private var inchide
    @State private var nota = 0
    @State private var comentariu = ""
    @State private var eroare: String?
    @State private var seSalveaza = false

    var body: some View {
        Form {
            Section {
                HStack(spacing: 12) {
                    AvatarPersoana(nume: persoana.nume, poza: persoana.poza, marime: 44)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(persoana.nume).font(.headline)
                        Text(persoana.rol).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                HStack(spacing: 10) {
                    Spacer()
                    ForEach(1...5, id: \.self) { n in
                        Button { nota = n } label: {
                            Image(systemName: n <= nota ? "star.fill" : "star")
                                .font(.system(size: 30))
                                .foregroundStyle(n <= nota ? Color.yellow : Color.secondary.opacity(0.4))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("\(n) stele")
                    }
                    Spacer()
                }
                .padding(.vertical, 6)
                TextField("Câteva cuvinte (opțional)", text: $comentariu, axis: .vertical).lineLimit(2...4)
            }
            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }
            Section {
                Button(action: salveaza) {
                    HStack {
                        Spacer()
                        if seSalveaza { ProgressView().tint(.white) } else { Text("Salvează nota").fontWeight(.semibold) }
                        Spacer()
                    }
                }
                .listRowBackground(nota == 0 ? Color.gray.opacity(0.35) : Tema.accent)
                .foregroundStyle(.white)
                .disabled(nota == 0 || seSalveaza)
            }
        }
        .navigationTitle("Cum a fost?")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } } }
        .onAppear { if nota == 0 { nota = persoana.notaMea ?? 0 } }
    }

    private func salveaza() {
        struct Corp: Encodable { let destinatarId: String; let nota: Int; let comentariu: String? }
        seSalveaza = true
        Task {
            defer { seSalveaza = false }
            do {
                try await ApiClient.shared.cereFaraRaspuns(
                    "meciuri/\(meciId)/note", metoda: "POST",
                    corp: Corp(destinatarId: persoana.id, nota: nota, comentariu: comentariu.isEmpty ? nil : comentariu)
                )
                laSalvat()
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}
