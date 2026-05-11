import React from "react";

function Section({ title, children }) {
  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

function Formula({ children }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-[13px] text-slate-200">
      {children}
    </pre>
  );
}

export default function AboutAlgorithm() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start gap-4">
        <span className="pill">Algoritma</span>
        <h1 className="display-heading text-[44px] leading-[1.05] md:text-[56px]">
          Cara kerja, <span className="emphasis">terbuka.</span>
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-400 md:text-base">
          Halaman ini menjelaskan dasar matematis sistem rekomendasi anime ini dan bagaimana komputasi
          paralel dimanfaatkan untuk mempercepat similarity search.
        </p>
      </header>

      <Section title="1. Content-based filtering">
        <p>
          Sistem ini menggunakan pendekatan <span className="font-semibold text-white">content-based filtering</span>.
          Setiap anime direpresentasikan oleh fitur intrinsiknya (genre, tema, studio, rating, episode, tahun rilis),
          lalu sistem mencari kandidat yang paling mirip dengan anime favorit user. Tidak memerlukan rating dari user
          lain sehingga sangat cocok untuk dataset publik.
        </p>
      </Section>

      <Section title="2. Jaccard similarity untuk genre & tema">
        <p>
          Genre dan tema bersifat set (kumpulan tag tanpa urutan). Kemiripan dua set diukur dengan{" "}
          <span className="font-semibold text-white">Jaccard similarity</span>:
        </p>
        <Formula>{`J(A, B) = |A ∩ B| / |A ∪ B|`}</Formula>
        <p>
          Contoh: Anime A = &#123;Action, Adventure, Fantasy&#125;, Anime B = &#123;Action, Fantasy,
          Supernatural&#125;. Maka |A ∩ B| = 2, |A ∪ B| = 4, dan J(A,B) = 0.5.
        </p>
      </Section>

      <Section title="3. Similarity per fitur">
        <p>Setiap fitur menghasilkan nilai di [0, 1]:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <span className="font-semibold text-white">Genre similarity</span> — Jaccard pada list genre.
          </li>
          <li>
            <span className="font-semibold text-white">Theme similarity</span> — Jaccard pada list tema.
          </li>
          <li>
            <span className="font-semibold text-white">Studio similarity</span> — 1 jika studio identik, 0 jika tidak.
          </li>
          <li>
            <span className="font-semibold text-white">Rating similarity</span> — semakin dekat rating, semakin tinggi:
            <Formula>{`rating_sim = clamp01(1 - |r_fav - r_cand| / 10)`}</Formula>
          </li>
          <li>
            <span className="font-semibold text-white">Episode similarity</span> — semakin dekat jumlah episode:
            <Formula>{`episode_sim = clamp01(1 - |e_fav - e_cand| / 500)`}</Formula>
          </li>
          <li>
            <span className="font-semibold text-white">Year similarity</span> — semakin dekat tahun rilis:
            <Formula>{`year_sim = clamp01(1 - |y_fav - y_cand| / 50)`}</Formula>
          </li>
        </ul>
      </Section>

      <Section title="4. Bobot total similarity">
        <p>Setiap fitur diberi bobot, lalu dijumlahkan menjadi skor akhir.</p>
        <Formula>
{`total_similarity =
    0.40 * genre_sim
  + 0.20 * theme_sim
  + 0.15 * rating_sim
  + 0.10 * episode_sim
  + 0.10 * year_sim
  + 0.05 * studio_sim

similarity_percentage = total_similarity * 100`}
        </Formula>
        <p>
          Hasil akhir di-sort menurun. Sistem mengembalikan top-N rekomendasi yang memenuhi filter user (genre, min
          rating, max episodes, tahun rilis, tipe, dan status).
        </p>
      </Section>

      <Section title="5. Serial similarity search">
        <p>
          Mode serial menelusuri seluruh dataset dengan satu proses Python. Pseudocode:
        </p>
        <Formula>
{`function serial_similarity_search(favorite, dataset):
    results = []
    for anime in dataset:
        if anime.id != favorite.id and passes_filters(anime):
            score = calculate_similarity(favorite, anime)
            results.append((anime, score))
    sort results by score desc
    return top_n(results)`}
        </Formula>
      </Section>

      <Section title="6. Parallel similarity search">
        <p>
          Mode paralel membagi dataset menjadi <span className="font-semibold text-white">chunk</span> yang dieksekusi
          oleh beberapa proses sekaligus menggunakan{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5">concurrent.futures.ProcessPoolExecutor</code>. Karena
          perhitungan similarity antara favorit dan kandidat lainnya bersifat independen, ini adalah pekerjaan{" "}
          <span className="font-semibold text-white">embarrassingly parallel</span>.
        </p>
        <p>Tiga optimasi penting di implementasi nyata:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <span className="font-semibold text-white">Persistent process pool.</span> Pool dibuat sekali saat FastAPI
            startup, dipakai ulang sepanjang umur server.
          </li>
          <li>
            <span className="font-semibold text-white">Dataset via `initializer`.</span> Setiap worker menerima dataset
            sekali saat spawn dan menyimpannya di module global. Per-request hanya mengirim{" "}
            <code className="rounded bg-black/40 px-1 py-0.5">(favorite, start, end, filters, top_k)</code>.
          </li>
          <li>
            <span className="font-semibold text-white">Worker hanya mengembalikan local top-K.</span> Memangkas ukuran
            payload pickling dari megabyte ke kilobyte; objek lengkap direkonstruksi di main process hanya untuk N
            terbaik.
          </li>
        </ul>
        <Formula>
{`function parallel_similarity_search(favorite, dataset, num_workers, top_n):
    ranges = split_indices(len(dataset), num_workers)
    pool   = ensure_pool(dataset, num_workers)       # persistent + initializer
    args   = [(favorite, s, e, filters, top_n) for s, e in ranges]
    partials = pool.map(score_range, args)           # parallel
    merged = flatten(partials)
    sort merged by score desc
    top    = [score_one(favorite, dataset[id])
              for (id, _) in merged[:top_n]]         # build full objects in main
    return top

function score_range(favorite, start, end, filters, top_k):
    dataset = worker_state.dataset                   # diisi sekali via initializer
    out = []
    for i in [start, end):
        anime = dataset[i]
        if anime.id != favorite.id and passes_filters(anime, filters):
            out.append((anime.id, calculate_similarity(favorite, anime)))
    sort out by score desc
    return out[:top_k]                               # local top-K only`}
        </Formula>
        <p>
          Sorting global dan reconstruction objek `Recommendation` lengkap dilakukan setelah semua worker selesai —
          sehingga tidak ada bottleneck serial di dalam worker.
        </p>
      </Section>

      <Section title="7. Speedup & Efficiency">
        <p>Kinerja paralel diukur dengan dua metrik klasik:</p>
        <Formula>
{`Speedup    = waktu_serial / waktu_paralel
Efficiency = speedup / jumlah_worker`}
        </Formula>
        <p>
          Pada kondisi ideal Speedup = N dan Efficiency = 100%. Pada praktiknya hukum{" "}
          <span className="font-semibold text-white">Amdahl</span> (bagian serial yang tidak dapat dihilangkan) dan
          overhead spawn proses + serialisasi data membuat angkanya lebih rendah, terutama ketika jumlah worker
          melebihi jumlah core fisik.
        </p>
      </Section>

      <Section title="8. Catatan implementasi">
        <ul className="ml-5 list-disc space-y-1">
          <li>
            Fungsi worker ditulis sebagai fungsi top-level (<code className="rounded bg-black/40 px-1.5 py-0.5">_score_range</code>,{" "}
            <code className="rounded bg-black/40 px-1.5 py-0.5">process_chunk</code>) supaya dapat di-pickle dan
            dikirim ke worker process.
          </li>
          <li>
            Dataset dimuat satu kali ke memori main process saat FastAPI start, lalu dikirim sekali ke setiap worker
            via <code className="rounded bg-black/40 px-1.5 py-0.5">initializer</code>.
          </li>
          <li>
            Endpoint <code className="rounded bg-black/40 px-1.5 py-0.5">/benchmark</code> mengukur best-of-3 untuk
            setiap konfigurasi worker (server-side) agar angka stabil terhadap jitter scheduler — terutama relevan
            pada CPU heterogen seperti Apple Silicon (P-core + E-core).
          </li>
          <li>
            Jika jumlah worker melebihi ukuran dataset, sistem menurunkannya otomatis sesuai jumlah chunk yang
            terbentuk.
          </li>
        </ul>
      </Section>
    </div>
  );
}
