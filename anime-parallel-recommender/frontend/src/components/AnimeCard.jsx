import React, { useEffect, useId, useState } from "react";

/**
 * Circular similarity-percentage indicator.
 * Text is rendered as SVG <text> with text-anchor + dominant-baseline so it is
 * mathematically centered inside the ring, regardless of font metrics or value
 * length (e.g. "0%", "5%", "100%").
 */
function ScoreRing({ value, className = "h-12 w-12" }) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  const radius = 27;
  const strokeW = 4;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  const gradId = useId();

  const label = `${clamped.toFixed(0)}%`;
  // Three brackets so 0–9, 10–99, and 100 each get a font size that breathes
  // inside the ring without crowding the stroke.
  const fontSize = label.length >= 4 ? 14 : label.length === 3 ? 16 : 18;

  return (
    <div className={`relative shrink-0 ${className}`}>
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <g transform="rotate(-90 32 32)">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeW}
            fill="none"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke={`url(#${gradId})`}
            strokeLinecap="round"
            strokeWidth={strokeW}
            fill="none"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </g>
        <text
          x="32"
          y="32"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white"
          style={{
            fontSize,
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          {label}
        </text>
        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#7c5cff" />
            <stop offset="1" stopColor="#ff5dba" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function MetaPill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/[0.10] bg-white/[0.04] px-2.5 py-[3px] text-[11px] font-medium text-slate-200 backdrop-blur-md">
      {children}
    </span>
  );
}

function GenreTag({ children }) {
  return (
    <span className="rounded-md bg-accent-500/15 px-2 py-0.5 text-[11px] font-medium text-accent-300">
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   DETAIL MODAL
   Opens when a card is clicked; closes on Esc, backdrop click, or
   the close button. Locks body scroll while open.
   ──────────────────────────────────────────────────────────── */
function DetailModal({ recommendation, onClose }) {
  const { anime, similarity_percentage, reason } = recommendation;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detail ${anime.title}`}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-[fadeIn_180ms_ease-out]"
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-md"
      />

      <div className="glass-panel relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl p-6 md:p-8">
        {/* close button */}
        <button
          type="button"
          aria-label="Tutup"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-slate-200 transition-all hover:bg-white/[0.10] hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
          <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-ink-800 md:h-auto md:max-h-[280px]">
            {anime.image_url ? (
              // eslint-disable-next-line jsx-a11y/img-redundant-alt
              <img
                src={anime.image_url}
                alt={`Poster ${anime.title}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-300">
                Similarity {similarity_percentage?.toFixed(0) ?? "-"}%
              </div>
              <h2
                className="mt-1 break-words font-display text-3xl leading-[1.1] text-white md:text-4xl"
                title={anime.title}
              >
                {anime.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <MetaPill>★ {anime.score?.toFixed(2) ?? "-"}</MetaPill>
              <MetaPill>{anime.episodes || "?"} ep</MetaPill>
              <MetaPill>{anime.type || "-"}</MetaPill>
              <MetaPill>{anime.release_year || "-"}</MetaPill>
              {anime.studio && <MetaPill>{anime.studio}</MetaPill>}
              {anime.status && <MetaPill>{anime.status}</MetaPill>}
            </div>

            {anime.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {anime.genres.map((g) => (
                  <GenreTag key={g}>{g}</GenreTag>
                ))}
              </div>
            )}

            {anime.themes?.length > 0 && (
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Tema
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {anime.themes.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-white/[0.10] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-7 space-y-5 text-sm leading-relaxed text-slate-300">
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Mengapa direkomendasikan
            </h3>
            <p className="text-slate-200">{reason}</p>
          </section>

          {anime.synopsis && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Sinopsis
              </h3>
              <p className="whitespace-pre-line text-slate-300">{anime.synopsis}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnimeCard({ recommendation, rank }) {
  const { anime, similarity_percentage, reason } = recommendation;
  const [open, setOpen] = useState(false);

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="card group flex cursor-pointer flex-col gap-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
        aria-label={`Lihat detail ${anime.title}`}
      >
        {/* TOP — poster + (title + score) + meta pills */}
        <div className="flex gap-4">
          <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-xl bg-ink-800">
            {anime.image_url ? (
              // eslint-disable-next-line jsx-a11y/img-redundant-alt
              <img
                src={anime.image_url}
                alt={`Poster ${anime.title}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            {typeof rank === "number" && (
              <span className="absolute left-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                #{rank}
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-start gap-3">
              <h3
                className="line-clamp-2 min-w-0 flex-1 break-words text-base font-semibold leading-snug text-white"
                title={anime.title}
              >
                {anime.title}
              </h3>
              <ScoreRing value={similarity_percentage} />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <MetaPill>★ {anime.score?.toFixed(2) ?? "-"}</MetaPill>
              <MetaPill>{anime.episodes || "?"} ep</MetaPill>
              <MetaPill>{anime.type || "-"}</MetaPill>
              <MetaPill>{anime.release_year || "-"}</MetaPill>
              {anime.studio && <MetaPill>{anime.studio}</MetaPill>}
            </div>
          </div>
        </div>

        {/* BOTTOM — genres + reason span full width */}
        <div className="space-y-3">
          {anime.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {anime.genres.slice(0, 6).map((g) => (
                <GenreTag key={g}>{g}</GenreTag>
              ))}
            </div>
          )}

          <p className="line-clamp-3 text-[13px] leading-relaxed text-slate-400">{reason}</p>
        </div>
      </article>

      {open && <DetailModal recommendation={recommendation} onClose={() => setOpen(false)} />}
    </>
  );
}
