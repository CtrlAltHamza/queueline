"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { OwnerStatsCards } from "@/components/OwnerStatsCards";
import { ServiceModal } from "@/components/ServiceModal";
import { Service, BusinessHours } from "@/lib/mock-data";
import { formatCents } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Trash2, Clock, Calendar, Sparkles, Building2, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function OwnerPortalPage() {
  const supabase: any = createClient();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [stats, setStats] = useState({
    totalBookingsToday: 0,
    totalRevenueCents: 0,
    noShowRatePct: 0,
    avgWaitMin: 12,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOwnerData() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(authData.user);

        // 1. Check owner membership in public.memberships
        const { data: memberships } = await (supabase.from("memberships") as any)
          .select("business_id, role, businesses(*)")
          .eq("user_id", authData.user.id)
          .eq("role", "owner")
          .limit(1);

        let activeBiz: any = null;

        if (memberships && memberships.length > 0 && memberships[0].businesses) {
          activeBiz = memberships[0].businesses;
        } else {
          // User is logged in but owns no businesses: do NOT fall back to other tenants' data
          activeBiz = null;
        }

        if (activeBiz) {
          setBusiness(activeBiz);

          // 2. Fetch real services from public.services
          const { data: svcData } = await (supabase.from("services") as any)
            .select("*")
            .eq("business_id", activeBiz.id)
            .eq("is_active", true);

          if (svcData) {
            setServices(svcData);
          }

          // 3. Fetch real operating hours from public.business_hours
          const { data: hoursData } = await (supabase.from("business_hours") as any)
            .select("*")
            .eq("business_id", activeBiz.id)
            .order("weekday", { ascending: true });

          if (hoursData && hoursData.length > 0) {
            setHours(hoursData);
          }

          // 4. Compute real stats from public.bookings
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          const { data: allBookings } = await (supabase.from("bookings") as any)
            .select("starts_at, status, deposit_amount_cents")
            .eq("business_id", activeBiz.id);

          if (allBookings) {
            const todayCount = allBookings.filter((b: any) => {
              const d = new Date(b.starts_at);
              return d >= todayStart && d <= todayEnd && b.status !== "cancelled";
            }).length;

            const revenue = allBookings
              .filter((b: any) => b.status === "confirmed" || b.status === "completed")
              .reduce((sum: number, b: any) => sum + (b.deposit_amount_cents || 0), 0);

            const totalNonCancelled = allBookings.filter((b: any) => b.status !== "cancelled").length;
            const noShowCount = allBookings.filter((b: any) => b.status === "no_show").length;
            const noShowRate = totalNonCancelled > 0 ? (noShowCount / totalNonCancelled) * 100 : 0;

            setStats({
              totalBookingsToday: todayCount,
              totalRevenueCents: revenue,
              noShowRatePct: Number(noShowRate.toFixed(1)),
              avgWaitMin: 12,
            });
          }
        }
      } catch (err) {
        console.error("Owner data loading failed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadOwnerData();
  }, [supabase]);

  const handleSaveService = async (serviceData: Partial<Service>) => {
    if (!business) return;
    setActionError(null);

    try {
      if (editingService) {
        // Update in Supabase
        const { error } = await (supabase.from("services") as any)
          .update({
            name: serviceData.name,
            description: serviceData.description,
            duration_min: serviceData.duration_min,
            price_cents: serviceData.price_cents,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingService.id);

        if (error) throw error;

        setServices((prev) =>
          prev.map((s) => (s.id === editingService.id ? ({ ...s, ...serviceData } as Service) : s))
        );
      } else {
        // Insert in Supabase
        const { data: newSvc, error } = await (supabase.from("services") as any)
          .insert({
            business_id: business.id,
            name: serviceData.name || "New Treatment",
            description: serviceData.description || "",
            duration_min: serviceData.duration_min || 30,
            price_cents: serviceData.price_cents || 5000,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (newSvc) {
          setServices((prev) => [...prev, newSvc]);
        }
      }
      setEditingService(null);
    } catch (err: any) {
      setActionError(err.message || "Failed to save service");
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this service?")) return;
    setActionError(null);

    try {
      const { error } = await (supabase.from("services") as any)
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setActionError(err.message || "Failed to deactivate service");
    }
  };

  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading Owner Business Console...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Owner Access Required</h1>
        <p className="mt-2 text-sm text-slate-500">
          Please sign in with your business owner credentials to access revenue analytics, services, and scheduling.
        </p>
        <Link
          href="/login?next=/owner"
          className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200"
        >
          <span>Sign In as Business Owner</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">No Business Registered</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account is verified, but you do not currently own any registered businesses. Register your clinic or salon to access the owner portal.
        </p>
        <Link
          href="/register-business"
          className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200"
        >
          <span>Register Your Business</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>{business?.name || "Business"} &bull; Owner Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Owner Business Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Realtime revenue analytics, catalogue management, and operating schedules for <span className="font-semibold text-slate-800">{business?.name}</span>.
          </p>
        </div>

        {business?.slug && (
          <Link
            href={`/b/${business.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs sm:text-sm hover:bg-slate-800 transition"
          >
            <span>View Public Booking Page</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {actionError}
        </div>
      )}

      {/* Analytics Metric Cards */}
      <OwnerStatsCards stats={stats} />

      {/* Services Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Services &amp; Pricing</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage treatments, durations, and pricing</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingService(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 text-sm">{svc.name}</h3>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatCents(svc.price_cents, business?.currency)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{svc.description}</p>
                <span className="inline-block mt-3 text-[11px] font-medium text-slate-400">
                  Duration: {svc.duration_min} minutes
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingService(svc);
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteService(svc.id)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Business Hours Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="pb-4 border-b border-slate-100 mb-6">
          <h2 className="font-bold text-slate-900 text-lg">Weekly Business Hours</h2>
          <p className="text-xs text-slate-500 mt-0.5">Controls slot calculation on public booking page</p>
        </div>

        <div className="divide-y divide-slate-100">
          {hours.map((h) => (
            <div key={h.weekday} className="py-3 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 w-32">{weekdayNames[h.weekday]}</span>
              {h.is_closed ? (
                <span className="text-rose-500 font-semibold">Closed</span>
              ) : (
                <span className="text-slate-900 font-medium">{h.opens} - {h.closes}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingService(null);
        }}
        onSave={handleSaveService}
        initialService={editingService || undefined}
      />
    </div>
  );
}
