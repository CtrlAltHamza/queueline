"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Clock, Calendar, BarChart3, Scissors, Sparkles, Store } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/b/glow-clinic", label: "Glow Clinic (Demo)", icon: Sparkles },
    { href: "/b/urban-blade", label: "Urban Blade (Demo)", icon: Scissors },
    { href: "/customer/bookings", label: "My Bookings", icon: Calendar },
    { href: "/staff", label: "Staff Queue", icon: Clock },
    { href: "/owner", label: "Owner Portal", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600 tracking-tight">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Clock className="w-5 h-5" />
            </div>
            <span>Queue<span className="text-slate-900">Line</span></span>
          </Link>
          <span className="hidden md:inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            Live Queue & Booking
          </span>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
