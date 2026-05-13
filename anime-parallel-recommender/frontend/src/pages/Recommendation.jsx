import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchBar from "../components/SearchBar.jsx";
import FilterPanel from "../components/FilterPanel.jsx";
import RecommendationList from "../components/RecommendationList.jsx";
import HintStrip, { PlayMiniIcon, SearchMiniIcon } from "../components/HintStrip.jsx";
import FavoriteCard from "../components/FavoriteCard.jsx";
import NewSearchBanner from "../components/NewSearchBanner.jsx";
import animeApi from "../api/animeApi.js";

export default function Recommendation() {
  const [params, setParams] = useSearchParams();
  const initialId = Number(params.get("id")) || null;

  const [meta, setMeta] = useState(null);
  const [favorite, setFavorite] = useState(null);
  const [filters, setFilters] = useState({});
  const [topN, setTopN] = useState(10);
  const [numWorkers, setNumWorkers] = useState(4);

  const [serial, setSerial] = useState(null);
  const [parallel, setParallel] = useState(null);
  const [loading, setLoading] = useState({ serial: false, parallel: false });
  const [error, setError] = useState(null);

  useEffect(() => {
    animeApi.meta().then(setMeta).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!initialId) return;
    animeApi
      .detail(initialId)
      .then(setFavorite)
      .catch((e) => setError(e.message));
  }, [initialId]);

  const handleSelectFavorite = (anime) => {
    setFavorite(anime);
    setSerial(null);
    setParallel(null);
    setParams({ id: String(anime.id) });
  };

  const handleStartNewRecommendationFlow = useCallback(() => {
    setFavorite(null);
    setSerial(null);
    setParallel(null);
    setError(null);
    setParams({});
  }, [setParams]);

  const effectiveTopN = topN && topN >= 1 ? topN : 10;

  const runSerial = useCallback(async () => {
    if (!favorite) return;
    try {
      setError(null);
      setLoading((l) => ({ ...l, serial: true }));
      const res = await animeApi.recommendSerial({
        anime_id: favorite.id,
        filters,
        top_n: effectiveTopN,
      });
      setSerial(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading((l) => ({ ...l, serial: false }));
    }
  }, [favorite, filters, effectiveTopN]);

  const runParallel = useCallback(async () => {
    if (!favorite) return;
    try {
      setError(null);
      setLoading((l) => ({ ...l, parallel: true }));
      const res = await animeApi.recommendParallel({
        anime_id: favorite.id,
        num_workers: numWorkers,
        filters,
        top_n: effectiveTopN,
      });
      setParallel(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading((l) => ({ ...l, parallel: false }));
    }
  }, [favorite, filters, effectiveTopN, numWorkers]);

  const filterAndExecution = (
    <>
      <FilterPanel filters={filters} onChange={setFilters} meta={meta} topN={topN} onTopNChange={setTopN} />

      <div className="card w-full space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Eksekusi</h3>
        <div>
          <label className="label">Jumlah worker (paralel)</label>
          <select className="input" value={numWorkers} onChange={(e) => setNumWorkers(Number(e.target.value))}>
            {[1, 2, 4, 6, 8, 12, 16].map((n) => (
              <option key={n} value={n}>
                {n} worker
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn-outline w-full"
          type="button"
          onClick={runSerial}
          disabled={!favorite || loading.serial}
        >
          {loading.serial ? "Menjalankan serial..." : "Run Serial Similarity Search"}
        </button>
        <button
          className="btn-primary w-full"
          type="button"
          onClick={runParallel}
          disabled={!favorite || loading.parallel}
        >
          {loading.parallel ? "Menjalankan paralel..." : "Run Parallel Similarity Search"}
        </button>
      </div>
    </>
  );

  const hasSearchResults = !!(serial || parallel);

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start gap-4">
        <span className="pill">Rekomendasi</span>
        <h1 className="display-heading text-[44px] leading-[1.05] md:text-[56px]">
          Anime <span className="emphasis">favoritmu</span>, dipersonalisasi.
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-400 md:text-base">
          Pilih anime favorit, atur filter sesuai selera, lalu jalankan{" "}
          <span className="text-slate-200">Run Serial</span> atau{" "}
          <span className="text-slate-200">Run Parallel</span> untuk melihat perbedaan waktu eksekusi.
        </p>
      </header>

      {!hasSearchResults && (
        <div className="card relative z-40 w-full min-w-0">
          <SearchBar onSelect={handleSelectFavorite} placeholder="Ganti anime favorit..." />
        </div>
      )}

      {!favorite ? (
        <div className="flex w-full min-w-0 flex-col gap-6">
          {filterAndExecution}
          {error && <div className="card w-full border-rose-500/40 text-sm text-rose-300">{error}</div>}
          <HintStrip
            icon={<SearchMiniIcon className="opacity-90" />}
            title="Cari anime favoritmu"
            description="Ketik di search bar di atas, lalu atur filter. Setelah memilih judul, jalankan Serial atau Parallel untuk melihat rekomendasi."
          />
        </div>
      ) : hasSearchResults ? (
        <div className="flex w-full min-w-0 flex-col gap-6">
          <NewSearchBanner
            onStartNew={handleStartNewRecommendationFlow}
            title="Mulai alur rekomendasi dari awal"
            description="Ganti anime acuan, atur filter, dan jalankan Serial atau Parallel lagi — tampilan akan kembali seperti sebelum hasil ditampilkan."
            captionMobile="Kembali ke filter &amp; pencarian"
            captionDesktop="Memuat ulang filter &amp; bilah pencarian"
          />

          {favorite && <FavoriteCard anime={favorite} eyebrow="Anime acuan (pilihanmu)" />}

          {error && <div className="card w-full border-rose-500/40 text-sm text-rose-300">{error}</div>}

          {parallel && (
            <section className="min-w-0">
              <h3 className="mb-3 flex flex-wrap items-center gap-2 text-base font-semibold text-white">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-accent-500" /> Hasil Mode Paralel
                <span className="text-xs font-normal text-slate-400">
                  ({parallel.num_workers} worker · {parallel.execution_time.toFixed(4)} s)
                </span>
              </h3>
              <RecommendationList recommendations={parallel.recommendations} pageSize={4} />
            </section>
          )}

          {serial && (
            <section className="min-w-0">
              <h3 className="mb-3 flex flex-wrap items-center gap-2 text-base font-semibold text-white">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-neon-pink" /> Hasil Mode Serial
                <span className="text-xs font-normal text-slate-400">({serial.execution_time.toFixed(4)} s)</span>
              </h3>
              <RecommendationList recommendations={serial.recommendations} pageSize={4} />
            </section>
          )}
        </div>
      ) : (
        <>
          <FavoriteCard anime={favorite} />
          <div className="flex w-full min-w-0 flex-col gap-6">
            {filterAndExecution}
            {error && <div className="card w-full border-rose-500/40 text-sm text-rose-300">{error}</div>}
            <HintStrip
              icon={<PlayMiniIcon className="opacity-90" />}
              title="Siap menjalankan similarity search"
              description="Gunakan Run Serial atau Run Parallel pada panel Eksekusi di atas. Setelah selesai, daftar rekomendasi muncul di halaman ini."
            />
          </div>
        </>
      )}
    </div>
  );
}
