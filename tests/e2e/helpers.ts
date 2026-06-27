import { type Page, expect } from "@playwright/test";

export function uniqueUser(prefix: string) {
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  return {
    name: `${prefix} ${stamp}`,
    email: `${prefix}_${stamp}@e2e.dev`,
    password: "supersecret123",
  };
}

export async function register(
  page: Page,
  user: { name: string; email: string; password: string },
) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

export async function createDocument(page: Page): Promise<string> {
  await page.getByRole("button", { name: /new document/i }).first().click();
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL("**/doc/**", { timeout: 20_000 });
  await expect(editor(page)).toBeVisible({ timeout: 20_000 });
  return page.url();
}

export function editor(page: Page) {
  return page.locator('[aria-label="Document body"]');
}

export async function typeInEditor(page: Page, text: string) {
  const e = editor(page);
  await e.click();
  await page.keyboard.type(text);
}
