import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchBar from "../components/SearchBar.jsx";
import FilterPanel from "../components/FilterPanel.jsx";
import RecommendationList from "../components/RecommendationList.jsx";
import animeApi from "../api/animeApi.js";

function FavoriteCard({ anime }) {
  if (!anime) return null;
  return (
    <div className="card flex gap-4">
      <div className="h-44 w-32 shrink-0 overflow-hidden rounded-xl bg-ink-800">
        {anime.image_url && (
          <img
            src={anime.image_url}
            alt={anime.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-400">Anime Favorit</div>
          <h2 className="mt-1 text-xl font-bold text-white">{anime.title}</h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="pill">★ {anime.score?.toFixed(2)}</span>
          <span className="pill">{anime.episodes} ep</span>
          <span className="pill">{anime.type}</span>
          <span className="pill">{anime.release_year}</span>
          {anime.studio && <span className="pill">{anime.studio}</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          {anime.genres?.map((g) => (
            <span key={g} className="rounded-md bg-accent-500/15 px-1.5 py-0.5 text-[11px] font-medium text-accent-400">
              {g}
            </span>
          ))}
        </div>
        {anime.synopsis && <p className="text-xs leading-relaxed text-slate-400 line-clamp-4">{anime.synopsis}</p>}
      </div>
    </div>
  );
}

function ExecutionBadge({ label, time, accent }) {
  if (time == null) return null;
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${accent}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">{label}</span>
      <span className="text-base font-bold text-white">{time.toFixed(4)} s</span>
    </div>
  );
}

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

  const speedup = useMemo(() => {
    if (!serial?.execution_time || !parallel?.execution_time) return null;
    return serial.execution_time / parallel.execution_time;
  }, [serial, parallel]);

  const efficiency = useMemo(() => {
    if (!speedup || !parallel?.num_workers) return null;
    return speedup / parallel.num_workers;
  }, [speedup, parallel]);

  const handleSelectFavorite = (anime) => {
    setFavorite(anime);
    setSerial(null);
    setParallel(null);
    setParams({ id: String(anime.id) });
  };

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

      <div className="card relative z-40">
        <SearchBar onSelect={handleSelectFavorite} placeholder="Ganti anime favorit..." />
      </div>

      {favorite && <FavoriteCard anime={favorite} />}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <FilterPanel filters={filters} onChange={setFilters} meta={meta} topN={topN} onTopNChange={setTopN} />

          <div className="card space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Eksekusi</h3>
            <div>
              <label className="label">Jumlah worker (paralel)</label>
              <select
                className="input"
                value={numWorkers}
                onChange={(e) => setNumWorkers(Number(e.target.value))}
              >
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

          {(serial || parallel) && (
            <div className="card space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Statistik</h3>
              <div className="flex flex-col gap-2">
                <ExecutionBadge label="Serial" time={serial?.execution_time} accent="border-neon-pink/40 bg-neon-pink/5" />
                <ExecutionBadge
                  label={`Paralel (${parallel?.num_workers ?? numWorkers}w)`}
                  time={parallel?.execution_time}
                  accent="border-accent-500/40 bg-accent-500/5"
                />
                {speedup != null && (
                  <div className="rounded-xl border border-neon-lime/40 bg-neon-lime/5 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Speedup</div>
                    <div className="text-base font-bold text-white">{speedup.toFixed(2)}x</div>
                  </div>
                )}
                {efficiency != null && (
                  <div className="rounded-xl border border-neon-cyan/40 bg-neon-cyan/5 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Efficiency</div>
                    <div className="text-base font-bold text-white">{(efficiency * 100).toFixed(2)}%</div>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Dataset: {(serial?.dataset_size ?? parallel?.dataset_size ?? 0).toLocaleString("id-ID")} anime · Kandidat
                lolos filter: {(serial?.candidate_count ?? parallel?.candidate_count ?? 0).toLocaleString("id-ID")}
              </p>
            </div>
          )}
        </aside>

        <main className="space-y-6">
          {error && <div className="card border-rose-500/40 text-sm text-rose-300">{error}</div>}

          {!favorite && (
            <div className="card text-sm text-slate-400">
              Pilih anime favorit dengan search bar di atas untuk mulai mendapat rekomendasi.
            </div>
          )}

          {favorite && !serial && !parallel && (
            <div className="card text-sm text-slate-400">
              Klik salah satu tombol di samping (Run Serial / Run Parallel) untuk menjalankan similarity search.
            </div>
          )}

          {parallel && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-500" /> Hasil Mode Paralel
                <span className="text-xs font-normal text-slate-400">
                  ({parallel.num_workers} worker · {parallel.execution_time.toFixed(4)} s)
                </span>
              </h3>
              <RecommendationList recommendations={parallel.recommendations} />
            </section>
          )}

          {serial && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-neon-pink" /> Hasil Mode Serial
                <span className="text-xs font-normal text-slate-400">({serial.execution_time.toFixed(4)} s)</span>
              </h3>
              <RecommendationList recommendations={serial.recommendations} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
