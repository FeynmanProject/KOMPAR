import React, { useEffect } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Recommendation from "./pages/Recommendation.jsx";
import Benchmark from "./pages/Benchmark.jsx";
import AboutAlgorithm from "./pages/AboutAlgorithm.jsx";
import AmbientBackdrop from "./components/AmbientBackdrop.jsx";

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

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-2 pl-2 pr-2">
      <svg
        width="20"
        height="20"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
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
      <span className="font-display text-[20px] leading-none text-white">
        <span className="italic">A</span>nime
      </span>
    </NavLink>
  );
}

export default function App() {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen">
      <ScrollToTop />
      <AmbientBackdrop />
      <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <div className="nav-pill">
          <Brand />
          <nav className="flex items-center gap-0.5">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/recommend">Rekomendasi</NavItem>
            <NavItem to="/benchmark">Benchmark</NavItem>
          </nav>
          <div className="ml-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate("/about")}
              className="hidden rounded-full border border-white/[0.1] px-3.5 py-1.5 text-[13px] font-medium text-slate-200 transition-all duration-300 ease-out hover:bg-white/[0.05] hover:scale-[1.03] sm:inline-block"
            >
              Cara kerja
            </button>
            <button type="button" onClick={() => navigate("/recommend")} className="nav-cta">
              Mulai
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28 md:px-8">
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
