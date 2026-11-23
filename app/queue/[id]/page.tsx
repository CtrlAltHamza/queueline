"use client";

export const dynamic = "force-dynamic";

import { use, useEffect, useState, useCallback } from "react";
import { QueueTicketCard } from "@/components/QueueTicketCard";
import { INITIAL_QUEUE_ENTRIES } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, Clock, Store, Radio } from "lucide-react";

export default function LiveTicketTrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();

  const [ticket, setTicket] = useState<{
    id: string;
    ticket_no: string;
    customer_name: string;
    status: "waiting" | "called" | "served" | "no_show" | "left";
    estimated_wait_min: number;
    business_name?: string;
    business_id?: string;
    created_at?: string;
  }>(() => {
    // Check mock entries or default
    const found = INITIAL_QUEUE_ENTRIES.find((e) => e.id === id);
    if (found) {
      return {
        id: found.id,
        ticket_no: found.ticket_no,
        customer_name: found.customer_name,
        status: found.status,
        estimated_wait_min: found.estimated_wait_min,
        business_name: "Glow Aesthetic Clinic",
        business_id: found.business_id,
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
  const [peopleAheadCount, setPeopleAheadCount] = useState(1);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const fetchTicketAndQueue = useCallback(async () => {
    try {
      // 1. Fetch current ticket from DB
      const { data: dbTicket } = await (supabase.from("queue_entries") as any)
        .select("*, businesses(name)")
        .eq("id", id)
        .maybeSingle();

      if (dbTicket) {
        setTicket({
          id: dbTicket.id,
          ticket_no: dbTicket.ticket_no,
          customer_name: dbTicket.customer_name,
          status: dbTicket.status,
          estimated_wait_min: dbTicket.estimated_wait_min,
          business_name: dbTicket.businesses?.name || "Glow Aesthetic Clinic",
          business_id: dbTicket.business_id,
          created_at: dbTicket.created_at,
        });

        // 2. Query other queue entries for this business to determine now-serving and people-ahead
        const { data: entries } = await (supabase.from("queue_entries") as any)
          .select("id, ticket_no, status, created_at")
          .eq("business_id", dbTicket.business_id)
          .in("status", ["waiting", "called"])
          .order("created_at", { ascending: true });

        if (entries && entries.length > 0) {
          const called = entries.find((e: any) => e.status === "called");
          if (called) {
            setNowServing(called.ticket_no);
          } else {
            const firstWaiting = entries.find((e: any) => e.status === "waiting");
            if (firstWaiting) setNowServing(firstWaiting.ticket_no);
          }

          // Count tickets ahead of this user
          const ahead = entries.filter(
            (e: any) => e.status === "waiting" && new Date(e.created_at) < new Date(dbTicket.created_at)
          ).length;
          setPeopleAheadCount(ahead);
        }
      }
    } catch (e) {
      console.warn("Using local session/mock queue data:", e);
    }
  }, [id, supabase]);

  // Load from session storage if present (instant client cache)
  useEffect(() => {
    const raw = sessionStorage.getItem(`ticket_${id}`);
    if (raw) {
      try {
        setTicket(JSON.parse(raw));
      } catch (e) {}
    }
  }, [id]);

  // Initial DB fetch and Supabase Realtime channel subscription
  useEffect(() => {
    fetchTicketAndQueue();

    const channel = supabase
      .channel(`live-queue-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_entries",
        },
        (payload: any) => {
          if (payload.new && payload.new.id === id) {
            setTicket((prev) => ({
              ...prev,
              status: payload.new.status,
              ticket_no: payload.new.ticket_no || prev.ticket_no,
            }));
          }
          fetchTicketAndQueue();
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchTicketAndQueue, supabase]);

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
        <div className="flex items-center gap-2">
          {realtimeConnected && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Realtime Connected
            </span>
          )}
          <span className="text-xs font-medium text-slate-400">Live Status Tracker</span>
        </div>
      </div>

      <QueueTicketCard ticket={ticket} nowServingTicket={nowServing} peopleAheadCount={peopleAheadCount} />

      {/* Interactive Simulation Controls */}
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
            Simulate &quot;Staff Calls You&quot;
          </button>
          <button
            type="button"
            onClick={() => setTicket((prev) => ({ ...prev, status: "served" }))}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition"
          >
            Simulate &quot;Service Completed&quot;
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
