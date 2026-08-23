import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Agora — Skills & Memory Library",
    template: "%s · Agora",
  },
  description:
    "Your organisation's living library of agent skills and memories. Create, share, evaluate, and consume them from any agent via MCP.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<HeaderFallback />}>
          <Nav />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-neutral-200 py-6">
          <p className="mx-auto max-w-6xl px-4 text-xs text-neutral-400">
            Agora — skills get better every time they&apos;re used.
          </p>
        </footer>
      </body>
    </html>
  );
}

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-6 place-items-center rounded-md bg-neutral-900 text-xs text-white">
            A
          </span>
          Agora
        </span>
      </div>
    </header>
  );
}
