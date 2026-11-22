import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(cents: number, currency: string = "USD"): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency,
  });
}

export interface SlotAvailability {
  time: string; // "09:00"
  isoString: string; // ISO 8601 string
  isAvailable: boolean;
  reason?: string;
}

/**
 * Calculates available slots for a given date based on:
 * - Business opening/closing hours for that weekday
 * - Service duration (e.g. 45 min)
 * - Existing bookings (pending_payment or confirmed) that overlap
 */
export function calculateAvailableSlots({
  dateStr, // YYYY-MM-DD
  opens, // "09:00"
  closes, // "18:00"
  durationMin, // 45
  existingBookings = [],
  stepMin = 30,
}: {
  dateStr: string;
  opens: string;
  closes: string;
  durationMin: number;
  existingBookings?: Array<{ starts_at: string; ends_at: string; status: string }>;
  stepMin?: number;
}): SlotAvailability[] {
  const [openH, openM] = opens.split(":").map(Number);
  const [closeH, closeM] = closes.split(":").map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const slots: SlotAvailability[] = [];

  for (let current = openMinutes; current + durationMin <= closeMinutes; current += stepMin) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    const timeFormatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    // Slot start & end date objects
    const slotStart = new Date(`${dateStr}T${timeFormatted}:00`);
    const slotEnd = new Date(slotStart.getTime() + durationMin * 60 * 1000);

    // Check overlap with active bookings
    const isConflict = existingBookings.some((booking) => {
      if (booking.status === "cancelled" || booking.status === "no_show") {
        return false;
      }
      const bStart = new Date(booking.starts_at);
      const bEnd = new Date(booking.ends_at);
      // Overlap occurs if slot starts before booking ends AND slot ends after booking starts
      return slotStart < bEnd && slotEnd > bStart;
    });

    slots.push({
      time: timeFormatted,
      isoString: slotStart.toISOString(),
      isAvailable: !isConflict,
      reason: isConflict ? "Slot already reserved" : undefined,
    });
  }

  return slots;
}
