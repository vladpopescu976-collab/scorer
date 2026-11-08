import SwiftUI

struct AutentificareView: View {
    @Environment(Sesiune.self) private var sesiune
    @Environment(\.dismiss) private var inchide

    @State private var rolAles: Rol?
    @State private var modInregistrare = false
    @State private var arataSetari = false

    var body: some View {
        NavigationStack {
            if let rol = rolAles {
                FormularAutentificare(rol: rol, modInregistrare: $modInregistrare) {
                    rolAles = nil
                }
            } else {
                AlegereRol { rol in
                    rolAles = rol
                    modInregistrare = false
                }
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Închide") { inchide() }
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Server", systemImage: "server.rack") { arataSetari = true }
                    }
                }
            }
        }
        .sheet(isPresented: $arataSetari) {
            NavigationStack { SetariServerView() }
        }
        .background { FundalAutentificare() }
        // Conectarea se face dintr-o foaie deschisă peste aplicație; odată
        // reușită, foaia nu mai are ce arăta.
        .onChange(of: sesiune.esteConectat) { _, conectat in
            if conectat { inchide() }
        }
    }
}

private struct AlegereRol: View {
    let alege: (Rol) -> Void

    var body: some View {
        VStack(spacing: 28) {
            Spacer()

            VStack(spacing: 14) {
                SiglaScorer(marime: 64)
                VStack(spacing: 6) {
                    Text("Bine ai venit pe Scorer")
                        .font(.title.bold())
                        .multilineTextAlignment(.center)
                    Text("Alege tipul de cont ca să continui.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
            }

            VStack(spacing: 12) {
                CardRol(
                    titlu: "Cont Personal",
                    descriere: "Caută terenuri și fă rezervări în câteva secunde.",
                    simbol: "figure.run"
                ) { alege(.personal) }

                CardRol(
                    titlu: "Cont Business",
                    descriere: "Administrează-ți terenurile și cererile primite.",
                    simbol: "building.2"
                ) { alege(.business) }
            }

            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 20)
    }
}

private struct CardRol: View {
    let titlu: String
    let descriere: String
    let simbol: String
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            HStack(spacing: 14) {
                Image(systemName: simbol)
                    .font(.title3)
                    .foregroundStyle(Tema.accent)
                    .frame(width: 48, height: 48)
                    .background(Tema.accent.opacity(0.12), in: .rect(cornerRadius: 14, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Text(titlu).font(.headline)
                    Text(descriere)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.leading)
                }

                Spacer(minLength: 4)
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .sticlaAuth()
        }
        .apasabil()
    }
}

private struct FormularAutentificare: View {
    let rol: Rol
    @Binding var modInregistrare: Bool
    let inapoi: () -> Void

    @Environment(Sesiune.self) private var sesiune

    @State private var nume = ""
    @State private var email = ""
    @State private var parola = ""
    @State private var confirmareParola = ""
    @State private var telefon = ""
    @State private var eroare: String?
    @State private var seTrimite = false
    @State private var arataSetariServer = false
    /// Adresa la care tocmai am trimis linkul de confirmare. Cât timp e
    /// completată, formularul e înlocuit de ecranul de așteptare.
    @State private var asteaptaConfirmare: String?
    @State private var emailulAPlecat = true
    @State private var linkRetrimis = false
    @State private var contulEGata = false
    @State private var oras = ""
    @State private var parolaCeruta = false
    /// Câmpurile în plus de la înregistrare se arată doar când e nevoie de ele.
    @State private var numeFirma = ""
    @State private var site = ""

    private var titlu: String { rol == .business ? "Cont Business" : "Cont Personal" }

    var body: some View {
        continut
            .navigationTitle(titlu)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Înapoi", systemImage: "chevron.left", action: inapoi)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Server", systemImage: "server.rack") { arataSetariServer = true }
                }
            }
            .sheet(isPresented: $arataSetariServer) {
                NavigationStack { SetariServerView() }
            }
    }

    @ViewBuilder
    private var continut: some View {
        if let adresa = asteaptaConfirmare {
            asteptareConfirmare(adresa)
        } else {
            formular
        }
    }

    /// După înregistrare contul există, dar nu se poate folosi până nu e
    /// confirmată adresa — deci nu are rost să rămână formularul pe ecran.
    private func asteptareConfirmare(_ adresa: String) -> some View {
        VStack(spacing: 18) {
            Spacer()

            Image(systemName: "envelope.badge")
                .font(.system(size: 46))
                .foregroundStyle(Tema.accent)

            VStack(spacing: 8) {
                Text("Verifică-ți emailul")
                    .font(.title2.bold())
                Text("Am trimis un link de confirmare la \(adresa). Apasă-l ca să îți activezi contul, apoi autentifică-te.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            if !emailulAPlecat {
                Text("Contul a fost creat, dar emailul nu a putut fi trimis. Încearcă să ceri linkul din nou.")
                    .font(.footnote)
                    .foregroundStyle(.orange)
                    .multilineTextAlignment(.center)
            }

            if let eroare {
                Text(eroare)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: 10) {
                Button {
                    Task { await retrimite(adresa) }
                } label: {
                    HStack {
                        if seTrimite { ProgressView() }
                        Text(linkRetrimis ? "Link trimis" : "Trimite din nou linkul")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Tema.accent.opacity(0.12), in: .rect(cornerRadius: 12))
                    .foregroundStyle(Tema.accent)
                }
                .disabled(seTrimite || linkRetrimis)

                Button("Mergi la autentificare") {
                    asteaptaConfirmare = nil
                    modInregistrare = false
                    parola = ""
                    eroare = nil
                }
                .font(.subheadline.weight(.medium))
            }

            Spacer()
        }
        .padding(24)
    }

    private var formular: some View {
        ScrollView {
            VStack(spacing: 20) {
                VStack(spacing: 12) {
                    SiglaScorer(marime: 52)
                    VStack(spacing: 5) {
                        Text(modInregistrare ? "Creează un cont" : "Bine ai revenit")
                            .font(.title2.bold())
                        Text(modInregistrare
                             ? (rol == .business ? "Pentru terenurile tale." : "Pentru rezervări rapide.")
                             : "Intră în cont ca să continui.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.top, 4)

                VStack(spacing: 16) {
                    ComutatorAuth(inregistrare: $modInregistrare)

                    VStack(spacing: 12) {
                        if modInregistrare {
                            CampAuth(
                                titlu: rol == .business ? "Persoană de contact" : "Nume complet",
                                simbol: "person", text: $nume, tipContinut: .name
                            )
                        }

                        CampAuth(
                            titlu: "Adresă de email", simbol: "envelope", text: $email,
                            tipTastatura: .emailAddress, tipContinut: .emailAddress,
                            faraMajuscule: true
                        )

                        CampAuth(
                            titlu: "Parolă", simbol: "lock", text: $parola, parola: true,
                            tipContinut: modInregistrare ? .newPassword : .password
                        )
                        if modInregistrare { PutereaParolei(parola: parola) }

                        if modInregistrare {
                            CampAuth(
                                titlu: "Confirmă parola", simbol: "lock.rotation",
                                text: $confirmareParola, parola: true, tipContinut: .newPassword,
                                // Scris cât tastezi, nu abia la trimitere.
                                eroare: !confirmareParola.isEmpty && confirmareParola != parola
                                    ? "Parolele nu coincid." : nil
                            )
                            CampAuth(
                                titlu: "Telefon", simbol: "phone", text: $telefon,
                                tipTastatura: .phonePad, tipContinut: .telephoneNumber
                            )
                            CampAuth(
                                titlu: "Oraș", simbol: "mappin.and.ellipse", text: $oras,
                                tipContinut: .addressCity
                            )

                            if rol == .business {
                                CampAuth(
                                    titlu: "Denumirea firmei", simbol: "building.2",
                                    text: $numeFirma, tipContinut: .organizationName
                                )
                                CampAuth(
                                    titlu: "Site (opțional)", simbol: "globe", text: $site,
                                    tipTastatura: .URL, tipContinut: .URL, faraMajuscule: true
                                )
                            }

                            Text("Parola trebuie să aibă cel puțin 8 caractere, dintre care o literă și o cifră.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 4)
                        }
                    }

                    if !modInregistrare {
                        HStack {
                            Spacer()
                            Button(parolaCeruta ? "Link trimis pe email" : "Ai uitat parola?") {
                                cereParolaNoua()
                            }
                            .font(.footnote.weight(.medium))
                            .foregroundStyle(Tema.accent)
                            .disabled(parolaCeruta || seTrimite)
                        }
                        if parolaCeruta {
                            Text("Dacă adresa are un cont, linkul de schimbare a parolei e pe drum. Este valabil o oră.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }

                    if contulEGata {
                        Label("Contul a fost creat. Autentifică-te cu datele lui.", systemImage: "checkmark.circle.fill")
                            .font(.footnote)
                            .foregroundStyle(Tema.accent)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    if let eroare {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(eroare)
                                .font(.footnote)
                                .foregroundStyle(Tema.ocupat)
                            Button("Schimbă adresa serverului") { arataSetariServer = true }
                                .font(.footnote)
                            Text("Server: \(Config.textServer)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Tema.ocupat.opacity(0.08), in: .rect(cornerRadius: 12, style: .continuous))
                    }

                    ButonPrincipal(
                        titlu: modInregistrare ? "Creează contul" : "Autentificare",
                        seIncarca: seTrimite,
                        actiune: trimite
                    )

                    ButoaneSociale(
                        continua: { furnizor, token, nume in
                            try await sesiune.autentificaSocial(
                                furnizor: furnizor, token: token, nume: nume, rol: rol
                            )
                        },
                        laEroare: { eroare = $0 }
                    )
                    .padding(.top, 4)

                    if seTrimite {
                        Text("Prima autentificare după o pauză poate dura până la un minut, cât pornește serverul.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    if modInregistrare {
                        // Acceptarea prin acțiune, notată pe server ca dată.
                        Text("Creând contul accepți termenii și condițiile și politica de confidențialitate, disponibile pe scorer.ro.")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                }
                .sticlaAuth()
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .scrollIndicators(.hidden)
    }

    private func cereParolaNoua() {
        let adresa = email.trimmingCharacters(in: .whitespaces)
        guard adresa.contains("@") else {
            eroare = "Scrie întâi adresa de email."
            return
        }
        eroare = nil
        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                try await sesiune.cereParolaNoua(email: adresa)
                parolaCeruta = true
            } catch {
                eroare = error.localizedDescription
            }
        }
    }

    private func retrimite(_ adresa: String) async {
        eroare = nil
        seTrimite = true
        defer { seTrimite = false }
        do {
            try await sesiune.retrimiteConfirmarea(email: adresa)
            linkRetrimis = true
            emailulAPlecat = true
        } catch {
            eroare = error.localizedDescription
        }
    }

    private func trimite() {
        eroare = nil

        if modInregistrare {
            guard parola.count >= 8 else {
                eroare = "Parola trebuie să aibă cel puțin 8 caractere."
                return
            }
            guard parola == confirmareParola else {
                eroare = "Parolele nu coincid."
                return
            }
            if rol == .business, numeFirma.trimmingCharacters(in: .whitespaces).count < 2 {
                eroare = "Completează denumirea firmei."
                return
            }
        }

        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                if modInregistrare {
                    let adresa = email.trimmingCharacters(in: .whitespaces)
                    let rezultat = try await sesiune.inregistreaza(
                        nume: nume.trimmingCharacters(in: .whitespaces),
                        email: adresa,
                        parola: parola,
                        telefon: telefon.trimmingCharacters(in: .whitespaces),
                        oras: oras.trimmingCharacters(in: .whitespaces),
                        numeFirma: numeFirma.trimmingCharacters(in: .whitespaces),
                        site: site.trimmingCharacters(in: .whitespaces),
                        rol: rol
                    )
                    switch rezultat {
                    case .gata:
                        // Contul e deja folosibil; trecem direct la autentificare.
                        contulEGata = true
                        modInregistrare = false
                        parola = ""
                        confirmareParola = ""
                    case .asteaptaConfirmarea(let aPlecat):
                        emailulAPlecat = aPlecat
                        linkRetrimis = false
                        asteaptaConfirmare = adresa
                    }
                } else {
                    try await sesiune.autentifica(
                        email: email.trimmingCharacters(in: .whitespaces),
                        parola: parola,
                        rol: rol
                    )
                }
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}
