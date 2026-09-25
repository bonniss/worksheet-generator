import type { Metadata } from "next";
import { Fira_Code, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const display = Plus_Jakarta_Sans({ subsets: ["latin", "vietnamese"], weight: ["600", "700", "800"], variable: "--font-display" });
const body = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-body" });
const mono = Fira_Code({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Worksheet Genie", template: "%s · Worksheet Genie" },
  description: "Tạo worksheet tiếng Anh theo trình độ CEFR với AI",
  applicationName: "Worksheet Genie",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body style={{ margin: 0, background: "#FAFAFA" }}>{children}</body>
    </html>
  );
}
