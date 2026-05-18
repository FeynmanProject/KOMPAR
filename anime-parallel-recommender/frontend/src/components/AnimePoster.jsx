import React from "react";
import { normalizeAnimeImageUrl } from "../lib/animeImageUrl.js";

/** Poster with legacy MAL CDN host fix + no-referrer for hotlink-friendly loads. */
export default function AnimePoster({ src, alt = "", className = "", loading = "lazy" }) {
  const url = normalizeAnimeImageUrl(src);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}
