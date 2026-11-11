import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const roboto = localFont({
  src: "../public/fonts/roboto-700.woff2",
  weight: "700",
  style: "normal",
  display: "swap",
  variable: "--font-text",
  fallback: ["Helvetica Neue", "Arial", "Helvetica", "sans-serif"],
});

export const metadata: Metadata = {
  title: "NOMAS — 11—14 JUIN 2027",
  description: "NOMAS, du 11 au 14 juin 2027, en Isère.",
};

export const viewport: Viewport = {
  themeColor: "#fabb04",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // `suppressHydrationWarning` on <html>/<body> is intentional: browser
  // extensions (LanguageTool, Grammarly, …) inject attributes onto these
  // elements before React hydrates, which otherwise raises a false
  // "attributes didn't match" error in development.
  return (
    <html lang="fr" className={roboto.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
