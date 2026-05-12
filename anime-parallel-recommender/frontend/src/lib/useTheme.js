import { useEffect, useState } from "react";

/**
 * Read-only theme hook for components that need to render different colors
 * per theme but don't own the toggle.
 *
 * The source of truth is the `data-theme` attribute on <html>, which is
 * written by the owner hook in App.jsx whenever the user clicks the toggle.
 * Subscribers here just observe it via MutationObserver so they re-render
 * whenever the attribute changes — no React context plumbing required.
 *
 * Returns "dark" by default (also when SSR / before first paint) so the
 * historical dark look never flashes on mount.
 */
function readAttribute() {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") || "dark";
}

export function useThemeAttribute() {
  const [theme, setTheme] = useState(readAttribute);

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setTheme(readAttribute());
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  return theme;
}
