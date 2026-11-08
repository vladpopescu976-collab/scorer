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
    @State private var oreBlocatePentru: Teren?

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

                        // Acțiunile, scurte, pe un singur rând.
                        HStack(spacing: 8) {
                            actiune("Editează", "pencil") { deEditat = teren }
                            actiune("Opțiuni", "plus.circle") { optiuniPentru = teren }
                            actiune("Blochează", "lock") { deBlocatPeTeren = teren }
                        }
                        .listRowInsets(.init(top: 4, leading: 16, bottom: 8, trailing: 16))

                        // În loc de lista întreagă: un rezumat, iar detaliile la cerere.
                        Button { oreBlocatePentru = teren } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "calendar.badge.clock")
                                    .foregroundStyle(Tema.accent)
                                Text("Ore blocate").foregroundStyle(.primary)
                                Spacer()
                                Text(rezumatBlocari(teren))
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                                Image(systemName: "chevron.right")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(.tertiary)
                            }
                            .font(.subheadline)
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
        .sheet(item: $oreBlocatePentru) { teren in
            NavigationStack {
                OreBlocateView(teren: teren, blocari: blocari) {
                    await incarca()
                    return blocari
                }
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

    private func actiune(_ titlu: String, _ simbol: String, _ fa: @escaping () -> Void) -> some View {
        Button(action: fa) {
            Label(titlu, systemImage: simbol)
                .font(.footnote.weight(.medium))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background(Tema.accent.opacity(0.1), in: .capsule)
                .foregroundStyle(Tema.accent)
        }
        .buttonStyle(.borderless)
    }

    /// „3 săptămâna asta“ sau „Niciuna“, ca să vezi dintr-o privire.
    private func rezumatBlocari(_ teren: Teren) -> String {
        let acum = Date()
        let viitoare = blocari.filter { $0.terenId == teren.id && $0.sfarsit > acum }
        guard !viitoare.isEmpty else { return "Niciuna" }
        let peste7 = Calendar.current.date(byAdding: .day, value: 7, to: acum) ?? acum
        let saptamana = viitoare.filter { $0.inceput < peste7 }.count
        return saptamana > 0 ? "\(saptamana) în 7 zile" : "\(viitoare.count) viitoare"
    }
}
