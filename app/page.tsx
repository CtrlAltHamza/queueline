import Link from "next/link";
import { Sparkles, Scissors, Clock, ShieldCheck, ArrowRight, CheckCircle2, Users, Calendar } from "lucide-react";
import { INITIAL_BUSINESSES } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100/80 text-indigo-700 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Eliminate No-Shows &amp; Waiting Room Chaos</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Smart Booking &amp; Live Queue for Modern <span className="text-indigo-600">Clinics &amp; Salons</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Customers book guaranteed slots with Stripe deposits or join the live walk-in queue from their phone. Staff run the day effortlessly from any tablet.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/b/glow-clinic"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm sm:text-base hover:bg-indigo-700 active:scale-95 transition shadow-lg shadow-indigo-200"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explore Glow Aesthetic Clinic</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/b/urban-blade"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 text-white font-semibold text-sm sm:text-base hover:bg-slate-800 active:scale-95 transition shadow-lg shadow-slate-200"
            >
              <Scissors className="w-4 h-4" />
              <span>Explore Urban Blade Barbers</span>
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Postgres Exclusion Constraints (Zero Double-Booking)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Idempotent Stripe Webhooks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Sub-Second Realtime Queue Sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Business Cards Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Experience Live Demo Portals</h2>
          <p className="mt-2 text-slate-600 text-sm">
            Choose a demo clinic or salon to test customer booking, walk-in live queue, staff dashboard, or owner analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {INITIAL_BUSINESSES.map((biz) => (
            <div
              key={biz.id}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                    {biz.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Deposit Required: ${(biz.deposit_cents / 100).toFixed(2)}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-slate-900">{biz.name}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{biz.description}</p>
                <p className="mt-3 text-xs text-slate-400">{biz.address}</p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-3">
                <Link
                  href={`/b/${biz.slug}`}
                  className="flex-1 text-center py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-medium text-xs sm:text-sm hover:bg-indigo-700 transition"
                >
                  Book Appointment
                </Link>
                <Link
                  href={`/b/${biz.slug}/queue`}
                  className="flex-1 text-center py-2.5 px-4 rounded-xl bg-slate-100 text-slate-800 font-medium text-xs sm:text-sm hover:bg-slate-200 transition"
                >
                  Join Live Queue
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Role Navigation Hub */}
      <section className="bg-slate-100 py-16 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h3 className="text-xl font-bold text-slate-900">Role-Based Portals</h3>
            <p className="text-xs text-slate-500 mt-1">Jump directly into any user role interface</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Link
              href="/customer/bookings"
              className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 transition shadow-sm group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900">Customer Portal</h4>
              <p className="text-xs text-slate-500 mt-1">
                View upcoming appointments, cancel bookings, and view ticket status.
              </p>
            </Link>

            <Link
              href="/staff"
              className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 transition shadow-sm group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900">Staff Schedule &amp; Queue</h4>
              <p className="text-xs text-slate-500 mt-1">
                Call next ticket, mark served, handle no-shows, and view today's timetable.
              </p>
            </Link>

            <Link
              href="/owner"
              className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 transition shadow-sm group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900">Owner Dashboard</h4>
              <p className="text-xs text-slate-500 mt-1">
                Revenue metrics, booking stats, service pricing, and business operating hours.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
