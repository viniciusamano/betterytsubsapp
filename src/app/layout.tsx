import type { Metadata } from "next";
import { Orbitron, Space_Mono } from "next/font/google";
import "./globals.css";

// Decorative display face — used sparingly for headings and system-y labels.
const orbitron = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

// Used for system/status text (timestamps, tickers, table headers) — never
// for content the user actually needs to read at length.
const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Meus Canais",
  description: "Organize, filtre e exporte os canais que você é inscrito no YouTube.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${orbitron.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
