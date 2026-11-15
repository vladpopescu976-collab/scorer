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
    /// Anunțul deschis: la apăsare pe card apar toate detaliile.
    struct Deschis: Identifiable { let id: String }
    @State private var meciDeschis: Deschis?
    @State private var anuntDeschis: Deschis?
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
        .navigationBarTitleDisplayMode(.inline)
        .antetVerde("Meciuri", titlu: "Găsește meci.", accent: "Intră în joc.")
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
        .sheet(item: $deNotat) { d in
            NavigationStack {
                NotaMeciView(meciId: d.meci.id, persoana: d.persoana) { Task { await incarcaDeEvaluat() } }
            }
            .presentationDetents([.medium, .large])
        }
        .sheet(item: $meciDeschis) { d in
            paginaMeci(id: d.id)
                .presentationDragIndicator(.visible)
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
        }
        .sheet(item: $anuntDeschis) { d in
            paginaJucator(id: d.id)
                .presentationDragIndicator(.visible)
                .sheet(item: $deInvitat) { a in
                    NavigationStack {
                        InvitatieView(anunt: a) { actualizat in
                            if let i = jucatoriLiberi.firstIndex(where: { $0.id == actualizat.id }) {
                                withAnimation(.smooth) { jucatoriLiberi[i] = actualizat }
                            }
                        }
                    }
                    .presentationDetents([.large])
                }
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
                rezumatJucator(anunt).intrareElement(index)
            }
        }
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
                rezumatMeci(meci).intrareElement(index)
            }
        }
    }

    // MARK: - Carduri și detalii

    private func urlTelefon(_ t: String) -> URL? { URL(string: "tel:\(t.filter { $0.isNumber || $0 == "+" })") }

    private func dataLunga(_ d: Date) -> String {
        d.formatted(.dateTime.weekday(.wide).day().month(.wide).hour().minute().locale(.aplicatie).inRomania).capitalized
    }

    private func titluSectiune(_ text: String, culoare: Color = .secondary) -> some View {
        Text(text.uppercased()).font(.caption.weight(.bold)).tracking(0.8).foregroundStyle(culoare)
    }

    private func cipStare(_ text: String, culoare: Color) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(culoare)
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(culoare.opacity(0.12), in: .capsule)
    }

    private var veziDetaliile: some View {
        HStack(spacing: 3) {
            Text("Vezi detaliile")
            Image(systemName: "chevron.right").font(.caption.weight(.bold))
        }
        .font(.footnote.weight(.semibold))
        .foregroundStyle(Tema.accent)
    }

    /// Antetul verde al paginii de detalii, ca pe pagina principală.
    private func antetDetalii<Extra: View>(
        simbol: String, eticheta: String, titlu: String, subtitlu: String?,
        @ViewBuilder extra: () -> Extra
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Label(eticheta, systemImage: simbol)
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, 11).padding(.vertical, 6)
                .background(.white.opacity(0.12), in: .capsule)
                .overlay { Capsule().strokeBorder(.white.opacity(0.15)) }
            Text(titlu)
                .font(.system(size: 26, weight: .semibold))
                .padding(.top, 16)
                .fixedSize(horizontal: false, vertical: true)
            if let subtitlu {
                Text(subtitlu).font(.subheadline).opacity(0.7).padding(.top, 4)
            }
            extra()
        }
        .foregroundStyle(Color(red: 0.95, green: 0.94, blue: 0.90))
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 22)
        .padding(.top, 38)
        .padding(.bottom, 24)
        .background {
            RadialGradient(
                colors: [Color(red: 0.09, green: 0.33, blue: 0.23), Color(red: 0.043, green: 0.165, blue: 0.11), Color(red: 0.027, green: 0.086, blue: 0.06)],
                center: .topLeading, startRadius: 0, endRadius: 520
            )
        }
    }

    private func info(_ simbol: String, _ eticheta: String, _ valoare: String, detaliu: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(eticheta.uppercased(), systemImage: simbol)
                .font(.caption2.weight(.bold)).tracking(0.6).foregroundStyle(.secondary)
            Text(valoare).font(.subheadline.weight(.semibold)).fixedSize(horizontal: false, vertical: true)
            if let detaliu { Text(detaliu).font(.footnote).foregroundStyle(.secondary) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Tema.fisa, in: .rect(cornerRadius: 16, style: .continuous))
    }

    /// Persoana de contact cu butonul mare „Sună”.
    private func contact(nume: String, poza: String?, rol: String, telefon: String?, faraTelefon: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                AvatarPersoana(nume: nume, poza: poza, marime: 46)
                VStack(alignment: .leading, spacing: 2) {
                    Text(nume).font(.headline).lineLimit(1)
                    Text(rol).font(.footnote).foregroundStyle(.secondary)
                }
                Spacer(minLength: 6)
                if let telefon, let url = urlTelefon(telefon) {
                    Link(destination: url) {
                        Label("Sună", systemImage: "phone.fill")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16).padding(.vertical, 10)
                            .background(Tema.gradientAccent, in: .capsule)
                    }
                }
            }
            if let telefon {
                Text("Telefon: \(telefon)").font(.footnote.monospacedDigit()).foregroundStyle(.secondary).textSelection(.enabled)
            } else if let faraTelefon {
                Text(faraTelefon).font(.footnote).foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .background(Tema.fisa, in: .rect(cornerRadius: 18, style: .continuous))
    }

    private func butonMare(_ text: String, simbol: String, activ: Bool = true, actiune: @escaping () -> Void) -> some View {
        Button(action: actiune) {
            Label(text, systemImage: simbol)
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(activ ? AnyShapeStyle(Tema.gradientAccent) : AnyShapeStyle(Color.gray.opacity(0.4)), in: .capsule)
        }
        .buttonStyle(.plain)
        .disabled(!activ)
    }

    private func butonInchide(_ actiune: @escaping () -> Void) -> some View {
        Button(action: actiune) {
            Image(systemName: "xmark")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(.white.opacity(0.16), in: .circle)
        }
        .buttonStyle(.plain)
        .padding(16)
        .accessibilityLabel("Închide")
    }

    /// Din detalii, fără cont: închidem fereastra, apoi cerem autentificarea.
    private func ceAutentificare() {
        meciDeschis = nil
        anuntDeschis = nil
        Task {
            try? await Task.sleep(for: .milliseconds(450))
            arataAutentificarea = true
        }
    }

    // MARK: Jucător care caută echipă

    private func rezumatJucator(_ a: AnuntJucator) -> some View {
        Button { anuntDeschis = Deschis(id: a.id) } label: {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 12) {
                    AvatarPersoana(nume: a.jucator.nume, poza: a.jucator.poza, marime: 52)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(a.jucator.nume).font(.headline).lineLimit(1)
                        Text([a.oras, NivelJoc.eticheta(a.nivel)].compactMap { $0 }.joined(separator: " · "))
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 0)
                    if a.esteAlMeu {
                        cipStare(a.invitatii.isEmpty ? "Anunțul tău" : "\(a.invitatii.count) \(a.invitatii.count == 1 ? "invitație" : "invitații")", culoare: Tema.accent)
                    } else if a.lAmInvitat {
                        cipStare("L-ai invitat", culoare: Tema.accent)
                    }
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
                .scrollDisabled(true)
                HStack {
                    if let disp = a.disponibilitate {
                        Label(disp, systemImage: "calendar.badge.clock").font(.footnote.weight(.medium)).lineLimit(1)
                    }
                    Spacer(minLength: 8)
                    veziDetaliile
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Tema.fisa, in: .rect(cornerRadius: 24, style: .continuous))
            .contentShape(.rect(cornerRadius: 24))
            .shadow(color: .black.opacity(0.04), radius: 1, y: 1)
            .shadow(color: .black.opacity(0.07), radius: 18, y: 8)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func paginaJucator(id: String) -> some View {
        if let a = jucatoriLiberi.first(where: { $0.id == id }) {
            ScrollView {
                VStack(spacing: 0) {
                    antetDetalii(
                        simbol: a.sport.simbol,
                        eticheta: "Caută echipă · \(a.sport.eticheta)",
                        titlu: a.jucator.nume,
                        subtitlu: [a.oras, NivelJoc.eticheta(a.nivel)].compactMap { $0 }.joined(separator: " · ")
                    ) {
                        if !a.pozitii.isEmpty {
                            HStack(spacing: 6) {
                                ForEach(a.pozitii, id: \.self) { p in
                                    Text(p)
                                        .font(.footnote.weight(.medium))
                                        .padding(.horizontal, 11).padding(.vertical, 6)
                                        .background(.white.opacity(0.12), in: .capsule)
                                }
                            }
                            .padding(.top, 14)
                        }
                    }
                    detaliiJucator(a).padding(20)
                }
            }
            .background(Tema.fundal)
            .overlay(alignment: .topTrailing) { butonInchide { anuntDeschis = nil } }
        } else {
            ContentUnavailableView("Anunțul nu mai există", systemImage: "person.slash")
        }
    }

    private func detaliiJucator(_ a: AnuntJucator) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(spacing: 10) {
                info("calendar.badge.clock", "Disponibil", a.disponibilitate ?? "Oricând")
                HStack(spacing: 10) {
                    info("mappin.and.ellipse", "Oraș", a.oras)
                    info("gauge.medium", "Nivel", NivelJoc.eticheta(a.nivel) ?? "Nespus")
                }
            }

            if let d = a.descriere {
                VStack(alignment: .leading, spacing: 8) {
                    titluSectiune(a.esteAlMeu ? "Despre tine" : "Despre el")
                    Text(d).font(.body).foregroundStyle(.primary.opacity(0.85))
                }
            }

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
                .padding(14)
                .background(Tema.fisa, in: .rect(cornerRadius: 16, style: .continuous))

                VStack(alignment: .leading, spacing: 10) {
                    titluSectiune("Te vor în echipă · \(a.invitatii.count)", culoare: Tema.accent)
                    if a.invitatii.isEmpty {
                        Text("Nicio invitație încă. Te anunțăm când te vrea o echipă.")
                            .font(.footnote).foregroundStyle(.secondary)
                    } else {
                        ForEach(a.invitatii) { i in cardInvitatie(i) }
                    }
                }

                Button("Scoate anunțul", role: .destructive) { stergeAnuntJucator(a) }
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            } else if a.lAmInvitat {
                Label("L-ai invitat. A primit o notificare cu detaliile.", systemImage: "checkmark.seal.fill")
                    .font(.footnote.weight(.semibold)).foregroundStyle(Tema.accent)
                contact(
                    nume: a.jucator.nume, poza: a.jucator.poza, rol: "jucător", telefon: a.telefonJucator,
                    faraTelefon: "Jucătorul nu și-a arătat telefonul. Te sună el pe numărul tău."
                )
            } else if a.primesteInvitatii == false {
                Text("Nu primește invitații momentan")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.primary.opacity(0.05), in: .rect(cornerRadius: 14, style: .continuous))
            } else {
                butonMare("Ia-l în echipă", simbol: "person.badge.plus") {
                    if estePersonal { deInvitat = a } else { ceAutentificare() }
                }
            }
        }
    }

    /// O invitație primită: cine te cheamă, unde, când, cât costă și „Sună”.
    private func cardInvitatie(_ i: AnuntJucator.Invitatie) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            contact(nume: i.nume, poza: i.poza, rol: "te cheamă în echipă", telefon: i.telefon)
            if let t = i.teren { info("mappin.and.ellipse", "Teren", t) }
            HStack(alignment: .top, spacing: 10) {
                if let d = i.dataOra {
                    info("clock", "Când", dataLunga(d), detaliu: i.durata.map { "\($0) min" })
                }
                if let p = i.pret {
                    info("banknote", "Preț", p == 0 ? "Gratis" : "\(p) lei de om")
                }
            }
            if let m = i.mesaj { info("text.bubble", "Alte detalii", m) }
        }
        .padding(12)
        .background(Tema.accent.opacity(0.07), in: .rect(cornerRadius: 22, style: .continuous))
    }

    // MARK: Echipă care caută jucători

    private func rezumatMeci(_ meci: Meci) -> some View {
        Button { meciDeschis = Deschis(id: meci.id) } label: {
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
                    if meci.esteAlMeu {
                        let n = meci.cereri?.count ?? 0
                        cipStare(n == 0 ? "Anunțul tău" : "\(n) \(n == 1 ? "cerere nouă" : "cereri noi")", culoare: n == 0 ? Tema.accent : Tema.asteptare)
                    } else if meci.cerereaMea == "ACCEPTAT" {
                        cipStare("Ești în echipă", culoare: Tema.accent)
                    } else if meci.cerereaMea == "CERERE" {
                        cipStare("Cerere trimisă", culoare: Tema.asteptare)
                    } else if let nivel = NivelJoc.eticheta(meci.nivel) {
                        Text(nivel).font(.caption).foregroundStyle(.secondary)
                    }
                }

                VStack(alignment: .leading, spacing: 5) {
                    Text(dataLunga(meci.inceput)).font(.system(size: 18, weight: .semibold))
                    Label(meci.locatie.map { "\($0), \(meci.oras)" } ?? meci.oras, systemImage: "mappin.and.ellipse")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                progres(meci, pePaginaVerde: false)

                Divider()

                HStack(spacing: 10) {
                    AvatarPersoana(nume: meci.organizator.nume, poza: meci.organizator.poza, marime: 30)
                    Text(meci.organizator.nume).font(.subheadline.weight(.medium)).lineLimit(1)
                    Spacer(minLength: 6)
                    veziDetaliile
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Tema.fisa, in: .rect(cornerRadius: 24, style: .continuous))
            .contentShape(.rect(cornerRadius: 24))
            .shadow(color: .black.opacity(0.04), radius: 1, y: 1)
            .shadow(color: .black.opacity(0.07), radius: 18, y: 8)
        }
        .buttonStyle(.plain)
    }

    private func progres(_ meci: Meci, pePaginaVerde: Bool) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack {
                Text(meci.ramase == 0 ? "Echipa e completă"
                     : meci.ramase == 1 ? "Mai trebuie un jucător" : "Mai trebuie \(meci.ramase) jucători")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(pePaginaVerde ? Tema.accentDeschis : (meci.ramase == 0 ? Color.secondary : Tema.accent))
                Spacer()
                Text("\(meci.jucatoriAlaturati)/\(meci.jucatoriNecesari)")
                    .font(.footnote.monospacedDigit())
                    .opacity(0.7)
            }
            GeometryReader { g in
                Capsule().fill(pePaginaVerde ? Color.white.opacity(0.12) : Color.primary.opacity(0.07))
                    .overlay(alignment: .leading) {
                        Capsule().fill(pePaginaVerde ? AnyShapeStyle(Tema.accentDeschis) : AnyShapeStyle(Tema.gradientAccent))
                            .frame(width: g.size.width * min(1, CGFloat(meci.jucatoriAlaturati) / CGFloat(max(1, meci.jucatoriNecesari))))
                    }
            }
            .frame(height: 6)
        }
    }

    @ViewBuilder
    private func paginaMeci(id: String) -> some View {
        if let meci = meciuri.first(where: { $0.id == id }) {
            ScrollView {
                VStack(spacing: 0) {
                    antetDetalii(
                        simbol: meci.sport.simbol,
                        eticheta: meci.format.map { "\(meci.sport.eticheta) · \($0)" } ?? meci.sport.eticheta,
                        titlu: dataLunga(meci.inceput),
                        subtitlu: meci.locatie.map { "\($0), \(meci.oras)" } ?? meci.oras
                    ) {
                        progres(meci, pePaginaVerde: true).padding(.top, 20)
                    }
                    detaliiMeci(meci).padding(20)
                }
            }
            .background(Tema.fundal)
            .overlay(alignment: .topTrailing) { butonInchide { meciDeschis = nil } }
        } else {
            ContentUnavailableView("Anunțul nu mai există", systemImage: "trophy")
        }
    }

    private func detaliiMeci(_ meci: Meci) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(alignment: .top, spacing: 10) {
                info("mappin.and.ellipse", "Unde", meci.locatie ?? "Se stabilește", detaliu: meci.oras)
                info("gauge.medium", "Nivel", NivelJoc.eticheta(meci.nivel) ?? "Oricine")
            }

            if let descriere = meci.descriere {
                VStack(alignment: .leading, spacing: 8) {
                    titluSectiune("De la organizator")
                    Text(descriere).font(.body).foregroundStyle(.primary.opacity(0.85))
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                titluSectiune("Organizator")
                contact(
                    nume: meci.organizator.nume, poza: meci.organizator.poza,
                    rol: meci.esteAlMeu ? "tu" : "organizator",
                    telefon: meci.esteAlMeu ? nil : meci.telefonOrganizator,
                    faraTelefon: meci.esteAlMeu ? nil : "Telefonul organizatorului apare aici după ce te acceptă în echipă."
                )
            }

            switch meci.cerereaMea {
            case "CERERE":
                Label("Cererea ta așteaptă răspunsul organizatorului.", systemImage: "hourglass")
                    .font(.footnote.weight(.medium)).foregroundStyle(Tema.asteptare)
            case "ACCEPTAT":
                Label("Ești în echipă! Sună-l pe organizator dacă ai întrebări.", systemImage: "checkmark.seal.fill")
                    .font(.footnote.weight(.semibold)).foregroundStyle(Tema.accent)
            case "RESPINS":
                Text("Organizatorul a ales alți jucători.").font(.footnote).foregroundStyle(.secondary)
            default:
                EmptyView()
            }

            if meci.esteAlMeu, let cereri = meci.cereri, !cereri.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    titluSectiune("Vor să vină · \(cereri.count)", culoare: Tema.asteptare)
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
                .padding(14)
                .background(Tema.asteptare.opacity(0.07), in: .rect(cornerRadius: 18, style: .continuous))
            }

            if !meci.jucatori.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    titluSectiune("În echipă · \(meci.jucatori.count)", culoare: Tema.accent)
                    ForEach(meci.jucatori) { j in
                        randJucator(j) {
                            if meci.esteAlMeu {
                                Button(role: .destructive) { scoate(j, din: meci) } label: {
                                    Label("Scoate", systemImage: "person.fill.xmark").font(.caption.weight(.semibold))
                                }
                                .buttonStyle(.borderless)
                            }
                        }
                    }
                }
                .padding(14)
                .background(Tema.fisa, in: .rect(cornerRadius: 18, style: .continuous))
            }

            butonActiune(meci)
        }
    }

    @ViewBuilder
    private func butonActiune(_ meci: Meci) -> some View {
        let ocupat = inLucru == meci.id
        if meci.esteAlMeu {
            Button("Șterge anunțul", role: .destructive) { actiune(meci, "sterge") }
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .disabled(ocupat)
        } else if meci.cerereaMea == "RESPINS" {
            EmptyView()
        } else if meci.mAmAlaturat || meci.cerereaMea == "CERERE" {
            Button(meci.mAmAlaturat ? "Ies din meci" : "Retrag cererea") { actiune(meci, "iesi") }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(Color.primary.opacity(0.06), in: .capsule)
                .buttonStyle(.plain)
                .disabled(ocupat)
        } else {
            butonMare(meci.ramase == 0 ? "Echipa e completă" : "Vreau să vin", simbol: "figure.run", activ: !ocupat && meci.ramase > 0) {
                if estePersonal { deAlaturat = meci } else { ceAutentificare() }
            }
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
            anuntDeschis = nil
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
                    meciDeschis = nil
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
    @Environment(Sesiune.self) private var sesiune

    @State private var sport: Sport = .fotbal
    @State private var format: String?
    @State private var oras = ""
    @State private var inceput = Calendar.current.date(byAdding: .hour, value: 3, to: .now) ?? .now
    @State private var locatie = ""
    @State private var necesari = 2
    @State private var nivel = ""
    @State private var descriere = ""
    @State private var telefon = ""
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
            }
            Section {
                TextField("Telefonul tău", text: $telefon)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
            } header: {
                Text("Telefon")
            } footer: {
                Text("Îl văd doar jucătorii pe care îi accepți, ca să te poată suna.")
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
        .onAppear {
            if oras.isEmpty { oras = orasInitial }
            if telefon.isEmpty { telefon = sesiune.utilizator?.telefon ?? "" }
        }
        .onChange(of: sport) { format = nil }
    }

    private func trimite() {
        eroare = nil
        guard oras.trimmingCharacters(in: .whitespaces).count >= 2 else { eroare = "Scrie orașul."; return }
        guard telefon.filter(\.isNumber).count >= 9 else { eroare = "Lasă un număr de telefon, ca jucătorii să te poată suna."; return }
        struct Corp: Encodable {
            let sport: String
            let oras: String
            let inceput: Date
            let locatie: String?
            let format: String?
            let jucatoriNecesari: Int
            let nivel: String?
            let descriere: String?
            let telefon: String
        }
        let corp = Corp(
            sport: sport.rawValue, oras: oras, inceput: inceput,
            locatie: locatie.isEmpty ? nil : locatie, format: format,
            jucatoriNecesari: necesari, nivel: nivel.isEmpty ? nil : nivel,
            descriere: descriere.isEmpty ? nil : descriere, telefon: telefon
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
    @Environment(Sesiune.self) private var sesiune

    @State private var sport: Sport = .fotbal
    @State private var pozitii: Set<String> = []
    @State private var oras = ""
    @State private var nivel = ""
    @State private var descriere = ""
    @State private var arataTelefon = true
    @State private var telefon = ""
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
                if arataTelefon {
                    TextField("Telefonul tău", text: $telefon)
                        .keyboardType(.phonePad)
                        .textContentType(.telephoneNumber)
                }
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
        .onAppear {
            if oras.isEmpty { oras = orasInitial }
            if telefon.isEmpty { telefon = sesiune.utilizator?.telefon ?? "" }
        }
        .onChange(of: sport) { pozitii = [] }
    }

    private func trimite() {
        eroare = nil
        guard oras.trimmingCharacters(in: .whitespaces).count >= 2 else { eroare = "Alege orașul."; return }
        if let oraDe, let oraPana, oraPana <= oraDe {
            eroare = "Ora de final trebuie să fie după cea de început."; return
        }
        if arataTelefon && telefon.filter(\.isNumber).count < 9 {
            eroare = "Lasă un număr de telefon, ca echipele să te poată suna."; return
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
            let telefon: String?
        }
        let corp = Corp(
            sport: sport.rawValue, oras: oras,
            zile: zile.sorted(), oraDe: oraDe, oraPana: oraPana,
            pozitii: sport.pozitii.filter { pozitii.contains($0) },
            nivel: nivel.isEmpty ? nil : nivel,
            descriere: descriere.isEmpty ? nil : descriere,
            arataTelefon: arataTelefon,
            telefon: arataTelefon ? telefon : nil
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

/// Invitația pentru un jucător: terenul, când, cât durează, cât costă și alte detalii.
struct InvitatieView: View {
    let anunt: AnuntJucator
    let laTrimis: (AnuntJucator) -> Void

    @Environment(\.dismiss) private var inchide
    @Environment(Sesiune.self) private var sesiune
    @State private var telefon = ""
    @State private var teren = ""
    @State private var dataOra = Calendar.current.date(byAdding: .day, value: 1, to: .now) ?? .now
    @State private var durata = 60
    @State private var pret = ""
    @State private var mesaj = ""
    @State private var eroare: String?
    @State private var seTrimite = false

    private var poateTrimite: Bool {
        teren.trimmingCharacters(in: .whitespaces).count >= 2 && telefon.filter(\.isNumber).count >= 9 && !seTrimite
    }

    var body: some View {
        Form {
            Section {
                HStack(spacing: 12) {
                    AvatarPersoana(nume: anunt.jucator.nume, poza: anunt.jucator.poza, marime: 44)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(anunt.jucator.nume).font(.headline)
                        Text("Primește notificare și vă vedeți telefoanele.").font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            Section("Unde și când") {
                TextField("Terenul, ex. Baza Sportivă Olimpia", text: $teren)
                DatePicker("Data și ora", selection: $dataOra, in: Date()..., displayedComponents: [.date, .hourAndMinute])
                Picker("Durata", selection: $durata) {
                    ForEach([60, 90, 120], id: \.self) { Text("\($0) min").tag($0) }
                }
            }
            Section("Alte detalii") {
                HStack {
                    Text("Preț de om")
                    TextField("opțional", text: $pret)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                    Text("lei").foregroundStyle(.secondary)
                }
                TextField("Mesaj (opțional), ex. adu tricou alb", text: $mesaj, axis: .vertical).lineLimit(2...4)
            }
            Section {
                TextField("Telefonul tău", text: $telefon)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
            } header: {
                Text("Telefon")
            } footer: {
                Text("Jucătorul vede numărul tău, ca să te poată suna.")
            }
            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }
            Section {
                Button(action: trimite) {
                    HStack {
                        Spacer()
                        if seTrimite { ProgressView().tint(.white) } else { Text("Trimite invitația").fontWeight(.semibold) }
                        Spacer()
                    }
                }
                .listRowBackground(poateTrimite ? Tema.accent : Color.gray.opacity(0.35))
                .foregroundStyle(.white)
                .disabled(!poateTrimite)
            }
        }
        .navigationTitle("Ia-l în echipă")
        .onAppear { if telefon.isEmpty { telefon = sesiune.utilizator?.telefon ?? "" } }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } } }
    }

    private func trimite() {
        struct Corp: Encodable {
            let teren: String
            let dataOra: Date
            let durata: Int
            let pret: Int?
            let mesaj: String?
            let telefon: String
        }
        let corp = Corp(
            teren: teren.trimmingCharacters(in: .whitespaces),
            dataOra: dataOra,
            durata: durata,
            pret: Int(pret.filter(\.isNumber)),
            mesaj: mesaj.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : mesaj,
            telefon: telefon
        )
        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                let actualizat = try await ApiClient.shared.cere(
                    "jucatori-liberi/\(anunt.id)/invita", metoda: "POST", corp: corp, ca: AnuntJucator.self
                )
                laTrimis(actualizat)
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}
