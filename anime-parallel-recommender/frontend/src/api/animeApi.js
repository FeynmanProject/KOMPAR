// Client for the FastAPI backend. In development the dev server proxies
// `/api/*` to `http://localhost:8000` (see vite.config.js). Override via the
// `VITE_API_BASE` env var if you deploy the backend elsewhere.

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch (_) {
      // ignore parse error
    }
    throw new Error(detail);
  }
  return res.json();
}

export const animeApi = {
  meta: () => request("/anime/meta/dataset"),
  search: (query, limit = 20) =>
    request(`/anime/search?query=${encodeURIComponent(query)}&limit=${limit}`),
  detail: (id) => request(`/anime/${id}`),
  recommendSerial: (payload) =>
    request("/recommend/serial", { method: "POST", body: JSON.stringify(payload) }),
  recommendParallel: (payload) =>
    request("/recommend/parallel", { method: "POST", body: JSON.stringify(payload) }),
  benchmark: (payload) =>
    request("/benchmark", { method: "POST", body: JSON.stringify(payload) }),
};

export default animeApi;
