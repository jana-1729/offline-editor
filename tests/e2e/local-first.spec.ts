import { test, expect } from "@playwright/test";
import {
  register,
  createDocument,
  editor,
  typeInEditor,
  uniqueUser,
} from "./helpers";

test.describe("local-first editing", () => {
  test("edits persist across reloads", async ({ page }) => {
    await register(page, uniqueUser("persist"));
    await createDocument(page);

    const text = "Hello from a local-first editor.";
    await typeInEditor(page, text);

    // Give IndexedDB + sync a moment, then reload.
    await page.waitForTimeout(1500);
    await page.reload();

    await expect(editor(page)).toContainText("local-first editor", {
      timeout: 20_000,
    });
  });

  test("offline edits survive and sync on reconnect", async ({
    page,
    context,
  }) => {
    await register(page, uniqueUser("offline"));
    await createDocument(page);

    await typeInEditor(page, "Online sentence. ");
    await page.waitForTimeout(800);

    // Go offline — the UI must keep working with no network.
    await context.setOffline(true);
    await expect(page.getByRole("status")).toContainText("Offline", {
      timeout: 20_000,
    });
    await typeInEditor(page, "Offline sentence. ");

    // Back online — changes reconcile.
    await context.setOffline(false);
    await expect(page.getByRole("status")).toContainText(/Online|Syncing/, {
      timeout: 20_000,
    });
    await page.waitForTimeout(1500);

    await page.reload();
    const body = editor(page);
    await expect(body).toContainText("Online sentence", { timeout: 20_000 });
    await expect(body).toContainText("Offline sentence", { timeout: 20_000 });
  });
});
