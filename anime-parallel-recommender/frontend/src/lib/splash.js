import { useEffect } from "react";
import animeApi from "../api/animeApi.js";

/**
 * Manages the lifecycle of the HTML splash screen defined in `index.html`.
 *
 * The splash is rendered server-side so it appears on the very first paint
 * — important on slow laptops where parsing the JS bundle alone can take a
 * few seconds. This hook hides it only after the app is realistically
 * usable:
 *
 *   1. The web fonts have finished loading (so the headline doesn't reflow
 *      from the system fallback into Instrument Serif in front of the
 *      user).
 *   2. The first `/meta` call has resolved (success or failure). This
 *      tells us the backend handshake is done, so search/recommend won't
 *      mysteriously fail the moment the user clicks anywhere.
 *   3. A minimum visible time has elapsed, so quick boots don't show a
 *      single-frame flash that just looks like a glitch.
 *
 * A safety timeout (MAX_DISPLAY_MS) hides the splash unconditionally if
 * any of the above hangs — we never want a dead backend to permanently
 * lock the user out of the app.
 */

const MIN_DISPLAY_MS = 700;
const MAX_DISPLAY_MS = 6000;

export function useSplashLifecycle() {
  useEffect(() => {
    const splash = document.getElementById("splash-screen");
    if (!splash) return undefined;

    const startedAt = performance.now();
    let alreadyHidden = false;

    const hide = () => {
      if (alreadyHidden) return;
      alreadyHidden = true;
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(MIN_DISPLAY_MS - elapsed, 0);
      window.setTimeout(() => {
        splash.classList.add("is-hidden");
        // Remove from DOM after the CSS transition finishes so the
        // splash can never intercept clicks or hold a ref to its SVG.
        window.setTimeout(() => splash.remove(), 600);
      }, wait);
    };

    const safetyTimer = window.setTimeout(hide, MAX_DISPLAY_MS);

    const fontsReady =
      document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
    const metaReady = animeApi.meta().catch(() => null);

    Promise.allSettled([fontsReady, metaReady]).then(() => {
      window.clearTimeout(safetyTimer);
      hide();
    });

    return () => {
      window.clearTimeout(safetyTimer);
    };
  }, []);
}
