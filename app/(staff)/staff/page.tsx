"use client";

import { useState, useEffect } from "react";
import { StaffQueueBoard } from "@/components/StaffQueueBoard";
import { INITIAL_QUEUE_ENTRIES, INITIAL_BOOKINGS, QueueEntry } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";
import { Clock, Calendar, CheckCircle, UserX, Phone, Users, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function StaffPortalPage() {
  const supabase: any = createClient();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>(INITIAL_QUEUE_ENTRIES);
  const [todayBookings, setTodayBookings] = useState<any[]>([]);

  const loadStaffData = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(authData.user);

      // 1. Check user memberships
      const { data: memberships } = await (supabase.from("memberships") as any)
        .select("business_id, role, businesses(*)")
        .eq("user_id", authData.user.id)
        .limit(1);

      let activeBiz: any = null;
      if (memberships && memberships.length > 0 && memberships[0].businesses) {
        activeBiz = memberships[0].businesses;
      } else {
        // Fallback to first business
        const { data: firstBiz } = await (supabase.from("businesses") as any)
          .select("*")
          .limit(1)
          .single();
        if (firstBiz) activeBiz = firstBiz;
      }

      if (activeBiz) {
        setBusiness(activeBiz);

        // 2. Fetch live queue entries
        const { data: qData } = await (supabase.from("queue_entries") as any)
          .select("*")
          .eq("business_id", activeBiz.id)
          .order("created_at", { ascending: true });

        if (qData && qData.length > 0) {
          setQueueEntries(qData);
        }

        // 3. Fetch today's bookings
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const { data: bData } = await (supabase.from("bookings") as any)
          .select("*, services(name, duration_min)")
          .eq("business_id", activeBiz.id)
          .gte("starts_at", todayStart.toISOString())
          .lte("starts_at", todayEnd.toISOString())
          .not("status", "eq", "cancelled")
          .order("starts_at", { ascending: true });

        if (bData) {
          setTodayBookings(bData);
        }
      }
    } catch (err) {
      console.error("Failed to load staff data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading Staff Operational Hub...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Staff Portal Authentication</h1>
        <p className="mt-2 text-sm text-slate-500">
          Please sign in with your staff or clinic practitioner credentials to manage the walk-in queue and client intake.
        </p>
        <Link
          href="/login?next=/staff"
          className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200"
        >
          <span>Sign In as Staff</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const businessName = business?.name || "Clinic / Salon";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Staff Operational Hub
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Realtime schedule execution, walk-in live queue call-outs, and intake for <span className="font-semibold text-slate-800">{businessName}</span>.
        </p>
      </div>

      {/* Staff Queue Board Component */}
      <StaffQueueBoard
        initialEntries={queueEntries}
        businessName={businessName}
        businessId={business?.id}
        onEntryUpdated={loadStaffData}
      />

      {/* Today's Scheduled Appointments */}
      <div className="mt-12 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-lg">Today&apos;s Appointment Schedule</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {todayBookings.length} scheduled
          </span>
        </div>

        {todayBookings.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No appointments scheduled for today yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todayBookings.map((booking) => {
              const time = new Date(booking.starts_at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });
              return (
                <div key={booking.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 text-center">
                      <span className="text-sm font-bold text-indigo-600 block">{time}</span>
                      <span className="text-[11px] text-slate-400">{booking.services?.duration_min || 30} min</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{booking.customer_name}</h3>
                      <p className="text-xs text-slate-500">
                        {booking.services?.name || "Service"} {booking.customer_phone ? `• ${booking.customer_phone}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${booking.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
