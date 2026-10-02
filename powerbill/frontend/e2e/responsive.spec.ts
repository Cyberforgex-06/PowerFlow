import { expect, test } from "@playwright/test";
import { expectNoHorizontalPageScroll } from "./helpers";

for (const path of ["/", "/security", "/login", "/register"]) {
  test(`${path} has no horizontal page scrolling`, async ({ page }) => {
    await page.goto(path);
    await expectNoHorizontalPageScroll(page);
    await expect(page.locator("body")).toBeVisible();
  });
}
