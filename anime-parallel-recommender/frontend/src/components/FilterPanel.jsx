import React, { useEffect, useMemo, useState } from "react";

const MinusIcon = (props) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...props}>
    <path d="M5 12h14" />
  </svg>
);
const PlusIcon = (props) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const AlertIcon = (props) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/**
 * NumberInput with custom horizontal − / + stepper buttons.
 *
 * - Uses `type="text"` + `inputMode` so we own the display string completely
 *   (avoids Chrome's quirks where `type="number"` clears `e.target.value`
 *   for intermediate states like "9." or strips leading zeros mid-edit).
 * - Digit cap derived from `max` prevents typing more digits than allowed
 *   (e.g. rating max 10 ⇒ 2 digits, year max 2024 ⇒ 4 digits).
 * - Soft-clamps to `max` during typing so the displayed value never exceeds
 *   the limit.
 * - When `required`, blurring with empty / below-min value shows an inline
 *   warning (rose); the warning clears as soon as a valid value is typed.
 */
function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step = 1,
  precision = 0,
  required = false,
  className = "",
}) {
  const [display, setDisplay] = useState(() =>
    value == null || value === "" ? "" : String(value)
  );
  const [error, setError] = useState(null);

  const maxDigits = useMemo(() => {
    if (max == null) return null;
    return String(Math.floor(max)).length;
  }, [max]);

  // Sync external value changes (e.g. Reset button) into local display state.
  useEffect(() => {
    if (value == null || value === "") {
      if (display !== "") setDisplay("");
      return;
    }
    const currentNum = display === "" ? NaN : Number(display);
    if (Number.isNaN(currentNum) || currentNum !== Number(value)) {
      setDisplay(String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (n) => {
    if (Number.isNaN(n)) return n;
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      setDisplay("");
      setError(null);
      onChange(null);
      return;
    }
    const allowDecimal = precision > 0;
    const pattern = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;
    if (!pattern.test(raw)) return;
    const intPart = raw.split(".")[0];
    if (maxDigits != null && intPart.length > maxDigits) return;
    const n = Number(raw);
    if (Number.isNaN(n)) {
      setDisplay(raw); // intermediate states like "."
      return;
    }
    if (max != null && n > max) {
      setDisplay(String(max));
      setError(null);
      onChange(max);
      return;
    }
    setDisplay(raw);
    setError(null);
    onChange(n);
  };

  const handleBlur = () => {
    if (display === "") {
      if (required) setError(`Tidak boleh kosong, minimal ${min ?? 1}.`);
      return;
    }
    const n = Number(display);
    if (Number.isNaN(n)) {
      setDisplay("");
      onChange(null);
      if (required) setError(`Tidak boleh kosong, minimal ${min ?? 1}.`);
      return;
    }
    if (required && n < (min ?? 1)) {
      setError(`Tidak valid — minimal ${min ?? 1}, ulangi.`);
      return;
    }
    // Non-required: silently clamp into [min, max] on blur. Min can't be
    // enforced while typing (would block partial input like "1" on the way to
    // "1988"); max IS enforced live but we clamp again here as a safety net.
    if (!required) {
      const clamped = clamp(n);
      if (clamped !== n) {
        const normalized = Number(clamped.toFixed(precision));
        setDisplay(String(normalized));
        setError(null);
        onChange(normalized);
        return;
      }
    }
    const normalized = Number(n.toFixed(precision));
    setDisplay(String(normalized));
  };

  const handleKeyDown = (e) => {
    // Enter commits the typed value: blur runs handleBlur which clamps to
    // [min, max] (non-required) or surfaces the inline warning (required).
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleStep = (direction) => {
    const isEmpty = display === "" || Number.isNaN(Number(display));
    if (isEmpty) {
      if (direction > 0) {
        const next = min ?? 0;
        setError(null);
        setDisplay(String(next));
        onChange(next);
      }
      return;
    }
    const current = Number(display);
    if (min != null && current < min) {
      setError(null);
      setDisplay(String(min));
      onChange(min);
      return;
    }
    const next = clamp(Number((current + direction * step).toFixed(precision)));
    setError(null);
    setDisplay(String(next));
    onChange(next);
  };

  const numericVal = display === "" ? null : Number(display);
  const atMin =
    numericVal != null &&
    !Number.isNaN(numericVal) &&
    numericVal <= (min ?? -Infinity);
  const atMax =
    numericVal != null &&
    !Number.isNaN(numericVal) &&
    numericVal >= (max ?? Infinity);
  const showError = error != null;

  return (
    <div className={className}>
      <div className="relative">
        <input
          type="text"
          inputMode={precision > 0 ? "decimal" : "numeric"}
          className={`input pr-[68px] ${
            showError
              ? "!border-rose-400/60 !ring-1 !ring-rose-400/30 focus:!border-rose-400"
              : ""
          }`}
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center gap-0.5">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Kurang"
            onClick={() => handleStep(-1)}
            disabled={atMin}
            className="stepper-btn pointer-events-auto"
          >
            <MinusIcon />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Tambah"
            onClick={() => handleStep(1)}
            disabled={atMax}
            className="stepper-btn pointer-events-auto"
          >
            <PlusIcon />
          </button>
        </div>
      </div>
      {showError && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-rose-300/95">
          <AlertIcon /> {error}
        </p>
      )}
    </div>
  );
}

export default function FilterPanel({ filters, onChange, meta, topN, onTopNChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Filter rekomendasi</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Genre</label>
          <select
            className="input"
            value={filters.genre ?? ""}
            onChange={(e) => update("genre", e.target.value || null)}
          >
            <option value="">Semua genre</option>
            {meta?.genres?.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Min rating</label>
          <NumberInput
            value={filters.min_rating ?? ""}
            onChange={(v) => update("min_rating", v)}
            placeholder="0 - 10"
            min={0}
            max={10}
            step={0.1}
            precision={1}
          />
        </div>

        <div>
          <label className="label">Max episodes</label>
          <NumberInput
            value={filters.max_episodes ?? ""}
            onChange={(v) => update("max_episodes", v)}
            min={0}
            step={1}
          />
        </div>

        <div>
          <label className="label">Tipe</label>
          <select
            className="input"
            value={filters.type ?? ""}
            onChange={(e) => update("type", e.target.value || null)}
          >
            <option value="">Semua</option>
            {meta?.types?.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={filters.status ?? ""}
            onChange={(e) => update("status", e.target.value || null)}
          >
            <option value="">Semua</option>
            {meta?.statuses?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Mulai tahun</label>
          <NumberInput
            value={filters.start_year ?? ""}
            onChange={(v) => update("start_year", v)}
            placeholder={meta?.min_year ?? ""}
            min={meta?.min_year ?? 1960}
            max={meta?.max_year ?? new Date().getFullYear()}
            step={1}
          />
        </div>

        <div>
          <label className="label">Sampai tahun</label>
          <NumberInput
            value={filters.end_year ?? ""}
            onChange={(v) => update("end_year", v)}
            placeholder={meta?.max_year ?? ""}
            min={meta?.min_year ?? 1960}
            max={meta?.max_year ?? new Date().getFullYear()}
            step={1}
          />
        </div>

        {onTopNChange && (
          <div className="col-span-2">
            <label className="label">Jumlah rekomendasi</label>
            <NumberInput
              value={topN}
              onChange={onTopNChange}
              min={1}
              max={50}
              step={1}
              required
              placeholder="1 - 50"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn-ghost w-full"
        onClick={() => onChange({})}
      >
        Reset filter
      </button>
    </div>
  );
}
