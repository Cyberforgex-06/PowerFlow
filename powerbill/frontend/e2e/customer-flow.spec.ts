import { expect, request as playwrightRequest, test } from "@playwright/test";
import { expectNoHorizontalPageScroll } from "./helpers";

test("register → login → assign meter → submit reading → pay → receipt", async ({ page }, testInfo) => {
  const suffix = testInfo.project.name.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const email = `customer-${suffix}@example.com`;
  const password = "StrongPass123";

  await page.goto("/register");
  await expectNoHorizontalPageScroll(page);
  await page.getByLabel("Full name").fill(`Responsive ${suffix}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await expect(page.getByText(/PASS · At least 10 characters/)).toBeVisible();
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/login\?registered=1/);

  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectNoHorizontalPageScroll(page);

  const me = await page.evaluate(async () => (await fetch("/api/v1/auth/me")).json());
  const tariffs = await page.evaluate(async () => (await fetch("/api/v1/public/tariffs")).json());
  expect(tariffs.items.length).toBeGreaterThan(0);

  const staff = await playwrightRequest.newContext({ baseURL: "http://127.0.0.1:3000" });
  const csrfResponse = await staff.get("/api/v1/auth/csrf");
  const staffCsrf = (await csrfResponse.json()).csrf_token as string;
  const staffLogin = await staff.post("/api/v1/auth/login", {
    headers: { Origin: "http://127.0.0.1:3000", "X-CSRF-Token": staffCsrf },
    data: { email: "officer@example.com", password },
  });
  expect(staffLogin.ok()).toBeTruthy();
  const staffLoginBody = await staffLogin.json();
  const staffMutationCsrf = staffLoginBody.csrf_token as string;
  const meterNumber = `E2E-${suffix.toUpperCase()}-001`;
  const assigned = await staff.post("/api/v1/staff/meters", {
    headers: { Origin: "http://127.0.0.1:3000", "X-CSRF-Token": staffMutationCsrf },
    data: { customer_id: me.user.id, tariff_id: tariffs.items[0].id, meter_number: meterNumber, opening_reading: "1000.000" },
  });
  expect(assigned.status()).toBe(201);
  await staff.dispose();

  await page.goto("/submit-reading");
  await expectNoHorizontalPageScroll(page);
  await page.getByLabel("Meter").selectOption({ label: meterNumber });
  await page.getByLabel("Current reading (kWh)").fill("1184.000");
  await page.getByRole("button", { name: /submit reading/i }).click();
  await expect(page).toHaveURL(/\/bills\/[0-9a-f-]+$/);
  await expect(page.getByText(/Total due/)).toBeVisible();
  await page.getByRole("button", { name: /pay this bill/i }).click();
  await expect(page).toHaveURL(/\/receipts\/[0-9a-f-]+$/);
  await expect(page.getByText("PAID", { exact: true })).toBeVisible();
  await expect(page.getByText(/PB-[A-Z0-9]{12}/)).toBeVisible();
  await expectNoHorizontalPageScroll(page);
});
