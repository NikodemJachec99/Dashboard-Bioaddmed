import { test, expect } from "@playwright/test";

test("demo login redirects to dashboard shell", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /wejdź do systemu/i }).click();
  await expect(page).toHaveURL(/dashboard/);
});
