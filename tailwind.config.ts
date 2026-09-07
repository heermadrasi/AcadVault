import type { Config } from "tailwindcss";

/**
 * Palette is the departmental records office: paper, ink, archival green.
 * Deliberately not the SaaS indigo — green reads as "filed / cleared" and
 * gives amber a job (overdue) without the two fighting.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF8",
        card: "#FFFFFF",
        rule: "#E4E3DD",
        ink: "#16181D",
        muted: "#6B6F76",
        archive: { DEFAULT: "#1F5F4E", soft: "#E7F0EC", deep: "#154237" },
        overdue: { DEFAULT: "#B45309", soft: "#FCF0E2" },
        pending: { DEFAULT: "#8A8F98", soft: "#F1F1EE" },
        reject: { DEFAULT: "#9F1D1D", soft: "#FBEBEB" },
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-plex-serif)", "ui-serif", "Georgia"],
      },
      borderRadius: { sm: "3px", DEFAULT: "4px", md: "6px", lg: "8px" },
      boxShadow: { card: "0 1px 2px rgba(22,24,29,0.05)" },
    },
  },
  plugins: [],
} satisfies Config;
