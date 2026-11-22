"use client";

import { useState } from "react";
import { OwnerStatsCards } from "@/components/OwnerStatsCards";
import { ServiceModal } from "@/components/ServiceModal";
import { INITIAL_SERVICES, INITIAL_HOURS, Service, BusinessHours } from "@/lib/mock-data";
import { formatCents } from "@/lib/utils";
import { Plus, Edit2, Trash2, Clock, Calendar, Sparkles } from "lucide-react";

export default function OwnerPortalPage() {
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [hours, setHours] = useState<BusinessHours[]>(INITIAL_HOURS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const stats = {
    totalBookingsToday: 14,
    totalRevenueCents: 245000, // $2,450.00
    noShowRatePct: 2.1,
    avgWaitMin: 12,
  };

  const handleSaveService = (serviceData: Partial<Service>) => {
    if (editingService) {
      setServices((prev) =>
        prev.map((s) => (s.id === editingService.id ? ({ ...s, ...serviceData } as Service) : s))
      );
    } else {
      const newService: Service = {
        id: `svc-${Date.now()}`,
        business_id: "11111111-1111-1111-1111-111111111111",
        name: serviceData.name || "New Service",
        description: serviceData.description || "",
        duration_min: serviceData.duration_min || 30,
        price_cents: serviceData.price_cents || 5000,
        is_active: true,
      };
      setServices((prev) => [...prev, newService]);
    }
    setEditingService(null);
  };

  const handleDeleteService = (id: string) => {
    if (confirm("Delete this service?")) {
      setServices((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Owner Business Console
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Analytics overview, service catalogue, and operating schedule management.
        </p>
      </div>

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
                    {formatCents(svc.price_cents)}
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
          {hours.map((h, i) => (
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
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveService}
        initialService={editingService}
      />
    </div>
  );
}
