import React from "react";
import AnimeCard from "./AnimeCard.jsx";

export default function RecommendationList({ recommendations, emptyHint }) {
  if (!recommendations?.length) {
    return (
      <div className="card text-center text-sm text-slate-400">
        {emptyHint ?? "Belum ada rekomendasi. Jalankan pencarian terlebih dahulu."}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {recommendations.map((r, idx) => (
        <AnimeCard key={`${r.anime.id}-${idx}`} recommendation={r} rank={idx + 1} />
      ))}
    </div>
  );
}
