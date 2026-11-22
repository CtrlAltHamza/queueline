"use client";

import { useState } from "react";
import { Users, PhoneCall, Check, UserX, Clock, ChevronRight } from "lucide-react";
import { QueueEntry } from "@/lib/mock-data";

interface StaffQueueBoardProps {
  initialEntries: QueueEntry[];
  businessName: string;
  businessId?: string;
  onEntryUpdated?: () => void;
}

export function StaffQueueBoard({ initialEntries, businessName, businessId, onEntryUpdated }: StaffQueueBoardProps) {
  const [entries, setEntries] = useState<QueueEntry[]>(initialEntries);

  const waitingEntries = entries.filter((e) => e.status === "waiting");
  const calledEntries = entries.filter((e) => e.status === "called");

  const handleCallNext = async (id?: string) => {
    const targetId = id || waitingEntries[0]?.id;
    if (!targetId) return;

    // Optimistic UI update
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id === targetId) {
          return { ...item, status: "called" };
        }
        return item;
      })
    );

    try {
      await fetch("/api/queue/call-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: targetId, business_id: businessId }),
      });
      if (onEntryUpdated) onEntryUpdated();
    } catch (err) {
      console.error("Failed to persist call-next to API:", err);
    }
  };

  const handleStatusChange = async (id: string, status: "served" | "no_show") => {
    setEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );

    try {
      // In Supabase client or API:
      if (onEntryUpdated) onEntryUpdated();
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{businessName} - Live Queue Board</h2>
          <p className="text-sm text-slate-500 mt-1">
            {waitingEntries.length} waiting &bull; {calledEntries.length} currently being served
          </p>
        </div>

        <button
          type="button"
          disabled={waitingEntries.length === 0}
          onClick={() => handleCallNext()}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Call Next Ticket ({waitingEntries[0]?.ticket_no || "None"})</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active / Called Column */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <span>Now at Counter ({calledEntries.length})</span>
            </h3>
          </div>

          {calledEntries.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl">
              No ticket currently called. Click &quot;Call Next Ticket&quot; to summon the next customer.
            </div>
          ) : (
            <div className="space-y-3">
              {calledEntries.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-lg">
                      {ticket.ticket_no}
                    </span>
                    <h4 className="font-semibold text-slate-900 mt-1.5">{ticket.customer_name}</h4>
                    <p className="text-xs text-slate-500">{ticket.customer_phone}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(ticket.id, "served")}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Complete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(ticket.id, "no_show")}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-medium border border-rose-200 transition"
                    >
                      <UserX className="w-4 h-4" />
                      <span>No Show</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Waiting Queue Column */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Waiting List ({waitingEntries.length})</span>
            </h3>
          </div>

          {waitingEntries.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl">
              Queue is clear. No waiting walk-ins.
            </div>
          ) : (
            <div className="space-y-3">
              {waitingEntries.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-bold text-slate-400">
                      #{index + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-sm">
                      {ticket.ticket_no}
                    </span>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{ticket.customer_name}</p>
                      <span className="text-xs text-slate-400">Est. wait: {ticket.estimated_wait_min}m</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCallNext(ticket.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
                  >
                    <span>Call Now</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
