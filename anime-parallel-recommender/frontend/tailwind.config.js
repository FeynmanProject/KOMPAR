/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#000000",
          900: "#070707",
          800: "#0d0d0f",
          700: "#141417",
          600: "#1c1c20",
        },
        accent: {
          300: "#a78bfa",
          400: "#8b5cf6",
          500: "#7c3aed",
          600: "#6d28d9",
        },
        neon: {
          pink: "#ff5dba",
          cyan: "#5cf0ff",
          lime: "#a5ff70",
        },
      },
      fontFamily: {
        display: ["'Instrument Serif'", "Georgia", "serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 10px 40px -10px rgba(124, 58, 237, 0.55)",
        pill: "0 8px 30px -8px rgba(0, 0, 0, 0.65)",
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
    },
  },
  plugins: [],
};
