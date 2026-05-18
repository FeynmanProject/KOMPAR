"""Normalize MAL poster URLs for API responses."""

from __future__ import annotations

# AnimeList export (2019) uses this host; MAL moved to cdn.myanimelist.net.
_LEGACY_CDN = "myanimelist.cdn-dena.com"
_CURRENT_CDN = "cdn.myanimelist.net"


def normalize_image_url(url: str | None) -> str:
    if not url:
        return ""
    cleaned = str(url).strip()
    if not cleaned:
        return ""
    if _LEGACY_CDN in cleaned:
        cleaned = cleaned.replace(_LEGACY_CDN, _CURRENT_CDN)
    return cleaned
