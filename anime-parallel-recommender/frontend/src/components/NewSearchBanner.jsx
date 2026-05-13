import React from "react";
import { useThemeAttribute } from "../lib/useTheme.js";

export default function NewSearchBanner({
  onStartNew,
  eyebrow = "Langkah berikutnya",
  title,
  description,
  buttonLabel = "Mulai pencarian baru",
  captionMobile,
  captionDesktop,
}) {
  const theme = useThemeAttribute();
  const isLight = theme === "light";

  return (
    <div
      className={`card relative overflow-hidden !p-0 ${
        isLight
          ? "border-black/[0.08] shadow-[0_8px_28px_-10px_rgba(0,0,0,0.08)]"
          : "border-accent-500/25 shadow-[0_0_40px_-12px_rgba(139,92,246,0.35)]"
      }`}
    >
      {!isLight && (
        <>
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent-500/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-neon-pink/10 blur-3xl"
            aria-hidden
          />
        </>
      )}

      <div className="relative flex flex-col gap-6 px-6 py-5 sm:px-7 sm:py-6 md:flex-row md:items-center md:gap-8">
        <div className="min-w-0 flex-1 space-y-1.5">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
              isLight
                ? "border-black/10 bg-black/[0.04] text-slate-600"
                : "border-white/10 bg-white/[0.04] text-accent-400"
            }`}
          >
            {eyebrow}
          </span>
          <h3
            className={`text-base font-semibold tracking-tight md:text-lg ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            {title}
          </h3>
          <p className={`max-w-xl text-sm leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            {description}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-1.5 md:w-[13.5rem]">
          <button
            type="button"
            className="btn-primary w-full rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition-transform hover:-translate-y-0.5 active:translate-y-0"
            onClick={onStartNew}
          >
            {buttonLabel}
          </button>
          {captionMobile && (
            <span className={`text-center text-[11px] sm:hidden ${isLight ? "text-slate-600" : "text-slate-500"}`}>
              {captionMobile}
            </span>
          )}
          {captionDesktop && (
            <span className={`hidden text-[11px] sm:block sm:text-right ${isLight ? "text-slate-600" : "text-slate-500"}`}>
              {captionDesktop}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
