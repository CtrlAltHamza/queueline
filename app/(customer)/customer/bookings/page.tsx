"use client";

import { useState } from "react";
import { INITIAL_BOOKINGS, Booking } from "@/lib/mock-data";
import { formatCents } from "@/lib/utils";
import { Calendar, Clock, XCircle, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancelBooking = (id: string) => {
    if (!confirm("Are you sure you want to cancel this booking? The slot will become available for other customers immediately.")) {
      return;
    }

    setCancellingId(id);
    setTimeout(() => {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b))
      );
      setCancellingId(null);
    }, 400);
  };

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
            Manage your clinic &amp; salon reservations, check deposit receipts, or cancel.
          </p>
        </div>

        <Link
          href="/b/glow-clinic"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs sm:text-sm hover:bg-indigo-700 transition"
        >
          <span>Book New Service</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

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
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase">
                        {b.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Ref: {b.id}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg">{b.service_name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Deposit Paid: {formatCents(b.deposit_amount_cents)}</p>

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
                    <span className="text-[11px] text-slate-400">Free cancellation up to 24h prior</span>
                    <button
                      type="button"
                      disabled={cancellingId === b.id}
                      onClick={() => handleCancelBooking(b.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{cancellingId === b.id ? "Cancelling..." : "Cancel Appointment"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past / Cancelled History */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-4">Past &amp; Cancelled</h2>
          <div className="space-y-2">
            {pastBookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-800">{b.service_name}</span>
                  <span className="text-slate-400 ml-2">
                    {new Date(b.starts_at).toLocaleDateString()}
                  </span>
                </div>
                <span className={`font-semibold uppercase ${
                  b.status === "cancelled" ? "text-rose-600" : "text-slate-600"
                }`}>
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
