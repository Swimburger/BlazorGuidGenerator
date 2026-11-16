// @ts-check
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Refresh GUID's" })).toBeVisible({ timeout: 30000 });
});

test("loads the published application", async ({ page }) => {
  await expect(page).toHaveTitle("Online .NET GUID generator");
  await expect(page.getByRole("heading", { name: "Online .NET GUID generator" })).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
  const value = (await page.locator("#guid-container").innerText()).trim();
  expect(value).toMatch(/^\{[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\}$/i);
});

test("generates and formats multiple GUIDs", async ({ page }) => {
  await page.locator("#amount-of-guids-input").fill("3");
  await page.locator("#uppercase-checkbox").check();
  await page.locator("#braces-checkbox").uncheck();

  const values = (await page.locator("#guid-container").innerText()).trim().split("\n");
  expect(values).toHaveLength(3);
  for (const value of values) {
    expect(value).toMatch(/^[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}$/);
  }
});

test("refresh replaces generated values", async ({ page }) => {
  const before = await page.locator("#guid-container").innerText();
  await page.getByRole("button", { name: "Refresh GUID's" }).click();
  await expect(page.locator("#guid-container")).not.toHaveText(before);
});

test("uses the Clipboard API when it is available", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.copiedWithClipboardApi = text;
        },
      },
    });
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Copy GUID's" })).toBeVisible({ timeout: 30000 });

  let message;
  page.once("dialog", async (dialog) => {
    message = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Copy GUID's" }).click();

  const expected = await page.locator("#guid-container").innerText();
  const copied = await page.evaluate(() => window.copiedWithClipboardApi);
  expect(copied).toBe(expected);
  expect(message).toBe("GUIDs copied");
});

test("falls back to selection copy when the Clipboard API fails", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException("Clipboard access denied", "NotAllowedError");
        },
      },
    });
    document.execCommand = (command) => {
      window.fallbackCopyCommand = command;
      window.fallbackCopiedText = document.getElementById("copy-input")?.value;
      return true;
    };
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Copy GUID's" })).toBeVisible({ timeout: 30000 });

  let message;
  page.once("dialog", async (dialog) => {
    message = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Copy GUID's" }).click();

  const expected = await page.locator("#guid-container").innerText();
  const fallback = await page.evaluate(() => ({
    command: window.fallbackCopyCommand,
    text: window.fallbackCopiedText,
  }));
  expect(fallback).toEqual({ command: "copy", text: expected });
  expect(message).toBe("GUIDs copied");
});

test("writes the generated values to the real Chromium clipboard", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Clipboard permissions are exposed to Playwright in Chromium.");
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(page.url()).origin,
  });

  let message;
  page.once("dialog", async (dialog) => {
    message = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Copy GUID's" }).click();

  const expected = await page.locator("#guid-container").innerText();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(expected);
  expect(message).toBe("GUIDs copied");
});

test("reports when both clipboard methods fail", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException("Clipboard access denied", "NotAllowedError");
        },
      },
    });
    document.execCommand = () => false;
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Copy GUID's" })).toBeVisible({ timeout: 30000 });

  let message;
  page.once("dialog", async (dialog) => {
    message = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Copy GUID's" }).click();

  expect(message).toBe("Unable to copy GUIDs");
});

test("SPA fallback serves the application shell", async ({ page }) => {
  await page.goto("/missing-route");
  await expect(page.getByRole("heading", { name: "Online .NET GUID generator" })).toBeVisible();
});

test("serves Cloudflare-ready cache, security, and WebAssembly headers", async ({ page, request }) => {
  const documentResponse = await request.get("/");
  expect(documentResponse.headers()["cache-control"]).toBe("public, max-age=0, must-revalidate");
  expect(documentResponse.headers()["x-content-type-options"]).toBe("nosniff");
  expect(documentResponse.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");

  const wasmUrl = await page.evaluate(() => {
    const entry = performance.getEntriesByType("resource").find((resource) => resource.name.includes(".wasm"));
    return entry?.name;
  });
  expect(wasmUrl).toBeTruthy();

  const wasmResponse = await request.get(wasmUrl);
  expect(wasmResponse.headers()["content-type"]).toContain("application/wasm");
  expect(wasmResponse.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
});
