import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar.jsx";
import animeApi from "../api/animeApi.js";

function StatCard({ label, value, subtitle }) {
  return (
    <div className="stat-card">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-1.5 font-display text-3xl text-white">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
    </div>
  );
}


function StepCard({ idx, title, desc, italic }) {
  return (
    <div className="group flex flex-col items-center px-4 text-center">
      <div className="glass-panel mb-5 flex h-16 w-16 items-center justify-center rounded-full font-display text-2xl italic text-accent-300 transition-all duration-300 ease-out group-hover:scale-110">
        {idx}
      </div>
      <h3 className="font-display text-2xl text-white">
        {title} <span className="italic text-slate-500 transition-colors duration-300 group-hover:text-accent-300">{italic}</span>
      </h3>
      <p className="mt-2 max-w-[26ch] text-sm leading-relaxed text-slate-400">{desc}</p>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    animeApi
      .meta()
      .then(setMeta)
      .catch((e) => setErr(e.message));
  }, []);

  const datasetLabel = meta ? meta.dataset_size.toLocaleString("id-ID") : "...";

  return (
    <div className="space-y-24">
      {/* HERO */}
      <section className="relative flex flex-col items-center pt-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-32 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-accent-500/20 blur-[140px]"
        />
        <span className="pill pill-dot">
          {meta ? `${datasetLabel} anime siap direkomendasikan` : "Memuat dataset..."}
        </span>

        <h1 className="display-heading mt-7 text-[56px] leading-[1.02] md:text-[80px] lg:text-[96px]">
          Temukan anime <span className="emphasis">favoritmu</span>,
          <br />
          dipercepat <span className="italic">paralel.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg">
          Sistem rekomendasi berbasis content-similarity yang membandingkan eksekusi{" "}
          <span className="text-slate-200">serial</span> dan{" "}
          <span className="text-slate-200">parallel multiprocessing</span> beserta speedup &
          efficiency.
        </p>

        <div className="mt-9 w-full max-w-2xl">
          <SearchBar
            onSelect={(a) => navigate(`/recommend?id=${a.id}`)}
            placeholder="Cari anime — misal: Naruto, Steins;Gate, Spy x Family..."
          />
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/recommend" className="btn-primary">
            Mulai rekomendasi
          </Link>
          <Link to="/benchmark" className="btn-ghost">
            Lihat benchmark
          </Link>
        </div>
      </section>

      {err && (
        <div className="card border-rose-500/40 text-sm text-rose-300">
          Backend belum aktif atau dataset belum diisi: {err}. Jalankan{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5">python preprocessing.py</code> lalu{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5">uvicorn main:app --reload</code>.
        </div>
      )}

      {/* STATS STRIP */}
      <section>
        <div className="mb-6 flex items-center justify-center">
          <span className="pill">Statistik dataset</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Dataset" value={datasetLabel} subtitle="anime tersimpan" />
          <StatCard
            label="Genre"
            value={meta?.genres?.length ?? "..."}
            subtitle="kategori unik"
          />
          <StatCard
            label="Studio"
            value={meta?.studios?.length ?? "..."}
            subtitle="studio animasi"
          />
          <StatCard
            label="Tahun"
            value={meta ? `${meta.min_year}-${meta.max_year}` : "..."}
            subtitle="rentang rilis"
          />
        </div>
      </section>

      {/* PROCESS */}
      <section className="glass-panel rounded-[28px] py-16">
        <div className="flex flex-col items-center text-center">
          <span className="pill">Proses</span>
          <h2 className="display-heading mt-5 text-[42px] leading-[1.05] md:text-[56px]">
            Rekomendasi, <span className="emphasis">tanpa ribet.</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm text-slate-400 md:text-base">
            Tiga langkah singkat untuk membuktikan paralelisme mempercepat similarity search.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3">
          <StepCard
            idx="1"
            title="Pilih"
            italic="favorit"
            desc="Cari berdasarkan judul, pilih satu anime sebagai basis rekomendasi."
          />
          <StepCard
            idx="2"
            title="Jalankan"
            italic="paralel"
            desc="Eksekusi similarity search secara serial atau paralel dengan beberapa worker."
          />
          <StepCard
            idx="3"
            title="Bandingkan"
            italic="performa"
            desc="Lihat speedup, efficiency, dan grafik benchmark untuk membuktikan paralelisme."
          />
        </div>

        <div className="mt-14 flex justify-center">
          <Link to="/recommend" className="btn-primary">
            Mulai rekomendasi sekarang
          </Link>
        </div>
      </section>
    </div>
  );
}
