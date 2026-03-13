import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          deep: "#0d0805",
          surface: "#1c1008",
          "surface-2": "#2a1a0e",
          card: "rgba(30, 18, 8, 0.84)",
          "card-strong": "rgba(42, 26, 14, 0.94)",
          "card-soft": "rgba(24, 14, 6, 0.62)",
        },
        accent: {
          DEFAULT: "#f97316",
          strong: "#ea580c",
          bright: "#fb923c",
          soft: "rgba(249, 115, 22, 0.15)",
          border: "rgba(249, 150, 60, 0.22)",
          gold: "#fbbf24",
        },
        text: {
          primary: "#faf8f6",
          secondary: "#e8ddd0",
          muted: "#a08870",
        },
        border: {
          DEFAULT: "rgba(249, 180, 100, 0.16)",
          strong: "rgba(249, 180, 100, 0.30)",
        },
        success: {
          DEFAULT: "#34d399",
          soft: "rgba(52, 211, 153, 0.16)",
        },
        danger: {
          DEFAULT: "#f87171",
          soft: "rgba(248, 113, 113, 0.16)",
        },
      },
      fontFamily: {
        sans: [
          "Avenir Next",
          "SF Pro Display",
          "Sora",
          "Manrope",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "18px",
        btn: "11px",
      },
      boxShadow: {
        card: "0 14px 32px rgba(0, 0, 0, 0.25)",
        glow: "0 0 24px rgba(249, 115, 22, 0.20)",
        "glow-strong": "0 0 40px rgba(249, 115, 22, 0.35)",
      },
      backdropBlur: {
        card: "6px",
        nav: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
