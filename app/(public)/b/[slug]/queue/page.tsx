"use client";

import { use, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { INITIAL_BUSINESSES, INITIAL_QUEUE_ENTRIES } from "@/lib/mock-data";
import { Clock, Users, ArrowRight, ShieldCheck, Ticket } from "lucide-react";

export default function JoinQueuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const business = INITIAL_BUSINESSES.find((b) => b.slug === slug);
  if (!business) {
    notFound();
  }

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const activeWaiting = INITIAL_QUEUE_ENTRIES.filter((e) => e.status === "waiting");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setIsJoining(true);
    // Generate new ticket
    const ticketId = `q-${Date.now()}`;
    const nextTicketNum = `A0${16 + activeWaiting.length}`;

    // Store in session storage for local display
    sessionStorage.setItem(
      `ticket_${ticketId}`,
      JSON.stringify({
        id: ticketId,
        ticket_no: nextTicketNum,
        customer_name: name,
        status: "waiting",
        estimated_wait_min: 15 * (activeWaiting.length + 1),
        business_name: business.name,
      })
    );

    setTimeout(() => {
      router.push(`/queue/${ticketId}`);
    }, 600);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Ticket className="w-6 h-6" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Join Walk-in Queue
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          At <strong>{business.name}</strong>. Step into line digitally and track your position live.
        </p>

        {/* Current Wait Metric */}
        <div className="my-6 grid grid-cols-2 gap-4 max-w-sm mx-auto">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium block">People Waiting</span>
            <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-slate-800 mt-1">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>{activeWaiting.length}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium block">Est. Wait Time</span>
            <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-slate-800 mt-1">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>{activeWaiting.length * 15}m</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleJoin} className="mt-8 text-left space-y-4 max-w-md mx-auto">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Your Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Phone Number * (For SMS alert when called)
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 019-2831"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isJoining}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition shadow-md shadow-indigo-200 disabled:opacity-50"
          >
            <span>{isJoining ? "Issuing Ticket..." : "Get Live Queue Ticket"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1 mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            No deposit required for walk-in live queue.
          </p>
        </form>
      </div>
    </div>
  );
}
