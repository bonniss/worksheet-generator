import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  // Tắt preflight để không phá inline-style của WorksheetGenerator
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};

export default config;
