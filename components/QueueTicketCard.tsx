"use client";

import { useState, useEffect } from "react";
import { Users, Clock, Bell, Sparkles, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

interface QueueTicketCardProps {
  ticket: {
    id: string;
    ticket_no: string;
    customer_name: string;
    status: "waiting" | "called" | "served" | "no_show" | "left";
    estimated_wait_min: number;
    business_name?: string;
  };
  nowServingTicket?: string;
  peopleAheadCount?: number;
}

export function QueueTicketCard({
  ticket,
  nowServingTicket = "A013",
  peopleAheadCount = 1,
}: QueueTicketCardProps) {
  const [hasCelebrated, setHasCelebrated] = useState(false);

  useEffect(() => {
    if (ticket.status === "called" && !hasCelebrated) {
      setHasCelebrated(true);
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
        if ("vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      } catch (e) {
        // Fallback gracefully
      }
    }
  }, [ticket.status, hasCelebrated]);

  const isCalled = ticket.status === "called";
  const isServed = ticket.status === "served";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border transition-all duration-300 shadow-xl ${
        isCalled
          ? "border-emerald-400 bg-gradient-to-b from-emerald-50 via-white to-white ring-4 ring-emerald-100"
          : isServed
          ? "border-slate-200 bg-slate-50"
          : "border-indigo-200 bg-white"
      }`}
    >
      {/* Top Header Badge */}
      <div className={`px-6 py-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wider ${
        isCalled ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
      }`}>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>Live Queue Ticket</span>
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] backdrop-blur">
          {ticket.status.toUpperCase()}
        </span>
      </div>

      <div className="p-6 sm:p-8 text-center">
        <p className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-1">
          Your Ticket Number
        </p>
        <div className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight my-2">
          {ticket.ticket_no}
        </div>
        <p className="text-sm font-medium text-slate-600 mb-6">
          Reserved for <strong className="text-slate-900">{ticket.customer_name}</strong>
        </p>

        {isCalled ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 mb-6 animate-pulse">
            <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-lg mb-1">
              <Bell className="w-6 h-6 text-emerald-600 animate-bounce" />
              <span>It&apos;s Your Turn! Please proceed to front desk</span>
            </div>
            <p className="text-emerald-700 text-xs">
              Staff is ready to serve you right now.
            </p>
          </div>
        ) : isServed ? (
          <div className="rounded-2xl bg-slate-100 p-4 mb-6 text-slate-600 flex items-center justify-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Service completed. Thank you for visiting!</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <span className="text-xs text-slate-500 font-medium block">Now Serving</span>
              <span className="text-2xl font-bold text-indigo-600">{nowServingTicket}</span>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <span className="text-xs text-slate-500 font-medium block">People Ahead</span>
              <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-slate-800">
                <Users className="w-5 h-5 text-slate-400" />
                <span>{peopleAheadCount}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Realtime position updates automatically</span>
        </div>
      </div>
    </div>
  );
}
