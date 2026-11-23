"use client";

export const dynamic = "force-dynamic";

import { use, useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import { INITIAL_BUSINESSES, INITIAL_QUEUE_ENTRIES } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";
import { Clock, Users, ArrowRight, ShieldCheck, Ticket } from "lucide-react";

export default function JoinQueuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const business = INITIAL_BUSINESSES.find((b) => b.slug === slug);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [waitingCount, setWaitingCount] = useState(INITIAL_QUEUE_ENTRIES.filter((e) => e.status === "waiting").length);

  // Fetch real count from DB if available
  useEffect(() => {
    const businessId = business?.id;
    if (!businessId) return;

    async function loadCount() {
      try {
        const { count } = await (supabase.from("queue_entries") as any)
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "waiting");
        if (typeof count === "number") {
          setWaitingCount(count);
        }
      } catch (err) {}
    }
    loadCount();
  }, [business?.id, supabase]);

  if (!business) {
    notFound();
    return null;
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !name || !phone) return;

    setIsJoining(true);
    const nextTicketNum = `A0${16 + waitingCount}`;

    try {
      // 1. Attempt insert into real Supabase queue_entries table
      const { data: dbEntry } = await (supabase.from("queue_entries") as any)
        .insert({
          business_id: business.id,
          customer_name: name,
          customer_phone: phone,
          ticket_no: nextTicketNum,
          status: "waiting",
          estimated_wait_min: 15 * (waitingCount + 1),
        })
        .select("id")
        .maybeSingle();

      if (dbEntry?.id) {
        sessionStorage.setItem(
          `ticket_${dbEntry.id}`,
          JSON.stringify({
            id: dbEntry.id,
            ticket_no: nextTicketNum,
            customer_name: name,
            status: "waiting",
            estimated_wait_min: 15 * (waitingCount + 1),
            business_name: business.name,
          })
        );
        router.push(`/queue/${dbEntry.id}`);
        return;
      }
    } catch (err) {
      console.warn("DB insert fallback to session ticket:", err);
    }

    // Fallback: Generate local ticket
    const ticketId = `q-${Date.now()}`;
    sessionStorage.setItem(
      `ticket_${ticketId}`,
      JSON.stringify({
        id: ticketId,
        ticket_no: nextTicketNum,
        customer_name: name,
        status: "waiting",
        estimated_wait_min: 15 * (waitingCount + 1),
        business_name: business.name,
      })
    );

    setTimeout(() => {
      router.push(`/queue/${ticketId}`);
    }, 400);
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
              <span>{waitingCount}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium block">Est. Wait Time</span>
            <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-slate-800 mt-1">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>{waitingCount * 15}m</span>
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
