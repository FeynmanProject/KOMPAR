import React, { useEffect, useMemo, useState } from "react";
import AnimeCard from "./AnimeCard.jsx";

function PageControls({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        className="btn-outline px-3 py-1.5 text-xs font-semibold disabled:pointer-events-none disabled:opacity-35"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Back
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPageChange(n)}
          className={`min-w-[2.25rem] rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
            n === page
              ? "border-accent-500 bg-accent-500/20 text-white"
              : "border-white/10 text-slate-300 hover:bg-white/5"
          }`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className="btn-outline px-3 py-1.5 text-xs font-semibold disabled:pointer-events-none disabled:opacity-35"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

export default function RecommendationList({ recommendations, emptyHint, pageSize }) {
  const [page, setPage] = useState(1);

  const listKey = useMemo(() => {
    if (!recommendations?.length) return "";
    return recommendations.map((r) => r.anime?.id ?? "").join("-");
  }, [recommendations]);

  const total = recommendations.length;
  const usePages = typeof pageSize === "number" && pageSize > 0;
  const totalPages = usePages ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  useEffect(() => {
    setPage(1);
  }, [listKey]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  if (!recommendations?.length) {
    return (
      <div className="card text-center text-sm text-slate-400">
        {emptyHint ?? "Belum ada rekomendasi. Jalankan pencarian terlebih dahulu."}
      </div>
    );
  }

  const safePage = Math.min(Math.max(1, page), totalPages);
  const slice = usePages ? recommendations.slice((safePage - 1) * pageSize, safePage * pageSize) : recommendations;
  const rankOffset = usePages ? (safePage - 1) * pageSize : 0;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {slice.map((r, idx) => (
          <AnimeCard key={`${r.anime.id}-${rankOffset + idx}`} recommendation={r} rank={rankOffset + idx + 1} />
        ))}
      </div>
      {usePages && (
        <PageControls page={safePage} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
