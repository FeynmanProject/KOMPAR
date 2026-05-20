import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Recommendation from "./pages/Recommendation.jsx";
import Benchmark from "./pages/Benchmark.jsx";
import AboutAlgorithm from "./pages/AboutAlgorithm.jsx";
import AmbientBackdrop from "./components/AmbientBackdrop.jsx";
import { useSplashLifecycle } from "./lib/splash.js";

/**
 * Theme is stored on <html data-theme="..."> so plain CSS attribute selectors
 * (e.g. [data-theme="light"] .card) can override colors without touching the
 * existing dark-mode rules. We persist the user's choice to localStorage and
 * fall back to dark on first visit so the historical look is unchanged.
 */
const THEME_STORAGE_KEY = "anime-recommender-theme";

function readInitialTheme() {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

/**
 * Swap the favicon to match the active theme. The light-mode icon is a
 * monochrome dark-gray sparkle that reads well on the typical light browser
 * tab bar, while dark mode keeps the original violet sparkle so the brand
 * stays the same when the rest of the app is dark.
 */
function applyFavicon(theme) {
  if (typeof document === "undefined") return;
  const link = document.getElementById("favicon");
  if (!link) return;
  link.setAttribute(
    "href",
    theme === "light" ? "/favicon-light.svg" : "/favicon.svg",
  );
}

function useTheme() {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    applyFavicon(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // localStorage may be unavailable (private mode / sandboxed iframe);
      // the attribute still applies for the current session.
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((cur) => (cur === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggle };
}

/**
 * React Router does not reset scroll position on navigation by default.
 * This component scrolls back to the top whenever the route changes so
 * that pages always open from their header instead of inheriting the
 * previous page's scroll position.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `nav-link ${isActive ? "nav-link-active" : ""}`
      }
    >
      {children}
    </NavLink>
  );
}

/**
 * The sparkle SVG itself is the theme toggle. Clicking it flips between dark
 * and light mode; the surrounding NavLink behavior (going home) is preserved
 * by keeping the text label as the actual link target.
 */
function Brand({ theme, onToggleTheme }) {
  const isLight = theme === "light";
  return (
    <div className="flex shrink-0 items-center gap-1.5 pl-1 pr-0.5 md:gap-3 md:pl-2 md:pr-2">
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={isLight ? "Aktifkan dark mode" : "Aktifkan light mode"}
        title={isLight ? "Aktifkan dark mode" : "Aktifkan light mode"}
        className="brand-theme-toggle flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-out hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 md:h-7 md:w-7"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 md:h-5 md:w-5"
        >
          <defs>
            <linearGradient id="brand-sparkle" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e9d5ff" />
              <stop offset="55%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
          </defs>
          <path
            d="M 16 4 C 16 14, 18 16, 28 16 C 18 16, 16 18, 16 28 C 16 18, 14 16, 4 16 C 14 16, 16 14, 16 4 Z"
            fill="url(#brand-sparkle)"
          />
          <path
            d="M 25 5 C 25 7.5, 25.5 8, 28 8 C 25.5 8, 25 8.5, 25 11 C 25 8.5, 24.5 8, 22 8 C 24.5 8, 25 7.5, 25 5 Z"
            fill="#e9d5ff"
            opacity="0.7"
          />
        </svg>
      </button>
      <NavLink to="/" className="shrink-0 font-display text-[17px] leading-none text-white md:text-[20px]">
        <span className="italic">A</span>nime
      </NavLink>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  useSplashLifecycle();
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ScrollToTop />
      <AmbientBackdrop theme={theme} />
      <header className="fixed inset-x-0 top-2 z-50 flex justify-center px-2 md:top-4 md:px-4">
        <div className="nav-pill w-full max-w-[calc(100vw-1rem)] md:w-auto md:max-w-none">
          <Brand theme={theme} onToggleTheme={toggle} />
          <nav className="flex min-w-0 flex-1 items-center justify-center gap-0 md:flex-none md:justify-start">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/recommend">Rekomendasi</NavItem>
            <NavItem to="/benchmark">Benchmark</NavItem>
          </nav>
          <div className="ml-0.5 flex shrink-0 items-center gap-1 md:ml-2 md:gap-1.5">
            <button
              type="button"
              onClick={() => navigate("/about")}
              className="hidden rounded-full border border-white/[0.1] px-3.5 py-1.5 text-[13px] font-medium text-slate-200 transition-all duration-300 ease-out hover:bg-white/[0.05] hover:scale-[1.03] md:inline-block"
            >
              Cara kerja
            </button>
            <button type="button" onClick={() => navigate("/recommend")} className="nav-cta">
              Mulai
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl overflow-x-hidden px-4 pb-16 pt-24 md:px-8 md:pt-28">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recommend" element={<Recommendation />} />
          <Route path="/benchmark" element={<Benchmark />} />
          <Route path="/about" element={<AboutAlgorithm />} />
        </Routes>
      </main>

      <footer className="border-t border-white/[0.05] px-4 py-8 text-center text-xs text-slate-600 md:px-8">
        UAS Komputasi Paralel · Sistem Rekomendasi Anime Berbasis Similarity ·{" "}
        <span className="text-slate-500">FastAPI + React + Tailwind</span>
      </footer>
    </div>
  );
}
