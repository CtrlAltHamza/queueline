"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { formatCents } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Clock, XCircle, CheckCircle2, AlertCircle, ArrowRight, UserCheck } from "lucide-react";
import Link from "next/link";

interface CustomerBooking {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  deposit_amount_cents: number;
  notes?: string | null;
  service_name?: string;
  business_name?: string;
  business_slug?: string;
  currency?: string;
}

export default function CustomerBookingsPage() {
  const supabase = createClient() as any;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserBookings() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(authData.user);

        // Fetch user's real bookings from Supabase
        const { data, error } = await supabase
          .from("bookings")
          .select("*, services(name, duration_min), businesses(name, slug, currency)")
          .eq("customer_id", authData.user.id)
          .order("starts_at", { ascending: false });

        if (error) {
          console.error("Failed to fetch customer bookings:", error);
        } else if (data) {
          const formatted: CustomerBooking[] = data.map((b: any) => ({
            id: b.id,
            starts_at: b.starts_at,
            ends_at: b.ends_at,
            status: b.status,
            deposit_amount_cents: b.deposit_amount_cents || 0,
            notes: b.notes,
            service_name: b.services?.name || "Service Appointment",
            business_name: b.businesses?.name || "Clinic / Salon",
            business_slug: b.businesses?.slug || "glow-clinic",
            currency: b.businesses?.currency || "PKR",
          }));
          setBookings(formatted);
        }
      } catch (err) {
        console.error("Auth check or query error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUserBookings();
  }, [supabase]);

  const handleCancelBooking = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this booking? The slot will become available for other customers immediately.")) {
      return;
    }

    setCancellingId(id);
    setCancelError(null);

    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to cancel booking");
      }

      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b))
      );
    } catch (err: any) {
      setCancelError(err.message || "Failed to cancel booking. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading your appointments...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Sign In to View Appointments</h1>
        <p className="mt-2 text-sm text-slate-500">
          Please sign in with your account to review your upcoming reservations, deposit receipts, and manage cancellations.
        </p>
        <Link
          href="/login?next=/customer/bookings"
          className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200"
        >
          <span>Sign In / Create Account</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const activeBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "pending_payment");
  const pastBookings = bookings.filter((b) => b.status === "completed" || b.status === "cancelled");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Appointments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <span className="font-semibold text-slate-700">{user.email}</span>. Manage your reservations or cancel.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs sm:text-sm hover:bg-indigo-700 transition"
        >
          <span>Browse Businesses</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {cancelError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {cancelError}
        </div>
      )}

      {/* Upcoming Section */}
      <div className="space-y-4 mb-10">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>Upcoming Appointments ({activeBookings.length})</span>
        </h2>

        {activeBookings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400">
            No upcoming appointments scheduled.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBookings.map((b) => {
              const startDate = new Date(b.starts_at);
              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        b.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {b.status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">ID: {b.id.slice(0, 8)}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg">{b.service_name}</h3>
                    <p className="text-xs font-medium text-indigo-600 mt-0.5">{b.business_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Deposit: {formatCents(b.deposit_amount_cents, b.currency)}
                    </p>

                    <div className="mt-4 p-3 rounded-xl bg-slate-50 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">
                          {startDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">
                          {startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={cancellingId === b.id}
                      onClick={() => handleCancelBooking(b.id)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50"
                    >
                      {cancellingId === b.id ? "Cancelling..." : "Cancel Appointment"}
                    </button>
                    {b.business_slug && (
                      <Link
                        href={`/b/${b.business_slug}`}
                        className="text-xs text-indigo-600 hover:underline font-medium"
                      >
                        Business Details &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past / Cancelled History */}
      {pastBookings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
            <span>Past &amp; Cancelled Appointments ({pastBookings.length})</span>
          </h2>

          <div className="space-y-2">
            {pastBookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between opacity-75"
              >
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">{b.service_name} &bull; {b.business_name}</h4>
                  <p className="text-xs text-slate-400">
                    {new Date(b.starts_at).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <span className="text-xs font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
