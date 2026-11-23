import { test, expect } from "@playwright/test";
import { parseInBusinessTimezone } from "../lib/utils";

/**
 * Helper to compute an ISO timestamp for next Wednesday at 14:00
 * in the business's local timezone (e.g. "America/New_York"), guaranteeing it is open.
 */
function getNextWednesdayIso(timeStr: string = "14:00", timeZone: string = "America/New_York"): string {
  const now = new Date();
  const currentDay = now.getUTCDay();
  let daysUntilWed = (3 - currentDay + 7) % 7;
  if (daysUntilWed === 0) daysUntilWed = 7;

  const targetDate = new Date(now.getTime() + daysUntilWed * 86400000);
  const yyyy = targetDate.getUTCFullYear();
  const mm = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(targetDate.getUTCDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  return parseInBusinessTimezone(dateStr, timeStr, timeZone).toISOString();
}

test.describe("QueueLine Security & Core Business Workflows", () => {
  // Test 1: Double-Booking Exclusion Constraint Test on an open business day
  test("1. Postgres exclusion constraint prevents double-booking and returns 409 SLOT_CONFLICT", async ({ request }) => {
    // Pick Wednesday 14:00 in America/New_York (Glow Clinic is open Mon-Sat 09:00-18:00)
    const startsAt = getNextWednesdayIso("14:00", "America/New_York");

    const bookingPayload = {
      business_id: "11111111-1111-1111-1111-111111111111",
      service_id: "33333333-1111-1111-1111-111111111111",
      starts_at: startsAt,
      customer_name: "Original Customer",
      customer_email: "original@example.com",
      payment_method: "venue",
    };

    // First booking reservation MUST succeed with 200
    const firstRes = await request.post("/api/bookings", { data: bookingPayload });
    const firstText = await firstRes.text();
    expect(firstRes.status(), `Initial slot booking must return HTTP 200: ${firstText}`).toBe(200);
    const firstJson = JSON.parse(firstText);
    expect(firstJson.success).toBe(true);

    // Second booking on identical slot interval MUST be rejected by database exclusion constraint
    const conflictRes = await request.post("/api/bookings", {
      data: {
        ...bookingPayload,
        customer_name: "Colliding Customer",
        customer_email: "colliding@example.com",
      },
    });

    expect(conflictRes.status(), "Double-booking attempt must be rejected with HTTP 409 Conflict").toBe(409);
    const conflictJson = await conflictRes.json();
    expect(conflictJson.code).toBe("SLOT_CONFLICT");
    expect(conflictJson.error).toContain("That time slot was just taken");
  });

  // Test 2: Unauthenticated Middleware Route Guards
  test("2. Protected portal routes redirect unauthenticated visitors to login", async ({ page }) => {
    // Attempt visiting Owner portal
    await page.goto("/owner");
    await expect(page).toHaveURL(/\/login\?next=%2Fowner/);

    // Attempt visiting Staff operational portal
    await page.goto("/staff");
    await expect(page).toHaveURL(/\/login\?next=%2Fstaff/);

    // Attempt visiting Customer bookings portal
    await page.goto("/customer/bookings");
    await expect(page).toHaveURL(/\/login\?next=%2Fcustomer%2Fbookings/);
  });

  // Test 3: Unauthorized Mutation Rejection on Booking Cancellation
  test("3. POST /api/bookings/cancel rejects unauthenticated requests with HTTP 401", async ({ request }) => {
    const res = await request.post("/api/bookings/cancel", {
      data: {
        booking_id: "11111111-2222-3333-4444-555555555555",
      },
    });

    expect(res.status()).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Authentication required");
  });

  // Test 4: Unauthorized Mutation Rejection on Queue Advancements
  test("4. POST /api/queue/call-next rejects unauthenticated requests with HTTP 401", async ({ request }) => {
    const res = await request.post("/api/queue/call-next", {
      data: {
        business_id: "11111111-1111-1111-1111-111111111111",
      },
    });

    expect(res.status()).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Authentication required");
  });

  // Test 5: Safe Slot Interval Discovery (Zero PII Leakage)
  test("5. GET /api/bookings securely returns busy intervals without leaking customer PII", async ({ request }) => {
    const res = await request.get("/api/bookings?business_id=11111111-1111-1111-1111-111111111111");
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.bookings)).toBe(true);

    if (json.bookings.length > 0) {
      const sample = json.bookings[0];
      // Must contain slot boundaries
      expect(sample).toHaveProperty("starts_at");
      expect(sample).toHaveProperty("ends_at");
      // Must NOT leak customer private information
      expect(sample).not.toHaveProperty("customer_name");
      expect(sample).not.toHaveProperty("customer_email");
      expect(sample).not.toHaveProperty("customer_phone");
      expect(sample).not.toHaveProperty("notes");
    }
  });

  // Test 6: Slot at exact opening time (09:00) is accepted
  test("6. Slot at exact opening time (09:00) is accepted without being rejected as outside business hours", async ({ request }) => {
    // 09:00 America/New_York is Glow Clinic's exact opening time on Wednesday
    const startsAt = getNextWednesdayIso("09:00", "America/New_York");

    const res = await request.post("/api/bookings", {
      data: {
        business_id: "11111111-1111-1111-1111-111111111111",
        service_id: "33333333-1111-1111-1111-111111111113", // 30 min service (09:00 - 09:30)
        starts_at: startsAt,
        customer_name: "Morning Opening Customer",
        customer_email: "opening@example.com",
        payment_method: "venue",
      },
    });

    const resText = await res.text();
    expect(res.status(), `Booking at exact opening time must return HTTP 200: ${resText}`).toBe(200);
    const json = JSON.parse(resText);
    expect(json.success).toBe(true);
  });
});
