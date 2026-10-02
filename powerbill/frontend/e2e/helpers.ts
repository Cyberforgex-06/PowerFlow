import { expect, type Page } from "@playwright/test";

export async function expectNoHorizontalPageScroll(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth, `page scrollWidth ${dimensions.scrollWidth} should not exceed clientWidth ${dimensions.clientWidth}`).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

export async function csrf(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/csrf", { credentials: "same-origin", cache: "no-store" });
    const body = await response.json();
    return body.csrf_token as string;
  });
}
