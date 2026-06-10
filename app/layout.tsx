import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { Nav } from "./nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BoosterHub — District Sales Intelligence",
  description: "Research districts, surface contacts, identify booster-club customers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="https://boosterhub.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 group"
          >
              <Image
                src="/boosterhub_logo.jpg"
                alt="BoosterHub"
                width={140}
                height={36}
                priority
                className="h-7 w-auto"
              />
              <span className="hidden md:inline text-xs font-medium tracking-wide text-slate-400 uppercase border-l border-slate-200 pl-3">
                Sales Intelligence
              </span>
            </Link>
            <Nav />
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
