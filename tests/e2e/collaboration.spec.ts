import { test, expect, type Browser } from "@playwright/test";
import {
  register,
  createDocument,
  editor,
  typeInEditor,
  uniqueUser,
} from "./helpers";

async function freshPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}

test.describe("realtime collaboration", () => {
  test("a shared document converges across two users", async ({ browser }) => {
    const owner = uniqueUser("owner");
    const editorUser = uniqueUser("editor");

    // Register both users in isolated contexts.
    const a = await freshPage(browser);
    const b = await freshPage(browser);
    await register(a.page, owner);
    await register(b.page, editorUser);

    // Owner creates and shares the document.
    const url = await createDocument(a.page);
    await a.page.getByRole("button", { name: "Share" }).click();
    await a.page
      .getByPlaceholder("teammate@example.com")
      .fill(editorUser.email);
    await a.page.getByRole("button", { name: "Add collaborator" }).click();
    await expect(
      a.page.getByText(editorUser.name, { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await a.page.keyboard.press("Escape");

    // Editor opens the same document.
    await b.page.goto(url);
    await expect(editor(b.page)).toBeVisible({ timeout: 20_000 });

    // Owner types — editor should see it appear via realtime sync.
    await typeInEditor(a.page, "Shared realtime text.");
    await expect(editor(b.page)).toContainText("Shared realtime text", {
      timeout: 20_000,
    });

    await a.context.close();
    await b.context.close();
  });

  test("a late-joiner sees content typed before they opened the doc", async ({
    browser,
  }) => {
    const owner = uniqueUser("owner2");
    const editorUser = uniqueUser("editor2");

    const a = await freshPage(browser);
    const b = await freshPage(browser);
    await register(a.page, owner);
    await register(b.page, editorUser);

    // Owner writes FIRST, then shares.
    const url = await createDocument(a.page);
    await typeInEditor(a.page, "Pre-existing content before join.");
    await a.page.waitForTimeout(2000); // let it persist + broadcast

    await a.page.getByRole("button", { name: "Share" }).click();
    await a.page.getByPlaceholder("teammate@example.com").fill(editorUser.email);
    await a.page.getByRole("button", { name: "Add collaborator" }).click();
    await expect(
      a.page.getByText(editorUser.name, { exact: true }),
    ).toBeVisible({ timeout: 20_000 });

    // Editor opens only now — must still see the earlier content.
    await b.page.goto(url);
    await expect(editor(b.page)).toContainText("Pre-existing content", {
      timeout: 20_000,
    });

    await a.context.close();
    await b.context.close();
  });
});
