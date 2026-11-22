import Link from "next/link";
import { Sparkles, Clock, ShieldCheck, ArrowRight, Users, Calendar, Building2, Globe } from "lucide-react";
import { INITIAL_BUSINESSES } from "@/lib/mock-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCents } from "@/lib/utils";

export const revalidate = 0; // Always dynamic to show freshly registered businesses

export default async function HomePage() {
  let businesses = INITIAL_BUSINESSES;

  try {
    const admin: any = createAdminClient();
    const { data: dbBusinesses } = await admin
      .from("businesses")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (dbBusinesses && dbBusinesses.length > 0) {
      businesses = dbBusinesses.map((b: any) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        description: b.description || "Professional services and live appointments.",
        category: b.category,
        timezone: b.timezone,
        deposit_cents: b.deposit_cents || 0,
        currency: b.currency || "PKR",
        address: b.address || "Main Street",
        phone: b.phone || "",
      }));
    }
  } catch (err) {
    console.error("Failed to load dynamic businesses on homepage:", err);
  }

  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100/80 text-indigo-700 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Multi-Tenant Booking &amp; Live Queue Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Smart Booking &amp; Live Queue for <span className="text-indigo-600">Any Business Worldwide</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate waiting room chaos. Anyone can register their clinic, salon, hospital, or consulting practice. Customers book slots, join live walk-in queues, and track tickets in real-time.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register-business"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm sm:text-base hover:bg-indigo-700 active:scale-95 transition shadow-lg shadow-indigo-200"
            >
              <Building2 className="w-5 h-5" />
              <span>Register Your Business</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 text-white font-semibold text-sm sm:text-base hover:bg-slate-800 active:scale-95 transition shadow-lg shadow-slate-200"
            >
              <Users className="w-4 h-4" />
              <span>Customer Sign In</span>
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Pakistan (PKR) &amp; Global Multi-Currency Support</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Postgres Exclusion (Zero Double-Booking)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Sub-Second Realtime Queue Updates</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Businesses Directory */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Registered Businesses</h2>
            <p className="mt-1 text-slate-600 text-sm">
              Discover active clinics, salons, and practices offering online slot booking and walk-in queues.
            </p>
          </div>

          <Link
            href="/register-business"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <span>+ Add your business to this directory</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((biz) => (
            <div
              key={biz.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase tracking-wider">
                    {biz.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Deposit: {biz.deposit_cents > 0 ? formatCents(biz.deposit_cents, biz.currency) : "Free / Venue"}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900">{biz.name}</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-2">{biz.description}</p>
                {biz.address && <p className="mt-2 text-[11px] text-slate-400">{biz.address}</p>}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                <Link
                  href={`/b/${biz.slug}`}
                  className="flex-1 text-center py-2 px-3 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 transition"
                >
                  Book Appointment
                </Link>
                <Link
                  href={`/b/${biz.slug}/queue`}
                  className="flex-1 text-center py-2 px-3 rounded-xl bg-slate-100 text-slate-800 font-medium text-xs hover:bg-slate-200 transition"
                >
                  Live Queue
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
            <h3 className="text-xl font-bold text-slate-900">Choose Your Workspace</h3>
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
