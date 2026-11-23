// @ts-check
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Refresh GUIDs" })).toBeVisible({ timeout: 30000 });
});

test("loads the published application", async ({ page }) => {
  await expect(page).toHaveTitle("Online .NET GUID generator");
  await expect(page.getByRole("heading", { name: "Online .NET GUID generator" })).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
  const value = (await page.locator("#guid-container").innerText()).trim();
  expect(value).toMatch(/^\{[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\}$/i);
});

test("supports zoom, dark mode, and a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.reload();
  await expect(page.getByRole("button", { name: "Refresh GUIDs" })).toBeVisible({ timeout: 30000 });

  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).not.toContain("user-scalable=no");
  expect(viewport).not.toContain("maximum-scale");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light dark");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe("rgb(255, 255, 255)");
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
  await page.getByRole("button", { name: "Refresh GUIDs" }).click();
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
  await expect(page.getByRole("button", { name: "Copy GUIDs" })).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Copy GUIDs" }).click();

  const expected = await page.locator("#guid-container").innerText();
  const copied = await page.evaluate(() => window.copiedWithClipboardApi);
  expect(copied).toBe(expected);
  await expect(page.getByRole("status")).toHaveText("GUIDs copied");
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
  await expect(page.getByRole("button", { name: "Copy GUIDs" })).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Copy GUIDs" }).click();

  const expected = await page.locator("#guid-container").innerText();
  const fallback = await page.evaluate(() => ({
    command: window.fallbackCopyCommand,
    text: window.fallbackCopiedText,
  }));
  expect(fallback).toEqual({ command: "copy", text: expected });
  await expect(page.getByRole("status")).toHaveText("GUIDs copied");
});

test("writes the generated values to the real Chromium clipboard", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Clipboard permissions are exposed to Playwright in Chromium.");
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(page.url()).origin,
  });

  await page.getByRole("button", { name: "Copy GUIDs" }).click();

  const expected = await page.locator("#guid-container").innerText();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(expected);
  await expect(page.getByRole("status")).toHaveText("GUIDs copied");
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
  const copyButton = page.getByRole("button", { name: "Copy GUIDs" });
  await expect(copyButton).toBeVisible({ timeout: 30000 });
  await copyButton.click();

  await expect(page.getByRole("status")).toHaveText("Copy failed");
  await expect(copyButton).toBeEnabled();
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
