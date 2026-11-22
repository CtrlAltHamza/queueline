import { test, expect } from "@playwright/test";

test.describe("QueueLine Security & Core Business Workflows", () => {
  // Test 1: Double-Booking Exclusion Constraint Test
  test("1. Postgres exclusion constraint prevents double-booking and returns 409 SLOT_CONFLICT", async ({ request }) => {
    // Generate a unique future slot date to guarantee no collision with existing records
    const uniqueDays = 30 + Math.floor(Math.random() * 100);
    const uniqueSlotDate = new Date();
    uniqueSlotDate.setDate(uniqueSlotDate.getDate() + uniqueDays);
    uniqueSlotDate.setHours(11, 0, 0, 0);
    const startsAt = uniqueSlotDate.toISOString();

    const bookingPayload = {
      business_id: "11111111-1111-1111-1111-111111111111",
      service_id: "33333333-1111-1111-1111-111111111111",
      starts_at: startsAt,
      customer_name: "Original Customer",
      customer_email: "original@example.com",
      payment_method: "venue",
    };

    // First booking reservation MUST succeed
    const firstRes = await request.post("/api/bookings", { data: bookingPayload });
    expect(firstRes.status(), "Initial slot booking must return HTTP 200").toBe(200);
    const firstJson = await firstRes.json();
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
});
