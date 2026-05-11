# Laporan Ringkas — Sistem Rekomendasi Anime Menggunakan Komputasi Paralel Berbasis Similarity

## 1. Judul

**Sistem Rekomendasi Anime Menggunakan Komputasi Paralel Berbasis Similarity**

## 2. Latar Belakang

Industri anime memproduksi ratusan judul baru tiap tahun. Banyak penonton kebingungan menentukan
tontonan berikutnya setelah menyelesaikan anime favorit. Sistem rekomendasi berbasis konten
(content-based) menawarkan solusi alami: cari anime lain yang memiliki karakteristik mirip dengan
anime favorit pengguna.

Namun ketika dataset membesar (puluhan ribu judul), perhitungan similarity satu-per-satu menjadi
lambat. Karena similarity antar pasangan anime bersifat **independen**, pekerjaan ini sangat cocok
diakselerasi dengan **komputasi paralel** (embarrassingly parallel).

## 3. Rumusan Masalah

1. Bagaimana menghitung kemiripan dua anime berdasarkan fitur genre, tema, studio, rating, episode,
   dan tahun rilis?
2. Bagaimana mengimplementasikan pencarian similarity secara **serial** vs **paralel** dalam satu
   sistem yang sama?
3. Berapa besar **speedup** dan **efficiency** yang diperoleh dari versi paralel pada dataset
   anime berukuran cukup besar?

## 4. Tujuan

1. Membangun sistem rekomendasi anime content-based yang interaktif dan responsif.
2. Mengimplementasikan dua engine — **serial** dan **parallel multiprocessing** — yang menggunakan
   skoring identik supaya hasil rekomendasinya bit-for-bit sama.
3. Mengukur, memvisualisasikan, dan membandingkan kinerja kedua engine melalui halaman benchmark
   dengan grafik **speedup** dan **efficiency**.

## 5. Dataset

- Sumber: `dataset/anime.csv` — 150 anime nyata (genre, theme, studio, score, episodes, type,
  release year, status, synopsis, image URL).
- Script `backend/preprocessing.py` membersihkan kolom, mengonversi list (genre/theme) menjadi
  comma-separated string, melakukan coercion numerik dengan default aman, dan menyimpan ke SQLite
  (`anime.db`).
- Untuk kebutuhan benchmark, script juga menyintesa duplikat data hingga `--target-size` (default
  10.000) dengan jitter ringan pada `score`, `episodes`, dan `release_year`. Setiap baris sintetik
  ditandai suffix `[synthetic-N]` pada judulnya.

## 6. Metode Similarity

Kombinasi **Jaccard similarity** (untuk set) dan **normalisasi jarak** (untuk numerik), kemudian
dibobotkan.

```
genre_sim   = |G_fav ∩ G_cand| / |G_fav ∪ G_cand|
theme_sim   = |T_fav ∩ T_cand| / |T_fav ∪ T_cand|
studio_sim  = 1 jika studio sama, 0 jika beda
rating_sim  = clamp01(1 - |r_fav - r_cand| / 10)
episode_sim = clamp01(1 - |e_fav - e_cand| / 500)
year_sim    = clamp01(1 - |y_fav - y_cand| / 50)

total_similarity =
    0.40 * genre_sim
  + 0.20 * theme_sim
  + 0.15 * rating_sim
  + 0.10 * episode_sim
  + 0.10 * year_sim
  + 0.05 * studio_sim

similarity_percentage = total_similarity * 100
```

Lihat `backend/similarity.py` untuk implementasi lengkap.

## 7. Implementasi Serial

`backend/serial_engine.py` menjalankan loop tunggal di satu proses Python:

```python
for anime in dataset:
    if anime.id != favorite.id and passes_filters(anime, filters):
        results.append(score_one(favorite, anime))
results.sort(key=lambda r: r["similarity_score"], reverse=True)
return results[:top_n], elapsed, candidate_count
```

Waktu eksekusi dihitung dengan `time.perf_counter()` agar sensitif sampai sub-milidetik.

## 8. Implementasi Paralel

`backend/parallel_engine.py` menggunakan `concurrent.futures.ProcessPoolExecutor` dengan tiga
optimasi yang membuat speedup benar-benar tercapai pada workload ringan ini:

**(a) Persistent process pool.** Pool dibuat sekali di event startup FastAPI dan dipakai ulang
untuk semua request. Biaya spawn proses (~100 ms/proses di macOS dengan `spawn`) hanya dibayar
sekali sepanjang umur server.

**(b) Dataset dikirim ke worker via `initializer`.** Setiap worker process menerima dataset
sekali saat dia di-spawn, kemudian dataset disimpan di module-level globalnya. Untuk setiap
task, main process hanya mengirimkan `(favorite, start_idx, end_idx, filters, top_k)` —
payload kecil dan konstan, tidak bergantung pada ukuran dataset.

**(c) Worker mengembalikan local top-K saja.** Setiap worker mengiterasi slice-nya, menghitung
skor untuk setiap kandidat yang lolos filter, mengurutkan lokal, dan mengembalikan hanya
top-K `(anime_id, score)` ke main process. Main process menggabung top-K dari semua worker,
melakukan single global sort, lalu merekonstruksi objek `Recommendation` lengkap (anime detail +
breakdown + alasan) hanya untuk N kandidat terbaik. Ini memangkas ukuran payload pickling
result-side dari **megabyte** menjadi **kilobyte**.

```python
def _init_worker(dataset):
    _WORKER_STATE["dataset"] = dataset

def _score_range(args):
    favorite, start, end, filters, top_k = args
    dataset = _WORKER_STATE["dataset"]
    scored = []
    for i in range(start, end):
        anime = dataset[i]
        if anime["id"] == favorite["id"] or not passes_filters(anime, filters):
            continue
        score, _ = calculate_similarity(favorite, anime)
        scored.append((anime["id"], score))
    scored.sort(key=lambda t: t[1], reverse=True)
    return scored[:top_k], len(scored)

# inside parallel_similarity_search():
ranges = _make_ranges(len(dataset), num_workers)
worker_args = [(favorite, s, e, filters, top_n) for s, e in ranges]
pool = ensure_pool(dataset, pool_size)              # persistent + initializer-warmed
partial_results = list(pool.map(_score_range, worker_args))
merged = [pair for part, _ in partial_results for pair in part]
merged.sort(key=lambda t: t[1], reverse=True)
top = [score_one(favorite, index[aid]) for aid, _ in merged[:top_n]]
```

Untuk dokumentasi pedagogis, fungsi `process_chunk` versi "klasik"
(`(favorite, materialised_chunk, filters)`) tetap dipertahankan di file yang sama agar pseudocode
dari brief project tetap bisa ditemukan 1:1 di kode.

## 9. Pembagian Tugas Worker

- Dataset dibagi menjadi `num_workers` chunk berukuran (mostly) sama oleh `split_into_chunks`.
- Setiap chunk dijadikan tuple `(favorite, chunk, filters)` dan dikirim ke proses worker.
- Worker meng-iterate chunk-nya secara independen. Tidak ada komunikasi antar worker.
- Jika `num_workers > len(dataset)`, sistem otomatis menurunkannya menjadi `len(dataset)`.

## 10. Penggabungan Hasil

- `pool.map` menjaga urutan hasil sesuai urutan input — masing-masing chunk menghasilkan satu list.
- Proses utama melakukan `flatten` (extend) lalu **single global sort** berdasarkan
  `similarity_score` menurun.
- Output `top_n` di-slice dari hasil sorted.
- Sorting hanya dilakukan di proses utama, bukan di tiap worker, sehingga tidak ada upaya kerja
  ganda.

## 11. Perhitungan Speedup

```
Speedup = waktu_serial / waktu_paralel
```

Pada `backend/benchmark.py`, harness menjalankan serial baseline **satu kali**, lalu menjalankan
parallel engine **satu kali per item** di `worker_options` (mis. `[1, 2, 4, 8]`). Untuk setiap titik:

```python
speedup = serial_time / parallel_time
```

## 12. Perhitungan Efficiency

```
Efficiency = speedup / num_workers
```

Efficiency dilaporkan sebagai pecahan 0..1 dan ditampilkan sebagai persen di UI.

## 13. Hasil Benchmark

Hasil benchmark dilaporkan oleh halaman **/benchmark** dalam tiga bentuk:

1. **Kartu ringkasan** — Dataset size, candidate count, serial time, best speedup.
2. **Tabel** — Mode, Worker, Waktu (s), Speedup, Efficiency.
3. **Tiga grafik Recharts**:
   - **Execution time** (bar) — perbandingan langsung serial vs paralel pada tiap N.
   - **Speedup vs jumlah worker** (line) — termasuk garis ideal (speedup linear).
   - **Efficiency vs jumlah worker** (bar) — biasanya turun saat N melebihi core fisik.

Hasil aktual pada Apple M1 (4 P-core + 4 E-core) dengan dataset 100.000 anime, `top_n = 5`
(best-of-3 per titik):

| Mode             | Worker | Waktu (s) | Speedup | Efficiency |
| ---------------- | ------ | --------- | ------- | ---------- |
| Serial baseline  | 1      | 0.2748    | 1.00x   | 100.00%    |
| Paralel          | 1      | 0.2904    | 0.95x   | 94.63%     |
| Paralel          | 2      | 0.1548    | 1.78x   | 88.77%     |
| Paralel          | 4      | 0.0922    | 2.98x   | 74.54%     |
| Paralel          | 8      | 0.0745    | 3.69x   | 46.11%     |

## 14. Kesimpulan

1. **Implementasi paralel berhasil** memangkas waktu eksekusi similarity search hingga **~3x**
   pada konfigurasi 4 worker dan **~3.7x** pada 8 worker — pada dataset 100.000 anime.
2. Efficiency mencapai **~89%** pada 2 worker dan **~75%** pada 4 worker, menunjukkan bahwa
   workload similarity (yang bersifat embarrassingly parallel) sangat cocok diparalelkan.
3. Speedup tidak linear sempurna karena (a) overhead dispatch + collect via
   `ProcessPoolExecutor`, (b) bagian serial yang tidak terhindarkan (global sort + merge), dan
   (c) arsitektur heterogen Apple M1 (4 P-core + 4 E-core) sehingga ketika worker > 4 sebagian
   pekerjaan jatuh ke E-core yang lebih lambat (manifestasi hukum Amdahl).
4. Tiga optimasi kunci yang membuat paralelisme benar-benar bermanfaat: **(i) persistent process
   pool** (spawn cost dibayar sekali), **(ii) dataset dikirim sekali via `initializer`** (bukan
   per-request), dan **(iii) worker hanya mengembalikan local top-K** (bukan seluruh hasil
   skoring). Tanpa tiga optimasi ini, overhead serialization dominan sehingga paralel justru
   lebih lambat dari serial untuk workload yang per-itemnya ringan.
5. Pendekatan content-based + parallel multiprocessing terbukti **praktis** untuk sistem
   rekomendasi anime berskala menengah hingga besar, dengan trade-off yang dapat diukur dan
   divisualisasikan langsung dari UI.
