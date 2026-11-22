import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(cents: number, currency: string = "USD"): string {
  const curr = (currency || "USD").toUpperCase();
  if (curr === "PKR") {
    return `Rs. ${(cents / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
  }
  try {
    return (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: curr,
    });
  } catch {
    return `${curr} ${(cents / 100).toFixed(2)}`;
  }
}

export interface SlotAvailability {
  time: string; // "09:00"
  isoString: string; // ISO 8601 string
  isAvailable: boolean;
  reason?: string;
}

/**
 * Extracts the local weekday (0=Sun..6=Sat) and 24-hr time ("HH:mm")
 * in the business's specific IANA timezone (e.g. "Asia/Karachi", "America/New_York").
 */
export function getBusinessTimeDetails(date: Date, timeZone: string = "UTC") {
  const safeTimezone = timeZone || "UTC";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const weekday = weekdayMap[partMap.weekday] ?? date.getUTCDay();
  const hour = partMap.hour === "24" ? "00" : (partMap.hour || "00");
  const timeStr = `${hour.padStart(2, "0")}:${(partMap.minute || "00").padStart(2, "0")}`;

  return { weekday, timeStr };
}

/**
 * Parses a target date ("YYYY-MM-DD") and time ("HH:mm") within a business's local timezone
 * and returns the exact corresponding UTC Date instant.
 */
export function parseInBusinessTimezone(dateStr: string, timeStr: string, timeZone: string = "UTC"): Date {
  const safeTimezone = timeZone || "UTC";
  // Initial UTC assumption
  const guess = new Date(`${dateStr}T${timeStr}:00Z`);

  // Format the guess in the business's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(guess);
  const m: Record<string, string> = {};
  parts.forEach((p) => (m[p.type] = p.value));

  const tzHour = m.hour === "24" ? "00" : (m.hour || "00");
  const formattedInTz = `${m.year}-${m.month}-${m.day}T${tzHour}:${m.minute}:${m.second}Z`;
  const diff = new Date(formattedInTz).getTime() - guess.getTime();

  return new Date(guess.getTime() - diff);
}

/**
 * Calculates available slots for a given date in the business's local operating hours and timezone
 */
export function calculateAvailableSlots({
  dateStr, // YYYY-MM-DD
  opens, // "09:00"
  closes, // "18:00"
  timezone = "Asia/Karachi",
  durationMin, // 45
  existingBookings = [],
  stepMin = 30,
}: {
  dateStr: string;
  opens: string;
  closes: string;
  timezone?: string;
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

    // Slot start & end date objects computed in the business's real timezone
    const slotStart = parseInBusinessTimezone(dateStr, timeFormatted, timezone);
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
