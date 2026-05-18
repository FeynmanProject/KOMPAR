import React, { useEffect, useRef, useState } from "react";
import AnimePoster from "./AnimePoster.jsx";
import animeApi from "../api/animeApi.js";

export default function SearchBar({ onSelect, placeholder = "Cari judul anime favoritmu..." }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await animeApi.search(query.trim(), 12);
        setResults(data);
        setOpen(true);
      } catch (e) {
        setError(e.message);
        setResults([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(anime) {
    setQuery(anime.title);
    setOpen(false);
    onSelect?.(anime);
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="input w-full rounded-full py-3.5 pl-12 pr-5 text-[15px] placeholder:!text-slate-300/80"
        />
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">memuat...</span>
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-2 max-h-96 w-full overflow-y-auto rounded-2xl border border-white/[0.08] bg-black/85 shadow-2xl backdrop-blur-xl">
          {error && <div className="p-3 text-sm text-rose-300">{error}</div>}
          {!error && results.length === 0 && !loading && (
            <div className="p-3 text-sm text-slate-400">Tidak ada hasil.</div>
          )}
          {results.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => pick(a)}
              className="flex w-full items-center gap-3 border-b border-white/5 px-3 py-2 text-left transition-colors hover:bg-white/5"
            >
              <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-ink-800">
                <AnimePoster src={a.image_url} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{a.title}</div>
                <div className="truncate text-[11px] text-slate-400">
                  {a.type} • {a.release_year || "?"} • ★ {a.score?.toFixed(2) ?? "-"} • {a.genres?.slice(0, 3).join(", ")}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
