# Anime Recommender

Sistem rekomendasi anime berbasis **content-based similarity** dengan **bukti komputasi paralel** —
dibangun untuk UAS mata kuliah Komputasi Paralel.

Website ini tidak hanya merekomendasikan anime mirip, tapi juga **membandingkan langsung** kecepatan
pencarian similarity secara **serial** vs **paralel multiprocessing**, lengkap dengan tabel benchmark
dan grafik **speedup** + **efficiency**. Frontend dirancang dengan design language modern
bertema gelap, animated WebGL background, dan glass-morphism UI.

Cara menjalankan Backend dan Frontend (setelah clone):

```bash
# Backend
cd anime-parallel-recommender/backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python preprocessing.py --target-size 0              # wajib sekali: isi anime.db dari dataset/anime.csv (~17k anime asli)
uvicorn main:app --reload --port 8000

# Frontend (terminal terpisah)
cd anime-parallel-recommender/frontend
npm install
npm run dev
# buka http://localhost:5173
```

> **Clone baru:** `dataset/anime.csv` sudah ada di repo — cukup jalankan `preprocessing.py --target-size 0`.
> Jangan pakai `--target-size 10000` kecuali sengaja ingin menambah baris palsu `[synthetic-N]` untuk eksperimen.
> Rebuild dataset dari dump MAL: lihat [§4.2](#42-backend) (`merge_datasets.py`).

---

## Daftar Isi

1. [Masalah yang diselesaikan](#1-masalah-yang-diselesaikan)
2. [Teknologi](#2-teknologi)
3. [Struktur folder](#3-struktur-folder)
4. [Cara menjalankan](#4-cara-menjalankan)
5. [Cara kerja algoritma similarity](#5-cara-kerja-algoritma-similarity)
6. [Serial vs parallel similarity search](#6-serial-vs-parallel-similarity-search)
7. [Speedup & Efficiency](#7-speedup--efficiency)
8. [Contoh hasil benchmark](#8-contoh-hasil-benchmark)
9. [API reference](#9-api-reference)
10. [Tampilan & UX frontend](#10-tampilan--ux-frontend)

---

## 1. Masalah yang diselesaikan

Banyak penonton anime kebingungan menentukan tontonan berikutnya setelah menyelesaikan anime favorit.
Sistem ini meminta satu anime favorit, lalu mencari anime lain yang paling mirip berdasarkan **genre,
tema, studio, rating, jumlah episode, dan tahun rilis**.

Sekaligus, project ini membuktikan secara empiris bahwa **komputasi paralel** mempercepat similarity
search yang independen antar pasangan anime. Itulah kenapa website ini menyediakan tombol
**Run Serial** dan **Run Parallel** plus halaman **Benchmark** dengan grafik.

## 2. Teknologi

| Lapis              | Teknologi                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Frontend           | React 18, Vite, React Router, Tailwind CSS, Recharts                                           |
| Frontend visual    | `@paper-design/shaders-react` (WebGL `MeshGradient`), Instrument Serif + Inter (Google Fonts)  |
| Backend            | Python 3.10+, FastAPI, Uvicorn, SQLAlchemy                                                     |
| Database           | SQLite (`backend/anime.db`)                                                                    |
| Paralelisasi       | `concurrent.futures.ProcessPoolExecutor` (multiprocessing)                                     |
| Data preprocessing | Pandas                                                                                         |

## 3. Struktur folder

```
anime-parallel-recommender/
├── backend/
│   ├── main.py              # FastAPI app + endpoints
│   ├── database.py          # SQLAlchemy engine + session
│   ├── models.py            # Anime ORM model
│   ├── schemas.py           # Pydantic schemas
│   ├── similarity.py        # Skoring similarity (Jaccard + weighted)
│   ├── serial_engine.py     # Serial similarity search
│   ├── parallel_engine.py   # Parallel similarity search (ProcessPoolExecutor)
│   ├── benchmark.py         # Harness serial vs parallel
│   ├── merge_datasets.py    # Gabung dump MAL → dataset/anime.csv (opsional)
│   ├── preprocessing.py     # Loader CSV → SQLite (opsional: sintesis benchmark)
│   ├── anime.db             # Dibuat otomatis oleh preprocessing.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── favicon.svg      # Sparkle logo (4-point AI star, purple gradient)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnimeCard.jsx        # Card + ScoreRing + DetailModal (click-to-expand)
│   │   │   ├── SearchBar.jsx
│   │   │   ├── FilterPanel.jsx      # Includes custom NumberInput (− / + stepper, validation)
│   │   │   ├── AmbientBackdrop.jsx  # Fixed full-screen WebGL MeshGradient shader
│   │   │   ├── BenchmarkChart.jsx
│   │   │   └── RecommendationList.jsx
│   │   ├── pages/           # Home, Recommendation, Benchmark, AboutAlgorithm
│   │   ├── api/animeApi.js
│   │   ├── App.jsx          # Floating nav-pill, ScrollToTop, Brand (sparkle + "Anime")
│   │   ├── main.jsx
│   │   └── index.css        # Tailwind + .glass-panel, .nav-pill, custom stepper, etc.
│   ├── index.html
│   ├── tailwind.config.js   # Custom palette (ink, accent purple, neon), serif + sans fonts
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
├── dataset/
│   ├── anime.csv            # Dataset gabungan (~17k anime nyata, hasil merge)
│   ├── anime.sample-150.csv # Contoh kecil (backup)
│   └── raw/                 # Sumber: anime.csv + AnimeList.csv (tidak di-commit)
├── README.md                # File ini
└── laporan-ringkas.md
```

## 4. Cara menjalankan

### 4.1 Prasyarat

- **Python ≥ 3.10**
- **Node.js ≥ 18** (untuk frontend)

### 4.2 Backend

```bash
cd anime-parallel-recommender/backend

# 1. Buat virtualenv (opsional tapi disarankan)
python -m venv .venv
source .venv/bin/activate          # Linux/macOS
# .venv\Scripts\activate           # Windows

# 2. Install dependency
pip install -r requirements.txt

# 3. Preprocessing dataset (wajib setelah clone — membuat backend/anime.db)
#    Membaca ../dataset/anime.csv yang sudah ada di repo (~17.600 judul asli).
python preprocessing.py --target-size 0

# (Opsional) Rebuild dataset/anime.csv dari dump MAL:
#    Ekstrak anime.csv + AnimeList.csv ke ../dataset/raw/, lalu:
# python merge_datasets.py
# python preprocessing.py --target-size 0

# 4. Jalankan backend FastAPI
uvicorn main:app --reload --port 8000
```

API tersedia di `http://localhost:8000`. Dokumentasi interaktif Swagger ada di `http://localhost:8000/docs`.

> **Catatan paralelisasi:** dengan ~17k anime asli, selisih waktu serial vs paralel sudah terlihat jelas.
> Opsional: `--target-size 10000` hanya jika `anime.csv` kecil dan ingin menambah baris sintetis
> `[synthetic-N]` untuk skala benchmark — tidak dipakai di setup default.

### 4.3 Frontend

```bash
cd anime-parallel-recommender/frontend
npm install
npm run dev
```

Buka `http://localhost:5173`. Vite akan mem-proxy `/api/*` ke `http://localhost:8000` secara otomatis.

## 5. Cara kerja algoritma similarity

Sistem menggunakan **content-based filtering** dengan **Jaccard similarity** untuk fitur set
(genre, tema) dan rumus normalisasi jarak untuk fitur numerik (rating, episode, tahun).

```
genre_sim   = |G_fav ∩ G_cand| / |G_fav ∪ G_cand|        (Jaccard)
theme_sim   = |T_fav ∩ T_cand| / |T_fav ∪ T_cand|        (Jaccard)
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

Implementasi lengkap ada di `backend/similarity.py`. Hasil rekomendasi juga menyertakan **breakdown
per fitur** dan **alasan rekomendasi** dalam bahasa natural.

## 6. Serial vs parallel similarity search

### 6.1 Serial (`backend/serial_engine.py`)

```python
for anime in dataset:
    if anime.id != favorite.id and passes_filters(anime, filters):
        score, _ = calculate_similarity(favorite, anime)
        scored.append((anime["id"], score))
scored.sort(key=lambda t: t[1], reverse=True)
top = [score_one(favorite, index[aid]) for aid, _ in scored[:top_n]]
```

Hanya satu proses, satu CPU. Skor dihitung untuk seluruh kandidat, sorting global, lalu
**hanya top-N** yang dibangun jadi objek `Recommendation` lengkap (dengan breakdown + alasan).
Ini sengaja sama strukturnya dengan worker paralel agar perbandingan benar-benar fair.

### 6.2 Parallel (`backend/parallel_engine.py`)

Tiga optimasi penting:

1. **Persistent process pool.** Pool dibuat di event startup FastAPI dan dipakai ulang —
   biaya spawn ~100 ms/proses (macOS `spawn`) dibayar sekali.
2. **Dataset dikirim ke worker via `initializer`.** Setiap worker menerima dataset sekali saat
   spawn dan menyimpannya di module global. Per-request hanya mengirim
   `(favorite, start, end, filters, top_k)` — payload kecil dan konstan.
3. **Worker mengembalikan local top-K saja.** Mengurangi payload result-side dari megabyte
   menjadi kilobyte; objek `Recommendation` lengkap direkonstruksi di main process hanya untuk
   N item terbaik.

```python
def _score_range(args):
    favorite, start, end, filters, top_k = args
    dataset = _WORKER_STATE["dataset"]            # diisi oleh initializer
    scored = []
    for i in range(start, end):
        anime = dataset[i]
        if anime["id"] == favorite["id"] or not passes_filters(anime, filters):
            continue
        score, _ = calculate_similarity(favorite, anime)
        scored.append((anime["id"], score))
    scored.sort(key=lambda t: t[1], reverse=True)
    return scored[:top_k], len(scored)

ranges = _make_ranges(len(dataset), num_workers)
worker_args = [(favorite, s, e, filters, top_n) for s, e in ranges]
pool = ensure_pool(dataset, pool_size)            # persistent
partial_results = list(pool.map(_score_range, worker_args))
merged = [p for part, _ in partial_results for p in part]
merged.sort(key=lambda t: t[1], reverse=True)
top = [score_one(favorite, index[aid]) for aid, _ in merged[:top_n]]
```

Karena similarity antar pasangan anime sepenuhnya independen, ini adalah pekerjaan
**embarrassingly parallel** — kondisi ideal untuk multiprocessing.

## 7. Speedup & Efficiency

```
Speedup    = waktu_serial / waktu_paralel
Efficiency = speedup / jumlah_worker
```

Speedup ideal = N (linear). Efficiency ideal = 100%. Pada praktiknya:

- **Hukum Amdahl**: bagian serial yang tidak bisa dihilangkan (sorting, merging, dispatch) membatasi
  maksimum speedup.
- **Overhead spawn proses + serialisasi data** signifikan untuk dataset kecil.
- Ketika `num_workers > jumlah core fisik`, efficiency turun karena kontekstual switching.

Karena itu pada halaman Benchmark Anda akan melihat speedup naik tajam pada N = 2..4 lalu mendatar
atau bahkan turun pada N = 8..16.

## 8. Contoh hasil benchmark

Hasil aktual pada **Apple M1 (4 performance + 4 efficiency core)** dengan dataset **100.000 anime**,
`top_n = 5`, setelah pool warm-up — endpoint `/benchmark` mengambil **best-of-3** secara internal
agar angka stabil:

| Mode             | Worker | Waktu (s) | Speedup | Efficiency |
| ---------------- | ------ | --------- | ------- | ---------- |
| Serial baseline  | 1      | 0.2748    | 1.00x   | 100.00%    |
| Paralel          | 1      | 0.2904    | 0.95x   | 94.63%     |
| Paralel          | 2      | 0.1548    | 1.78x   | 88.77%     |
| Paralel          | 4      | 0.0922    | 2.98x   | 74.54%     |
| Paralel          | 8      | 0.0745    | 3.69x   | 46.11%     |

Cerita yang muncul dari angka ini:

- **n = 1 ≈ serial** → sanity check, paralelisme dengan 1 worker tidak menambah apa-apa.
- **n = 2 → 1.78x** → mendekati linear (efficiency 89%).
- **n = 4 → 2.98x** → masih sangat baik, memanfaatkan keempat performance core M1.
- **n = 8 → 3.69x** → speedup naik tapi efficiency turun ke 46% karena efficiency core M1 lebih
  lambat dan overhead dispatch + merge sudah signifikan (hukum Amdahl).

> Hasilmu pasti berbeda — buka halaman **/benchmark** untuk menjalankan langsung di mesinmu.

## 9. API reference

| Method | Path                      | Deskripsi                                                    |
| ------ | ------------------------- | ------------------------------------------------------------ |
| GET    | `/`                       | Health check + ukuran dataset                                |
| GET    | `/anime/search?query=...` | Substring search by title (top 20)                           |
| GET    | `/anime/{id}`             | Detail satu anime                                            |
| GET    | `/anime/meta/dataset`     | Metadata dataset (genre, type, studio, range tahun) untuk UI |
| POST   | `/recommend/serial`       | Similarity search serial                                     |
| POST   | `/recommend/parallel`     | Similarity search paralel (`num_workers`)                    |
| POST   | `/benchmark`              | Serial baseline + 1 paralel run per item `worker_options`    |
| POST   | `/admin/reload-dataset`   | Reload dataset dari SQLite ke memori                         |

### Contoh request `/recommend/parallel`

```json
{
  "anime_id": 1,
  "num_workers": 4,
  "filters": {
    "genre": "Action",
    "min_rating": 8,
    "max_episodes": 100,
    "type": "TV",
    "start_year": 2000,
    "end_year": 2025
  },
  "top_n": 10
}
```

### Contoh response `/benchmark`

```json
{
  "dataset_size": 10000,
  "candidate_count": 7891,
  "serial_time": 4.2473,
  "parallel_results": [
    { "num_workers": 2, "parallel_time": 2.4012, "speedup": 1.77, "efficiency": 0.88 },
    { "num_workers": 4, "parallel_time": 1.2998, "speedup": 3.27, "efficiency": 0.82 },
    { "num_workers": 8, "parallel_time": 0.9501, "speedup": 4.47, "efficiency": 0.56 }
  ],
  "recommendations": [ /* ...top_n recommendation objects... */ ]
}
```

---

## 10. Tampilan & UX frontend

Halaman web dibangun dengan design language modern bertema gelap, dengan fokus pada
keterbacaan, sentuhan premium, dan presentasi yang clean untuk panel filter, benchmark, dan
rekomendasi.

### 10.1 Design language

- **Palette** — `ink` (slate gelap), `accent` violet (`#a78bfa` → `#7c3aed`), dan aksen `neon`
  (pink, cyan, lime) untuk badge / status.
- **Tipografi** — **Instrument Serif** (italic-friendly serif) untuk display heading & emphasis,
  **Inter** untuk body, label, dan UI text. Heading utama memakai pola
  *"Anime <em>favoritmu</em>, dipersonalisasi"* dengan `.emphasis` span yang berubah warna +
  text-shadow ungu pada hover.
- **Background** — komponen [`AmbientBackdrop`](frontend/src/components/AmbientBackdrop.jsx)
  merender WebGL `MeshGradient` dari `@paper-design/shaders-react` secara fixed full-screen.
  Animasi distortion + swirl yang halus, dengan dark veil + edge vignette agar konten foreground
  tetap terbaca.
- **Glass-morphism** — utility `.glass-panel` di `index.css` menggabungkan
  `backdrop-filter: blur(22px) saturate(180%)` + border tipis + inner highlight + diagonal sheen.
  Diterapkan ke `.card`, `.pill`, `.stat-card`, `.nav-pill`, dan `.input` agar semua surface
  terasa konsisten seperti frosted glass.
- **Floating pill navbar** — header `fixed inset-x-0 top-4` dengan brand sparkle, link
  (`Home`, `Rekomendasi`, `Benchmark`), dan CTA (`Cara kerja`, `Mulai`). [`ScrollToTop`](frontend/src/App.jsx)
  me-reset scroll position setiap kali user pindah route.

### 10.2 Komponen kustom

| Komponen          | Lokasi                                            | Catatan                                                                                                                                                  |
| ----------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NumberInput`     | `components/FilterPanel.jsx`                      | Horizontal `−` / `+` stepper (28×28 px hit-area), digit cap otomatis dari prop `max`, auto-clamp ke `[min, max]` on blur, mode `required` dengan inline rose warning |
| `ScoreRing`       | `components/AnimeCard.jsx`                        | SVG circle + `<text>` dengan `textAnchor="middle"` dan `dominantBaseline="central"` agar persen text presisi tengah; font-size adaptif (14/16/18 px)      |
| `DetailModal`     | `components/AnimeCard.jsx`                        | Click-to-expand modal untuk anime: judul lengkap, sinopsis, genre, tema, dan reason. Body scroll lock + keyboard `Esc` + click-outside dismiss            |
| `AmbientBackdrop` | `components/AmbientBackdrop.jsx`                  | WebGL `MeshGradient` sebagai fixed background di belakang seluruh konten                                                                                  |
| `ScrollToTop`     | `App.jsx`                                         | Reset scroll position pada setiap perubahan route                                                                                                          |
| `Brand`           | `App.jsx`                                         | Inline sparkle SVG (4-point AI star + accent kecil, gradient `#e9d5ff` → `#6d28d9`) + nama *"Anime"* dengan A italic                                       |

### 10.3 Validasi input filter

| Field                | Range                              | Behavior                                                                                                          |
| -------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Min rating           | `[0, 10]`                          | Cap **2 digit** (typing "100" auto-ditolak digit ke-3). Soft-clamp ke `max` selama mengetik.                       |
| Mulai / Sampai tahun | `[meta.min_year, meta.max_year]`   | Cap **4 digit**. Soft-clamp ke `max` selama mengetik. Below-`min` baru di-clamp **on blur** (agar partial input "1" → "1988" tetap mungkin). |
| Max episodes         | `[0, ∞)`                           | Tanpa cap atas (anime panjang seperti One Piece tetap bisa difilter).                                              |
| Jumlah rekomendasi   | `[1, 50]`, **required**            | Bisa dihapus dengan backspace. Blur dengan empty atau `0` → inline **rose warning** *("Tidak boleh kosong/Tidak valid — minimal 1, ulangi.")*. API call defensive: jatuh balik ke `10` kalau invalid. |

### 10.4 Logo & branding

- **Favicon** (`frontend/public/favicon.svg`) — 4-point sparkle dengan gradient violet
  (`#e9d5ff` → `#a78bfa` → `#6d28d9`) plus mini accent sparkle. Tanpa background, transparan
  agar menyatu dengan warna tab browser apapun.
- **Browser title** — `Anime Recommender`.
- **Brand di nav** — sparkle inline (versi tanpa glow) + teks *"Anime"* (A italik, "nime"
  upright, font Instrument Serif).

---

## Catatan untuk dosen / penguji

- **Bukti paralelisasi** ada di `backend/parallel_engine.py` (`ProcessPoolExecutor` + `split_into_chunks` +
  fungsi worker `process_chunk` yang berjalan di proses terpisah).
- **Visualisasi** ada di halaman **/benchmark** (tabel + 3 grafik: waktu, speedup, efficiency).
- **Penjelasan algoritma** lengkap di halaman **/about** dan di `laporan-ringkas.md`.
- **Stack visual** dirinci di [Section 10](#10-tampilan--ux-frontend) — kustom Tailwind utilities,
  WebGL shader background, dan komponen interaktif dengan validasi inline.
