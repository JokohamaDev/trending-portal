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
  description: "Discover what's trending in Vietnam. Real-time updated charts.",
  keywords: ["Vietnam", "trending", "Spotify", "YouTube", "Netflix", "Google Trends", "Steam", "charts", "music", "videos", "news"],
  authors: [{ name: "AI & Jokohama" }],
  openGraph: {
    title: "Vietnam Trending Media Dashboard",
    description: "Real-time trending media & news charts for Vietnam",
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
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var darkMode = localStorage.getItem('darkMode');
                  if (darkMode !== null) {
                    if (darkMode === 'true') {
                      document.documentElement.classList.add('dark');
                    }
                  } else {
                    // Default to dark if no preference
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      {gaId && <GoogleAnalytics gaId={gaId} />}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
