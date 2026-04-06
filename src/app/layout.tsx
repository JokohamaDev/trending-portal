import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vietnam Trending Media Dashboard | Real-time Charts",
  description: "Discover what's trending in Vietnam across Spotify, YouTube, Netflix, and Google Search. Real-time updated charts for music, videos, movies, and search trends.",
  keywords: ["Vietnam", "trending", "Spotify", "YouTube", "Netflix", "Google Trends", "charts", "music", "videos"],
  authors: [{ name: "Trending Portal" }],
  openGraph: {
    title: "Vietnam Trending Media Dashboard",
    description: "Real-time trending charts from Spotify, YouTube, Netflix & Google for Vietnam",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {gaId && <GoogleAnalytics gaId={gaId} />}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
