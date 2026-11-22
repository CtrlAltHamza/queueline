import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QueueLine | Booking & Live Queue for Clinics and Salons",
  description:
    "A booking and live-queue app for small clinics and salons. Customers book slots and pay a deposit, join a live queue and see their position.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>&copy; {new Date().getFullYear()} QueueLine Systems. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span>Next.js 15 &bull; Supabase Postgres &bull; Stripe Deposit &bull; Resend</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
