import React from "react";
import AnimePoster from "./AnimePoster.jsx";

export default function FavoriteCard({ anime, eyebrow = "Anime Favorit" }) {
  if (!anime) return null;
  return (
    <div className="card flex gap-4">
      <div className="h-44 w-32 shrink-0 overflow-hidden rounded-xl bg-ink-800">
        <AnimePoster src={anime.image_url} alt={anime.title} className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-400">{eyebrow}</div>
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
