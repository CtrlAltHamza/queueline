"use client";

import { useState } from "react";
import { formatCents, SlotAvailability, calculateAvailableSlots } from "@/lib/utils";
import { BusinessHours } from "@/lib/mock-data";
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface SlotPickerProps {
  businessHoursOpens?: string;
  businessHoursCloses?: string;
  weeklyHours?: BusinessHours[];
  currency?: string;
  timezone?: string;
  durationMin: number;
  depositCents: number;
  servicePriceCents: number;
  existingBookings?: Array<{ starts_at: string; ends_at: string; status: string }>;
  onSelectSlot: (slotIsoString: string) => void;
  selectedSlotIso?: string;
}

export function SlotPicker({
  businessHoursOpens = "09:00",
  businessHoursCloses = "18:00",
  weeklyHours,
  currency = "PKR",
  timezone = "Asia/Karachi",
  durationMin,
  depositCents,
  servicePriceCents,
  existingBookings = [],
  onSelectSlot,
  selectedSlotIso,
}: SlotPickerProps) {
  // Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Determine opening and closing hours for the selected date's day of week
  const dateObj = new Date(`${selectedDate}T12:00:00`);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ...

  const dayHours = weeklyHours?.find((h) => h.weekday === dayOfWeek);
  const isClosed = dayHours ? dayHours.is_closed : false;
  const opens = (dayHours?.opens || businessHoursOpens).slice(0, 5);
  const closes = (dayHours?.closes || businessHoursCloses).slice(0, 5);

  const slots = isClosed
    ? []
    : calculateAvailableSlots({
        dateStr: selectedDate,
        opens,
        closes,
        timezone,
        durationMin,
        existingBookings,
        stepMin: 30,
      });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-900 text-lg">Select Date &amp; Time</h3>
        </div>
        <input
          type="date"
          min={todayStr}
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            onSelectSlot(""); // Clear previous selection on date change
          }}
          aria-label="Select appointment date"
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Available Slots ({durationMin} min session)
          </p>
          {!isClosed && (
            <span className="text-xs text-slate-500 font-medium">
              Operating Hours: {opens} - {closes}
            </span>
          )}
        </div>

        {isClosed ? (
          <div className="text-center py-8 text-rose-600 bg-rose-50/50 rounded-xl border border-rose-100 text-sm font-medium">
            This business is closed on this day. Please select another date.
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl">
            No slots available on this date.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {slots.map((slot) => {
              const isSelected = selectedSlotIso === slot.isoString;
              return (
                <button
                  key={slot.isoString}
                  type="button"
                  disabled={!slot.isAvailable}
                  onClick={() => onSelectSlot(slot.isoString)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all ${
                    !slot.isAvailable
                      ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed line-through"
                      : isSelected
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "bg-white border-slate-200 text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Clock className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-slate-400"}`} />
                    <span>{slot.time}</span>
                  </div>
                  {slot.isAvailable && !isSelected && (
                    <span className="text-[11px] text-emerald-600 font-normal mt-0.5">Available</span>
                  )}
                  {isSelected && (
                    <span className="text-[11px] text-indigo-100 font-normal mt-0.5">Selected</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedSlotIso && (
        <div className="mt-6 pt-5 border-t border-slate-100 bg-indigo-50/50 -mx-6 -mb-6 p-6 rounded-b-2xl">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Service Fee:</span>
            <span className="font-bold text-slate-900 text-base">{formatCents(servicePriceCents, currency)}</span>
          </div>
          {depositCents > 0 && (
            <div className="flex items-center justify-between text-xs text-indigo-700 mt-1 font-semibold">
              <span>Required Online Deposit:</span>
              <span>{formatCents(depositCents, currency)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
