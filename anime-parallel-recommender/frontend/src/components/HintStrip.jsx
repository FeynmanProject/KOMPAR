export function SearchMiniIcon({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayMiniIcon({ className }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
}

/** Compact hint bar — ringkas untuk empty / pre-run states (glass `card`). */
export default function HintStrip({ icon, title, description }) {
  return (
    <div className="card flex w-full min-w-0 flex-col gap-3 !py-4 sm:flex-row sm:items-center sm:gap-4 sm:!py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/25">
        {icon}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-semibold tracking-tight text-slate-100">{title}</p>
        <p className="text-xs leading-relaxed text-slate-500 sm:text-[13px]">{description}</p>
      </div>
    </div>
  );
}
