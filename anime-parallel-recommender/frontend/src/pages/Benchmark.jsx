import React, { useCallback, useEffect, useMemo, useState } from "react";
import SearchBar from "../components/SearchBar.jsx";
import FilterPanel from "../components/FilterPanel.jsx";
import BenchmarkChart from "../components/BenchmarkChart.jsx";
import RecommendationList from "../components/RecommendationList.jsx";
import HintStrip, { PlayMiniIcon, SearchMiniIcon } from "../components/HintStrip.jsx";
import FavoriteCard from "../components/FavoriteCard.jsx";
import NewSearchBanner from "../components/NewSearchBanner.jsx";
import animeApi from "../api/animeApi.js";

const DEFAULT_WORKER_OPTIONS = [1, 2, 4, 8];

export default function Benchmark() {
  const [meta, setMeta] = useState(null);
  const [favorite, setFavorite] = useState(null);
  const [filters, setFilters] = useState({});
  const [topN, setTopN] = useState(10);
  const [selectedWorkers, setSelectedWorkers] = useState(DEFAULT_WORKER_OPTIONS);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [benchmarkView, setBenchmarkView] = useState("data");

  useEffect(() => {
    animeApi.meta().then(setMeta).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (report) setBenchmarkView("data");
  }, [report]);

  const handleSelectFavorite = (anime) => {
    setFavorite(anime);
    setReport(null);
  };

  const handleStartNewBenchmarkFlow = useCallback(() => {
    setFavorite(null);
    setReport(null);
    setError(null);
  }, []);

  const toggleWorker = (w) => {
    setSelectedWorkers((cur) =>
      cur.includes(w) ? cur.filter((x) => x !== w) : [...cur, w].sort((a, b) => a - b),
    );
  };

  const effectiveTopN = topN && topN >= 1 ? topN : 10;

  const runBenchmark = async () => {
    if (!favorite) return;
    try {
      setError(null);
      setLoading(true);
      const res = await animeApi.benchmark({
        anime_id: favorite.id,
        worker_options: selectedWorkers.length ? selectedWorkers : DEFAULT_WORKER_OPTIONS,
        filters,
        top_n: effectiveTopN,
      });
      setReport(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const best = useMemo(() => {
    if (!report?.parallel_results?.length) return null;
    return report.parallel_results.reduce((a, b) => (b.speedup > a.speedup ? b : a));
  }, [report]);

  const hasReport = !!report;

  const filterWorkerBlock = (
    <>
      <FilterPanel filters={filters} onChange={setFilters} meta={meta} topN={topN} onTopNChange={setTopN} />

      <div className="card w-full space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Worker yang diuji</h3>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 4, 6, 8, 12, 16].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => toggleWorker(w)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
                selectedWorkers.includes(w)
                  ? "border-accent-500 bg-accent-500/15 text-white"
                  : "border-white/10 text-slate-300 hover:bg-white/5"
              }`}
            >
              {w}w
            </button>
          ))}
        </div>
        <button
          className="btn-primary w-full"
          type="button"
          onClick={runBenchmark}
          disabled={!favorite || loading}
        >
          {loading ? "Mengukur..." : "Run Benchmark"}
        </button>
      </div>
    </>
  );

  const reportDataPanel = report && (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Dataset</div>
          <div className="text-2xl font-bold text-white">{report.dataset_size.toLocaleString("id-ID")}</div>
        </div>
        <div className="card">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Kandidat</div>
          <div className="text-2xl font-bold text-white">{report.candidate_count.toLocaleString("id-ID")}</div>
        </div>
        <div className="card">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Serial Time</div>
          <div className="text-2xl font-bold text-white">{report.serial_time.toFixed(4)} s</div>
        </div>
        <div className="card">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Best Speedup</div>
          <div className="text-2xl font-bold text-white">
            {best ? `${best.speedup.toFixed(2)}x` : "-"}
            {best && <span className="ml-1 text-xs font-normal text-slate-400">@ {best.num_workers}w</span>}
          </div>
        </div>
      </div>

      <BenchmarkChart serialTime={report.serial_time} parallelResults={report.parallel_results} />

      <div className="card overflow-x-auto">
        <h3 className="mb-3 text-base font-semibold text-white">Tabel perbandingan</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-4 font-medium">Mode</th>
              <th className="py-2 pr-4 font-medium">Worker</th>
              <th className="py-2 pr-4 font-medium">Waktu (s)</th>
              <th className="py-2 pr-4 font-medium">Speedup</th>
              <th className="py-2 pr-4 font-medium">Efficiency</th>
            </tr>
          </thead>
          <tbody className="text-slate-200">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-semibold text-neon-pink">Serial (baseline)</td>
              <td className="py-2 pr-4">1</td>
              <td className="py-2 pr-4">{report.serial_time.toFixed(4)}</td>
              <td className="py-2 pr-4">1.00x</td>
              <td className="py-2 pr-4">100.00%</td>
            </tr>
            {report.parallel_results.map((p) => (
              <tr key={p.num_workers} className="border-b border-white/5">
                <td className="py-2 pr-4 font-semibold text-accent-400">Paralel</td>
                <td className="py-2 pr-4">{p.num_workers}</td>
                <td className="py-2 pr-4">{p.parallel_time.toFixed(4)}</td>
                <td className="py-2 pr-4">{p.speedup.toFixed(2)}x</td>
                <td className="py-2 pr-4">{(p.efficiency * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-slate-500">
          Speedup = waktu_serial / waktu_paralel · Efficiency = speedup / num_workers
        </p>
      </div>
    </>
  );

  const reportRecommendationsPanel = report && (
    <section className="min-w-0">
      <h3 className="mb-3 text-base font-semibold text-white">
        Top {effectiveTopN} rekomendasi (hasil identik untuk semua mode)
      </h3>
      <RecommendationList recommendations={report.recommendations} pageSize={4} />
    </section>
  );

  const tabBtn = (id, label) => (
    <button
      key={id}
      type="button"
      disabled={loading}
      onClick={() => setBenchmarkView(id)}
      className={`min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all sm:flex-none sm:px-8 ${
        benchmarkView === id
          ? "bg-white/[0.12] text-white shadow-sm ring-1 ring-white/15"
          : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
      } ${loading ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start gap-4">
        <span className="pill">Benchmark</span>
        <h1 className="display-heading text-[44px] leading-[1.05] md:text-[56px]">
          Ukur <span className="emphasis">speedup</span> komputasi paralel.
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-400 md:text-base">
          Jalankan sekali untuk mengukur waktu eksekusi serial vs paralel dengan berbagai jumlah worker. Sistem menghitung{" "}
          <span className="text-slate-200">speedup</span> dan <span className="text-slate-200">efficiency</span> secara otomatis.
        </p>
      </header>

      {!hasReport && (
        <div className="card relative z-40 w-full min-w-0">
          <SearchBar onSelect={handleSelectFavorite} placeholder="Cari anime untuk dijadikan basis benchmark..." />
        </div>
      )}

      {!favorite ? (
        <div className="flex w-full min-w-0 flex-col gap-6">
          {filterWorkerBlock}
          {error && <div className="card w-full border-rose-500/40 text-sm text-rose-300">{error}</div>}
          <HintStrip
            icon={<SearchMiniIcon className="opacity-90" />}
            title="Pilih judul untuk benchmark"
            description="Gunakan search bar di atas sebagai basis perbandingan serial vs paralel. Setelah memilih anime, klik Run Benchmark."
          />
        </div>
      ) : hasReport ? (
        <div className="flex w-full min-w-0 flex-col gap-6">
          <NewSearchBanner
            onStartNew={handleStartNewBenchmarkFlow}
            title="Mulai benchmark dari awal"
            description="Ganti anime acuan, worker, dan filter — kembali ke tampilan awal seperti sebelum mengukur."
            buttonLabel="Mulai dari awal"
            captionMobile="Kembali ke pencarian & filter"
            captionDesktop="Memuat ulang pencarian, filter, dan worker"
          />

          <FavoriteCard anime={favorite} eyebrow="Basis benchmark" />

          {error && <div className="card w-full border-rose-500/40 text-sm text-rose-300">{error}</div>}

          <div className="card flex w-full flex-col gap-1 p-1 sm:flex-row sm:items-center sm:justify-center sm:gap-1">
            {tabBtn("data", "Data benchmark")}
            {tabBtn("recommendations", "Rekomendasi")}
          </div>

          {loading ? (
            <div className="card flex items-center gap-3 text-sm text-slate-300">
              <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-accent-500" />
              Mengeksekusi serial baseline + {selectedWorkers.length} variasi paralel...
            </div>
          ) : (
            <div className="min-w-0 space-y-6">
              {benchmarkView === "data" ? reportDataPanel : reportRecommendationsPanel}
            </div>
          )}
        </div>
      ) : (
        <>
          <FavoriteCard anime={favorite} eyebrow="Basis benchmark" />
          <div className="flex w-full min-w-0 flex-col gap-6">
            {filterWorkerBlock}
            {error && <div className="card w-full border-rose-500/40 text-sm text-rose-300">{error}</div>}
            {loading ? (
              <div className="card flex items-center gap-3 text-sm text-slate-300">
                <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-accent-500" />
                Mengeksekusi serial baseline + {selectedWorkers.length} variasi paralel...
              </div>
            ) : (
              <HintStrip
                icon={<PlayMiniIcon className="opacity-90" />}
                title="Jalankan pengukuran"
                description="Klik Run Benchmark untuk mengukur baseline serial dan tiap konfigurasi worker paralel. Grafik dan tabel muncul setelah selesai."
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
