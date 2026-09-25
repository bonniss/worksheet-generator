import type { Config } from "tailwindcss";

// Token theo docuforge-DESIGN.md. Thang xám dùng `zinc` có sẵn của Tailwind (trùng khớp với spec).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  // Tắt preflight để không phá inline-style của WorksheetGenerator
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#2563EB", hover: "#1D4ED8", soft: "#EFF6FF" },
        accent: { DEFAULT: "#7C3AED", soft: "#F5F3FF" },
        success: { DEFAULT: "#16A34A", soft: "#F0FDF4" },
        warning: { DEFAULT: "#CA8A04", soft: "#FFF7ED" },
        danger: { DEFAULT: "#DC2626", hover: "#B91C1C", soft: "#FEF2F2" },
        page: "#FAFAFA",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        overline: ["11px", { lineHeight: "1.4", letterSpacing: "0.08em", fontWeight: "600" }],
        caption: ["12px", { lineHeight: "1.4", letterSpacing: "0.02em", fontWeight: "500" }],
        headline: ["30px", { lineHeight: "1.2", letterSpacing: "0.01em", fontWeight: "700" }],
        subhead: ["22px", { lineHeight: "1.3", fontWeight: "600" }],
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(0,0,0,0.04)",
        medium: "0 4px 12px rgba(0,0,0,0.06)",
        large: "0 12px 32px rgba(0,0,0,0.10)",
        focus: "0 0 0 1px #2563EB",
        "focus-danger": "0 0 0 1px #DC2626",
      },
      spacing: { sidebar: "280px" },
    },
  },
  plugins: [],
};

export default config;
