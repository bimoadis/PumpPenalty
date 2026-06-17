import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SolanaWalletProvider from "@/providers/SolanaWalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pump Penalty - Provably Fair Web3 Penalty Shootout",
  description: "Play Pump Penalty, a retro pixel-art penalty shootout. Features live odds from Polymarket, stateless provably fair seed audits, and Solana Devnet Web3 integration.",
  keywords: ["provably fair", "solana", "polymarket", "next.js", "retro game", "web3", "crypto shootout"],
  openGraph: {
    title: "Pump Penalty - Provably Fair Web3 Penalty Shootout",
    description: "Play Pump Penalty, a retro pixel-art penalty shootout. Features live odds from Polymarket, stateless provably fair seed audits, and Solana Devnet Web3 integration.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pump Penalty - Provably Fair Web3 Penalty Shootout",
    description: "Play Pump Penalty, a retro pixel-art penalty shootout. Features live odds from Polymarket, stateless provably fair seed audits, and Solana Devnet Web3 integration.",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  );
}
