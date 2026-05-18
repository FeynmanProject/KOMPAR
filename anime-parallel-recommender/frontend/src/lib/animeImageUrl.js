/** MAL CDN host used in older dumps; active CDN is cdn.myanimelist.net */
const LEGACY_CDN = "myanimelist.cdn-dena.com";
const CURRENT_CDN = "cdn.myanimelist.net";

export function normalizeAnimeImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.includes(LEGACY_CDN)) {
    return trimmed.replaceAll(LEGACY_CDN, CURRENT_CDN);
  }
  return trimmed;
}
