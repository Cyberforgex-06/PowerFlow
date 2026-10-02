import { expect, test } from "@playwright/test";
import { expectNoHorizontalPageScroll } from "./helpers";

async function loginCustomer(page: import("@playwright/test").Page, project: string) {
  const email = `guard-${project.replace(/[^a-z0-9]/gi, "").toLowerCase()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Guard Customer");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("StrongPass123");
  await page.getByRole("button", { name: /create account/i }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("StrongPass123");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("customer is blocked from staff and admin pages", async ({ page }, testInfo) => {
  await loginCustomer(page, testInfo.project.name);
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/403$/);
  await expect(page.getByText(/permission|access/i).first()).toBeVisible();
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/403$/);
});

test("system pages render without horizontal page scrolling", async ({ page }) => {
  for (const path of ["/403", "/404-does-not-exist", "/429", "/500", "/session-expired"]) {
    await page.goto(path);
    await expectNoHorizontalPageScroll(page);
    await expect(page.locator("main")).toBeVisible();
  }
});
