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
 * Composited with a dark veil + edge vignette so the foreground content
 * (and the frosted glass cards) stay legible while the shader plays
 * behind them.
 */
export default function AmbientBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black"
    >
      <MeshGradient
        colors={["#000000", "#1e1b4b", "#4c1d95", "#7c3aed", "#a855f7", "#0a0118"]}
        distortion={0.85}
        swirl={0.55}
        grainMixer={0.38}
        grainOverlay={0.07}
        speed={0.35}
        scale={1.1}
        style={{ width: "100%", height: "100%" }}
      />

      {/* dark veil — keeps body text readable while shader plays */}
      <div className="absolute inset-0 bg-black/55" />

      {/* edge vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.65)_100%)]" />
    </div>
  );
}
