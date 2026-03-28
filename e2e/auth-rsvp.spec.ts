/**
 * E2E: Magic-link auth → RSVP flow
 *
 * Prerequisites (before running):
 *   - App running at BASE_URL (default: http://localhost:3000)
 *   - DATABASE_URL, NEXTAUTH_URL, EMAIL_SERVER, EMAIL_FROM set in .env
 *   - A mailbox accessible to inspect the magic-link email
 *
 * Run: npm run test:e2e
 */
import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e@example.com";

test.describe("Magic-link auth → RSVP flow", () => {
  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders email input and sign-in button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("submitting the login form shows a confirmation message", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: /email/i }).fill(TEST_EMAIL);
    await page.getByRole("button", { name: /sign in/i }).click();
    // NextAuth email provider shows a "Check your email" page after submission
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10_000 });
  });

  /**
   * Full magic-link flow — requires a real email inbox and manual token extraction.
   * Annotated as skip in CI; run locally with a real test account.
   */
  test.skip("authenticated user can RSVP to an event", async ({ page, context }) => {
    // Step 1: Obtain magic-link token from the email inbox (out-of-band step).
    // Replace with your inbox-scraping approach (e.g., Mailhog, MailSlurp, Ethereal).
    const magicLinkUrl = process.env.E2E_MAGIC_LINK ?? "";
    await page.goto(magicLinkUrl);

    // Step 2: After clicking the link, NextAuth redirects to the dashboard.
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/mossy meetups/i)).toBeVisible();

    // Step 3: Navigate to an event (first event card on the dashboard).
    const eventCard = page.locator("[data-testid='event-card']").first();
    await eventCard.click();
    await expect(page).toHaveURL(/\/events\//);

    // Step 4: Click the "Attending" RSVP button.
    const attendingBtn = page.getByRole("button", { name: /attending/i });
    await attendingBtn.click();

    // Step 5: Confirm the RSVP count has incremented.
    await expect(page.getByTestId("rsvp-count")).toContainText(/1/);

    // Step 6: Change RSVP to "Maybe".
    await page.getByRole("button", { name: /maybe/i }).click();
    await expect(page.getByRole("button", { name: /maybe/i })).toHaveClass(/active/);

    // Cleanup: sign out.
    await context.clearCookies();
  });
});
