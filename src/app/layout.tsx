import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FathomAnalytics } from "./fathom";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XCP Group Bot - Token Gate Your Telegram Groups",
  description: "Token-gate your Telegram groups with Counterparty assets. Require specific token holdings or Bitcoin address verification for group membership. Open source and secure.",
  keywords: ["Telegram bot", "token gating", "Counterparty", "XCP", "Bitcoin", "cryptocurrency", "group management"],
  authors: [{ name: "XCP Group Bot" }],
  robots: "index, follow",
  openGraph: {
    title: "XCP Group Bot - Token Gate Your Telegram Groups",
    description: "Token-gate your Telegram groups with Counterparty assets. Require specific token holdings or Bitcoin address verification for group membership.",
    type: "website",
    url: "https://telegram.xcp.io",
    images: [
      {
        url: "/images/xcp-bot-logo.png",
        width: 1200,
        height: 630,
        alt: "XCP Group Bot Logo",
      },
    ],
    siteName: "XCP Group Bot",
  },
  twitter: {
    card: "summary_large_image",
    title: "XCP Group Bot - Token Gate Your Telegram Groups",
    description: "Token-gate your Telegram groups with Counterparty assets. Require specific token holdings or Bitcoin address verification for group membership.",
    images: ["/images/xcp-bot-logo.png"],
  },
  metadataBase: new URL('https://telegram.xcp.io'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FathomAnalytics />
        {children}
      </body>
    </html>
  );
}
