"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Calendar, Clock, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

export default function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ booking_id?: string }>;
}) {
  const { slug } = use(params);
  const { booking_id } = use(searchParams);

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Appointment Confirmed!
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Your deposit has been successfully processed via Stripe. A confirmation email has been dispatched with appointment instructions.
        </p>

        {booking_id && (
          <div className="my-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 inline-block text-left">
            <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider block">
              Booking Reference
            </span>
            <span className="font-mono text-sm font-bold text-indigo-900">{booking_id}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/customer/bookings"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200"
          >
            View in Customer Portal
          </Link>
          <Link
            href={`/b/${slug}`}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 text-slate-800 font-medium text-sm hover:bg-slate-200 transition"
          >
            Back to Business Page
          </Link>
        </div>
      </div>
    </div>
  );
}
