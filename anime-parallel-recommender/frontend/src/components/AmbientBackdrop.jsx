import React from "react";
import { MeshGradient } from "@paper-design/shaders-react";

/**
 * Full-screen WebGL liquid-glass shader background.
 *
 * Single MeshGradient layer:
 *   - Sharp, GPU-accelerated fragment shader (not blurred CSS blobs).
 *   - Continuous organic motion via internal time-based distortion + swirl.
 *   - Grain mixer adds crisp grain at color boundaries → premium feel.
 *
 * Composited with a veil + edge vignette so the foreground content (and the
 * frosted glass cards) stay legible while the shader plays behind them. The
 * palette swaps for light mode so the page background reads as a warm cream
 * surface instead of the deep violet/black used in dark mode.
 */

const DARK_PALETTE = ["#000000", "#1e1b4b", "#4c1d95", "#7c3aed", "#a855f7", "#0a0118"];
// Pure-monochrome palette. The previous values were all clustered near
// white (#ffffff–#ececec), which made the shader almost invisible once the
// veil was applied on top. Here we widen the range significantly — from
// near-white down to a true mid-gray (#9e9e9e) — so the swirling motion
// is clearly visible while still reading as a clean monochrome surface
// (no violet, no warm cream).
const LIGHT_PALETTE = ["#ffffff", "#e6e6e6", "#bcbcbc", "#9e9e9e", "#d4d4d4", "#f4f4f4"];

export default function AmbientBackdrop({ theme = "dark" }) {
  const isLight = theme === "light";
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${
        isLight ? "bg-[#f4f4f4]" : "bg-black"
      }`}
    >
      <MeshGradient
        colors={isLight ? LIGHT_PALETTE : DARK_PALETTE}
        distortion={0.85}
        swirl={0.55}
        grainMixer={isLight ? 0.32 : 0.38}
        grainOverlay={isLight ? 0.06 : 0.07}
        speed={0.35}
        scale={1.1}
        style={{ width: "100%", height: "100%" }}
      />

      {/*
        Veil — keeps body text readable. Light mode uses a much lighter
        veil (25% vs 55%) so the wider-range shader underneath stays
        visible; dark mode keeps the strong 55% black veil so the
        original look is untouched.
      */}
      <div className={`absolute inset-0 ${isLight ? "bg-[#f4f4f4]/25" : "bg-black/55"}`} />

      {/* edge vignette — slightly stronger in light mode to add depth at
          the corners now that the shader is more visible. */}
      <div
        className={`absolute inset-0 ${
          isLight
            ? "bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.18)_100%)]"
            : "bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.65)_100%)]"
        }`}
      />
    </div>
  );
}
