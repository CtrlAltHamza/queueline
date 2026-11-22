"use client";

import { StaffQueueBoard } from "@/components/StaffQueueBoard";
import { INITIAL_QUEUE_ENTRIES, INITIAL_BOOKINGS } from "@/lib/mock-data";
import { Clock, Calendar, CheckCircle, UserX, Phone } from "lucide-react";

export default function StaffPortalPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Staff Operational Hub
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Realtime schedule execution, walk-in live queue call-outs, and client intake.
        </p>
      </div>

      {/* Staff Queue Board Component */}
      <StaffQueueBoard
        initialEntries={INITIAL_QUEUE_ENTRIES}
        businessName="Glow Aesthetic Clinic"
      />

      {/* Today's Scheduled Appointments */}
      <div className="mt-12 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-lg">Today's Appointment Schedule</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {INITIAL_BOOKINGS.length} booked
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {INITIAL_BOOKINGS.map((booking) => {
            const time = new Date(booking.starts_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            return (
              <div key={booking.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 text-center">
                    <span className="text-sm font-bold text-indigo-600 block">{time}</span>
                    <span className="text-[11px] text-slate-400">45 min</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{booking.customer_name}</h3>
                    <p className="text-xs text-slate-500">{booking.service_name} &bull; {booking.notes}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    Deposit Paid
                  </span>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition"
                  >
                    Check In
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
