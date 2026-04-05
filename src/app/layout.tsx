import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { CalendarDays, Plus, UtensilsCrossed } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import DemoBanner from "@/components/DemoBanner";
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
        <DemoBanner />
        <header className="border-b border-primary/15 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <nav className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity">
              <UtensilsCrossed className="size-5 text-primary" />
              Meal Assistant
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/generate"
                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-primary/20 text-primary h-7 px-2.5 text-[0.8rem] font-medium hover:bg-primary/5 transition-all"
                data-testid="generate-plan-link"
              >
                <CalendarDays className="size-3.5" />
                Generate Plan
              </Link>
              <Link
                href="/recipes/new"
                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-primary text-primary-foreground h-7 px-2.5 text-[0.8rem] font-medium hover:bg-primary/80 transition-all"
                data-testid="add-recipe-link"
              >
                <Plus className="size-3.5" />
                Add Recipe
              </Link>
            </div>
          </nav>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
