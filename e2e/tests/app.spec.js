// @ts-check
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Refresh GUID's" })).toBeVisible({ timeout: 30000 });
});

test("loads the published application", async ({ page }) => {
  await expect(page).toHaveTitle("Online .NET GUID generator");
  await expect(page.getByRole("heading", { name: "Online .NET GUID generator" })).toBeVisible();
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
