"use client";

import { use, useEffect, useState } from "react";
import { QueueTicketCard } from "@/components/QueueTicketCard";
import { INITIAL_QUEUE_ENTRIES } from "@/lib/mock-data";
import Link from "next/link";
import { ArrowLeft, Clock, Store } from "lucide-react";

export default function LiveTicketTrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [ticket, setTicket] = useState<{
    id: string;
    ticket_no: string;
    customer_name: string;
    status: "waiting" | "called" | "served" | "no_show" | "left";
    estimated_wait_min: number;
    business_name?: string;
  }>(() => {
    // Check mock entries or session storage
    const found = INITIAL_QUEUE_ENTRIES.find((e) => e.id === id);
    if (found) {
      return {
        id: found.id,
        ticket_no: found.ticket_no,
        customer_name: found.customer_name,
        status: found.status,
        estimated_wait_min: found.estimated_wait_min,
        business_name: "Glow Aesthetic Clinic",
      };
    }
    return {
      id,
      ticket_no: "A014",
      customer_name: "Valued Customer",
      status: "waiting",
      estimated_wait_min: 15,
      business_name: "Glow Aesthetic Clinic",
    };
  });

  const [nowServing, setNowServing] = useState("A013");

  // Load from session storage if generated
  useEffect(() => {
    const raw = sessionStorage.getItem(`ticket_${id}`);
    if (raw) {
      try {
        setTicket(JSON.parse(raw));
      } catch (e) {}
    }
  }, [id]);

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-16">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <span className="text-xs font-medium text-slate-400">Live Status Tracker</span>
      </div>

      <QueueTicketCard ticket={ticket} nowServingTicket={nowServing} peopleAheadCount={1} />

      {/* Demo Controls to test live state transition */}
      <div className="mt-8 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Interactive Demo: Simulate Staff Action
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setTicket((prev) => ({ ...prev, status: "called" }))}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
          >
            Simulate "Staff Calls You"
          </button>
          <button
            type="button"
            onClick={() => setTicket((prev) => ({ ...prev, status: "served" }))}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition"
          >
            Simulate "Service Completed"
          </button>
          <button
            type="button"
            onClick={() => setTicket((prev) => ({ ...prev, status: "waiting" }))}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
          >
            Reset to Waiting
          </button>
        </div>
      </div>
    </div>
  );
}
