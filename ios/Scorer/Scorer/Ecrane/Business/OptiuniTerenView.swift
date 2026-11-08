import SwiftUI

/// Ce se poate adăuga peste prețul orei, scris de proprietar: încălzire balon,
/// nocturnă, închiriere echipament. Denumirea și prețul le pune el, nu sunt
/// alese dintr-o listă fixă — fiecare bază sportivă are altceva de oferit.
struct OptiuniTerenView: View {
    let teren: Teren
    let laFinal: () -> Void

    @Environment(\.dismiss) private var inchide

    @State private var optiuni: [OptiuneTeren]
    @State private var nume = ""
    @State private var pret = ""
    @State private var peOra = true
    @State private var laIntuneric = false
    @State private var laFrig = false
    @State private var eroare: String?
    @State private var seTrimite = false
    @State private var deSters: OptiuneTeren?

    init(teren: Teren, laFinal: @escaping () -> Void) {
        self.teren = teren
        self.laFinal = laFinal
        _optiuni = State(initialValue: teren.optiuni ?? [])
    }

    var body: some View {
        Form {
            if optiuni.isEmpty {
                Section {
                    Text("Nicio opțiune încă. Adaugă mai jos ce se plătește peste prețul orei.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            } else {
                Section {
                    ForEach(optiuni) { optiune in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(optiune.nume).font(.subheadline.weight(.medium))
                            Text(descriere(optiune))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .swipeActions {
                            Button("Șterge", role: .destructive) { deSters = optiune }
                        }
                    }
                } header: {
                    Text("Opțiunile terenului")
                } footer: {
                    Text("Trage un rând spre stânga ca să îl ștergi. Rezervările deja făcute rămân neschimbate.")
                }
            }

            Section {
                TextField("Denumire (ex. Încălzire balon)", text: $nume)
                HStack {
                    TextField("Preț", text: $pret)
                        .keyboardType(.decimalPad)
                    Text("RON").foregroundStyle(.secondary)
                }

                if !laIntuneric {
                    Picker("Se taxează", selection: $peOra) {
                        Text("pe oră").tag(true)
                        Text("o dată pe rezervare").tag(false)
                    }
                }

                // Două reguli automate, care se exclud: nocturna după apus și
                // încălzirea în sezonul rece. Fără ele, clientul o bifează singur.
                Toggle("Automat după apus (nocturnă)", isOn: Binding(
                    get: { laIntuneric },
                    set: { valoare in withAnimation(.snappy) { laIntuneric = valoare; if valoare { laFrig = false } } }
                ))
                Toggle("Automat în sezonul rece (încălzire balon)", isOn: Binding(
                    get: { laFrig },
                    set: { valoare in withAnimation(.snappy) { laFrig = valoare; if valoare { laIntuneric = false } } }
                ))
            } header: {
                Text("Adaugă o opțiune")
            } footer: {
                if laIntuneric {
                    Text("Se pune singură, doar pe orele fără lumină naturală. Apusul se calculează din dată și din orașul terenului, deci la 18:00 în decembrie intră, iar în iunie nu. Se taxează pe oră.")
                } else if laFrig {
                    Text("Se pune singură pe rezervările din octombrie până în aprilie. Pe oră, se taxează toate orele rezervării.")
                } else {
                    Text("Manual: clientul o vede la rezervare și o poate bifa.")
                }
            }

            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }

            Section {
                Button(action: adauga) {
                    HStack {
                        Spacer()
                        if seTrimite {
                            ProgressView().tint(.white)
                        } else {
                            Text("Adaugă opțiunea").fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(seTrimite || nume.trimmingCharacters(in: .whitespaces).isEmpty)
                .listRowBackground(
                    nume.trimmingCharacters(in: .whitespaces).isEmpty
                        ? Color.gray.opacity(0.35) : Tema.accent
                )
                .foregroundStyle(.white)
            }
        }
        .navigationTitle(teren.nume)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Închide") { inchide() } }
        }
        .confirmationDialog(
            "Ștergi „\(deSters?.nume ?? "")”?",
            isPresented: .init(get: { deSters != nil }, set: { if !$0 { deSters = nil } }),
            titleVisibility: .visible
        ) {
            Button("Șterge", role: .destructive) {
                if let deSters { sterge(deSters) }
            }
            Button("Renunță", role: .cancel) { deSters = nil }
        } message: {
            Text("Nu mai apare la rezervări noi. Cele deja făcute rămân neschimbate.")
        }
    }

    private func descriere(_ optiune: OptiuneTeren) -> String {
        let baza = "\(Int(optiune.pret)) RON \(optiune.peOra ? "/ oră" : "o dată")"
        if optiune.automatLaIntuneric { return baza + " · automat după apus" }
        if optiune.laFrig { return baza + " · automat în sezonul rece" }
        return baza + " · manual"
    }

    private func adauga() {
        // Virgula e ce tastează majoritatea pe telefon.
        let valoare = Double(pret.replacingOccurrences(of: ",", with: "."))
        guard let valoare, valoare > 0 else {
            eroare = "Prețul trebuie să fie mai mare decât 0."
            return
        }

        struct Corp: Encodable {
            let terenId: String
            let nume: String
            let pret: Double
            let peOra: Bool
            let automatLaIntuneric: Bool
            let automatLaFrig: Bool
        }

        eroare = nil
        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                let noua: OptiuneTeren = try await ApiClient.shared.cere(
                    "business/optiuni",
                    metoda: "POST",
                    corp: Corp(
                        terenId: teren.id,
                        nume: nume.trimmingCharacters(in: .whitespaces),
                        pret: valoare,
                        peOra: laIntuneric ? true : peOra,
                        automatLaIntuneric: laIntuneric,
                        automatLaFrig: laFrig
                    ),
                    ca: OptiuneTeren.self
                )
                optiuni.append(noua)
                nume = ""
                pret = ""
                laIntuneric = false
                laFrig = false
                laFinal()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }

    private func sterge(_ optiune: OptiuneTeren) {
        struct Corp: Encodable { let optiuneId: String }
        struct Raspuns: Decodable { let sters: Bool }

        eroare = nil
        deSters = nil
        Task {
            do {
                let _: Raspuns = try await ApiClient.shared.cere(
                    "business/optiuni", metoda: "DELETE",
                    corp: Corp(optiuneId: optiune.id), ca: Raspuns.self
                )
                optiuni.removeAll { $0.id == optiune.id }
                laFinal()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}
