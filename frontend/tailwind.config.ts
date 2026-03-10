import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      colors: {
        surface: "rgb(var(--surface) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accentSoft: "rgb(var(--accent-soft) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      boxShadow: {
        glass: "0 18px 40px rgba(15, 23, 42, 0.08)",
      },
      backdropBlur: {
        xs: "2px",
      },
      backgroundImage: {
        shell:
          "radial-gradient(circle at top left, rgba(14,165,233,.18), transparent 30%), radial-gradient(circle at top right, rgba(20,184,166,.16), transparent 25%), linear-gradient(180deg, rgba(255,255,255,.92), rgba(248,250,252,.78))",
        "shell-dark":
          "radial-gradient(circle at top left, rgba(14,165,233,.16), transparent 30%), radial-gradient(circle at top right, rgba(20,184,166,.14), transparent 25%), linear-gradient(180deg, rgba(15,23,42,.96), rgba(2,6,23,.94))",
      },
    },
  },
  plugins: [],
} satisfies Config;

