import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
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
  title: "Meal Assistant",
  description: "Weekly meal planning with automated grocery lists",
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
        <header className="border-b border-primary/15 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <nav className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity">
              <UtensilsCrossed className="size-5 text-primary" />
              Meal Assistant
            </Link>
          </nav>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
