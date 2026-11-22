"use client";

import { Calendar, DollarSign, UserX, Clock } from "lucide-react";
import { formatCents } from "@/lib/utils";

interface OwnerStatsCardsProps {
  stats: {
    totalBookingsToday: number;
    totalRevenueCents: number;
    noShowRatePct: number;
    avgWaitMin: number;
  };
}

export function OwnerStatsCards({ stats }: OwnerStatsCardsProps) {
  const cards = [
    {
      title: "Today's Bookings",
      value: stats.totalBookingsToday,
      sub: "+12% vs last week",
      icon: Calendar,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      title: "Total Revenue (Est.)",
      value: formatCents(stats.totalRevenueCents),
      sub: "Deposits + services completed",
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "No-Show Rate",
      value: `${stats.noShowRatePct}%`,
      sub: "Down 4% with mandatory deposits",
      icon: UserX,
      color: "text-amber-600 bg-amber-50",
    },
    {
      title: "Avg Queue Wait Time",
      value: `${stats.avgWaitMin} min`,
      sub: "Realtime walk-in metric",
      icon: Clock,
      color: "text-blue-600 bg-blue-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">
              {card.value}
            </div>
            <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
