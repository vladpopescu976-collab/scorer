import SwiftUI

struct TerenuriBusinessView: View {
    @State private var terenuri: [Teren] = []
    @State private var blocari: [Blocare] = []
    @State private var seIncarca = true
    @State private var eroare: String?
    @State private var deBlocatPeTeren: Teren?
    @State private var deEditat: Teren?
    @State private var optiuniPentru: Teren?
    @State private var adaugaTeren = false

    var body: some View {
        List {
            if seIncarca {
                HStack { Spacer(); ProgressView(); Spacer() }
            } else if terenuri.isEmpty {
                StareGoala(
                    simbol: "sportscourt",
                    titlu: "Niciun teren adăugat",
                    detaliu: "Adaugă primul teren cu butonul din dreapta sus.",
                    titluActiune: "Adaugă un teren",
                    actiune: { adaugaTeren = true }
                )
                .listRowSeparator(.hidden)
            } else {
                ForEach(terenuri) { teren in
                    Section {
                        HStack(spacing: 12) {
                            PozaTeren(cale: teren.poze.first, sport: teren.sport)
                                .frame(width: 54, height: 54)
                                .clipShape(.rect(cornerRadius: 10))

                            VStack(alignment: .leading, spacing: 2) {
                                Text(teren.nume).font(.headline)
                                Text("\(teren.sport.eticheta) · \(teren.oras)")
                                    .font(.caption).foregroundStyle(.secondary)
                                Text("\(Int(teren.pretPeOra)) RON / oră · \(String(format: "%02d", teren.oraDeschidere)):00–\(String(format: "%02d", teren.oraInchidere)):00")
                                    .font(.caption2).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if !teren.activ {
                                Text("Inactiv")
                                    .font(.caption2)
                                    .padding(.horizontal, 7).padding(.vertical, 3)
                                    .background(Color.secondary.opacity(0.15), in: .capsule)
                            }
                        }

                        Button("Modifică terenul", systemImage: "pencil") {
                            deEditat = teren
                        }
                        .font(.footnote)

                        Button("Opțiuni și tarife în plus", systemImage: "plus.circle") {
                            optiuniPentru = teren
                        }
                        .font(.footnote)

                        Button("Blochează ore", systemImage: "lock") {
                            deBlocatPeTeren = teren
                        }
                        .font(.footnote)

                        ForEach(blocari.filter { $0.terenId == teren.id }) { blocare in
                            HStack {
                                VStack(alignment: .leading, spacing: 1) {
                                    Label(
                                        blocare.clientNume ?? blocare.motiv ?? "Blocat",
                                        systemImage: blocare.clientNume == nil ? "lock.fill" : "phone.fill"
                                    )
                                    .font(.subheadline)
                                    Text("\(blocare.inceput.ziScurta) · \(blocare.inceput.oraScurta)–\(blocare.sfarsit.oraScurta)")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Button(role: .destructive) {
                                    Task { await deblocheaza(blocare) }
                                } label: {
                                    Image(systemName: "trash").font(.caption)
                                }
                                .buttonStyle(.borderless)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Terenurile mele")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Adaugă teren", systemImage: "plus") { adaugaTeren = true }
            }
        }
        .refreshable { await incarca() }
        .task {
            await incarca()
            #if DEBUG
            // Deschide opțiunile primului teren, pentru verificări automate.
            if ProcessInfo.processInfo.environment["SCORER_OPTIUNI"] == "1" {
                optiuniPentru = terenuri.first
            }
            #endif
        }
        .sheet(isPresented: $adaugaTeren) {
            NavigationStack {
                FormularTerenView { Task { await incarca() } }
            }
        }
        .sheet(item: $deEditat) { teren in
            NavigationStack {
                FormularTerenView(teren: teren) { Task { await incarca() } }
            }
        }
        .sheet(item: $optiuniPentru) { teren in
            NavigationStack {
                OptiuniTerenView(teren: teren) { Task { await incarca() } }
            }
        }
        .sheet(item: $deBlocatPeTeren) { teren in
            NavigationStack {
                BlocheazaOreView(terenuri: [teren], terenInitial: teren) { Task { await incarca() } }
            }
        }
        .alert("Eroare", isPresented: .init(get: { eroare != nil }, set: { if !$0 { eroare = nil } })) {
            Button("OK", role: .cancel) { eroare = nil }
        } message: {
            Text(eroare ?? "")
        }
    }

    private func incarca() async {
        async let t: [Teren]? = try? await ApiClient.shared.cere("business/terenuri", ca: [Teren].self)
        async let b: [Blocare]? = try? await ApiClient.shared.cere("business/blocari", ca: [Blocare].self)
        terenuri = await t ?? []
        blocari = await b ?? []
        seIncarca = false
    }

    private func deblocheaza(_ blocare: Blocare) async {
        do {
            try await ApiClient.shared.cereFaraRaspuns(
                "business/blocari/\(blocare.id)", metoda: "DELETE"
            )
            await incarca()
        } catch {
            eroare = error.localizedDescription
        }
    }
}
