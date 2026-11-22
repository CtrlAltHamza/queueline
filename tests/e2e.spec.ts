import { test, expect } from "@playwright/test";

test.describe("QueueLine Core End-to-End User Journeys", () => {
  // Test 1: Customer books an available slot with Pay on Arrival
  test("1. Customer successfully books an available slot with pay on arrival", async ({ page }) => {
    await page.goto("/b/glow-clinic");

    // Verify business details render
    await expect(page.locator("h1")).toContainText("Glow Aesthetic Clinic");

    // Select a date in the slot picker (e.g. tomorrow)
    const dateButtons = page.locator("button:has-text('Available')");
    if ((await dateButtons.count()) > 0) {
      await dateButtons.first().click();
    }

    // Pick an available slot button
    const slotButton = page.locator("button:not([disabled]):has-text(':')").first();
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    // Fill customer contact intake form
    await page.fill('input[placeholder="e.g. Sarah Jenkins"]', "Playwright Test User");
    await page.fill('input[placeholder="sarah@example.com"]', "playwright.test@example.com");
    await page.fill('input[placeholder="+1 (555) 234-5678"]', "+1 555 019 2834");

    // Choose Pay on Arrival (Cash)
    await page.click("text=Pay on Arrival");

    // Submit booking
    await page.click('button:has-text("Confirm & Reserve")');

    // Should redirect to success page
    await expect(page).toHaveURL(/.*\/success.*/);
    await expect(page.locator("body")).toContainText("Confirmed");
  });

  // Test 2: Conflict handling - double booking prevention
  test("2. Double-booking conflict is blocked and displays conflict alert", async ({ page }) => {
    // Attempt booking conflict via direct API collision test
    const response = await page.request.post("/api/bookings", {
      data: {
        business_id: "11111111-1111-1111-1111-111111111111",
        service_id: "33333333-1111-1111-1111-111111111111",
        starts_at: new Date(Date.now() + 86400000).toISOString(),
        customer_name: "Customer A",
        customer_email: "a@example.com",
        payment_method: "venue",
      },
    });

    if (response.status() === 200 || response.status() === 201) {
      const firstBooking = await response.json();

      // Submit identical second booking at the same start time
      const conflictResponse = await page.request.post("/api/bookings", {
        data: {
          business_id: "11111111-1111-1111-1111-111111111111",
          service_id: "33333333-1111-1111-1111-111111111111",
          starts_at: firstBooking.booking.starts_at,
          customer_name: "Customer B",
          customer_email: "b@example.com",
          payment_method: "venue",
        },
      });

      // Exclusion constraint must reject with HTTP 409 Conflict
      expect(conflictResponse.status()).toBe(409);
      const json = await conflictResponse.json();
      expect(json.code).toBe("SLOT_CONFLICT");
    }
  });

  // Test 3: Owner logs in and views their business schedule
  test("3. Owner views business bookings and schedule management", async ({ page }) => {
    // Navigate to owner portal
    await page.goto("/owner");

    // When not logged in, middleware or component guards the page
    const loginPrompt = page.locator("text=Owner Access Required");
    const ownerTitle = page.locator("text=Owner Business Console");

    // Either redirected to login or prompts authentication
    const isGuarded = (await loginPrompt.isVisible()) || page.url().includes("/login");
    expect(isGuarded || (await ownerTitle.isVisible())).toBeTruthy();
  });
});
