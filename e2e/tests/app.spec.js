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
  await expect(page.getByRole("radio", { name: "B Braces" })).toBeChecked();
  await expect(page.getByRole("radio")).toHaveCount(5);
  await expect(page.getByRole("status")).toBeEmpty();

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://newguids.swimburger.net/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://newguids.swimburger.net/SocialImage.png");
  await expect(page.locator('link[href*="cdn.jsdelivr.net"], script[src*="cdn.jsdelivr.net"]')).toHaveCount(0);
  await expect(page.locator('img[src^="https://swimburger.net/content"], link[href^="https://swimburger.net/content"]')).toHaveCount(0);
});

test("supports zoom, dark mode, and a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.reload();
  await expect(page.getByRole("button", { name: "Refresh GUIDs" })).toBeVisible({ timeout: 30000 });

  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).not.toContain("user-scalable=no");
  expect(viewport).not.toContain("maximum-scale");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light dark");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe("rgb(255, 255, 255)");

  for (const option of await page.locator(".guid-format-options .form-check-label").all()) {
    expect((await option.boundingBox()).height).toBeGreaterThan(47.9);
  }
  for (const button of await page.locator(".guid-actions .btn").all()) {
    expect((await button.boundingBox()).height).toBeGreaterThan(47.9);
  }
  for (const control of await page.locator(".quantity-stepper button, .quantity-stepper input").all()) {
    expect((await control.boundingBox()).height).toBeGreaterThan(47.9);
  }
});

test("applies a complete dark theme without a light loading flash", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  expect(html.indexOf('meta name="color-scheme"')).toBeLessThan(html.indexOf("bootstrap.min.css"));
  expect(html.indexOf('meta name="color-scheme"')).toBeLessThan(html.indexOf("css/app.css"));

  await page.route("**/_framework/**", (route) => route.abort());
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.locator(".loading-shell")).toBeVisible();

  const shellTheme = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const loading = getComputedStyle(document.querySelector(".loading-shell"));
    return {
      colorScheme: root.colorScheme,
      bodyBackground: body.backgroundColor,
      bodyColor: body.color,
      loadingColor: loading.color,
    };
  });
  expect(shellTheme.colorScheme).toBe("light dark");
  expect(shellTheme.bodyBackground).not.toBe("rgb(255, 255, 255)");
  expect(shellTheme.loadingColor).toBe(shellTheme.bodyColor);
});

test("themes custom, native, disabled, output, and footer surfaces in dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.getByRole("button", { name: "Refresh GUIDs" })).toBeVisible({ timeout: 30000 });

  const darkTheme = await page.evaluate(() => {
    const styles = (selector) => getComputedStyle(document.querySelector(selector));
    const body = styles("body");
    const stepper = styles(".quantity-stepper-button:not(:disabled)");
    const input = styles("#amount-of-guids-input");
    const radio = styles("#format-b");
    const output = styles("#guid-container");
    const footer = styles("footer");
    const code = styles(".format-hint code");
    return {
      bodyBackground: body.backgroundColor,
      bodyColor: body.color,
      stepperBackground: stepper.backgroundColor,
      stepperColor: stepper.color,
      stepperBorder: stepper.borderTopColor,
      inputBackground: input.backgroundColor,
      inputColor: input.color,
      radioAccent: radio.accentColor,
      outputBackground: output.backgroundColor,
      outputColor: output.color,
      outputScheme: output.colorScheme,
      footerBackground: footer.backgroundColor,
      footerColor: footer.color,
      codeColor: code.color,
    };
  });

  expect(darkTheme.bodyBackground).not.toBe("rgb(255, 255, 255)");
  expect(darkTheme.stepperBackground).toBe(darkTheme.bodyBackground);
  expect(darkTheme.inputBackground).toBe(darkTheme.bodyBackground);
  expect(darkTheme.stepperColor).toBe(darkTheme.bodyColor);
  expect(darkTheme.inputColor).toBe(darkTheme.bodyColor);
  expect(darkTheme.stepperBorder).not.toBe(darkTheme.bodyBackground);
  expect(darkTheme.radioAccent).not.toBe("auto");
  expect(darkTheme.outputBackground).not.toBe(darkTheme.bodyBackground);
  expect(darkTheme.outputColor).not.toBe(darkTheme.outputBackground);
  expect(darkTheme.outputScheme).toBe("dark");
  expect(darkTheme.footerBackground).not.toBe(darkTheme.bodyBackground);
  expect(darkTheme.footerColor).toBe(darkTheme.bodyColor);
  expect(darkTheme.codeColor).not.toBe(darkTheme.bodyBackground);

  await page.getByRole("button", { name: "Decrease quantity" }).click();
  const decrease = page.getByRole("button", { name: "Decrease quantity" });
  await expect(decrease).toBeDisabled();
  const disabledColor = await decrease.evaluate((element) => getComputedStyle(element).color);
  expect(disabledColor).not.toBe(darkTheme.stepperColor);

  const increase = page.getByRole("button", { name: "Increase quantity" });
  await page.keyboard.press("Tab");
  await increase.focus();
  await expect(increase).toBeFocused();
  const focus = await increase.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
  });
  expect(focus.style).not.toBe("none");
  expect(focus.width).toBe("3px");
  expect(focus.color).not.toBe(darkTheme.bodyBackground);
});

test("keeps stepper borders and focus visible in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.reload();
  await expect(page.getByRole("button", { name: "Refresh GUIDs" })).toBeVisible({ timeout: 30000 });

  await page.getByRole("button", { name: "Decrease quantity" }).click();
  const decrease = page.getByRole("button", { name: "Decrease quantity" });
  await expect(decrease).toBeDisabled();

  const increase = page.getByRole("button", { name: "Increase quantity" });
  await page.keyboard.press("Tab");
  await increase.focus();
  await expect(increase).toBeFocused();
  const forcedStyles = await page.evaluate(() => {
    const disabled = getComputedStyle(document.querySelector('[aria-label="Decrease quantity"]'));
    const focused = getComputedStyle(document.querySelector('[aria-label="Increase quantity"]'));
    const input = getComputedStyle(document.querySelector("#amount-of-guids-input"));
    const output = getComputedStyle(document.querySelector("#guid-container"));
    return {
      disabledBorder: disabled.borderTopColor,
      disabledColor: disabled.color,
      focusStyle: focused.outlineStyle,
      focusWidth: focused.outlineWidth,
      inputBorderStyle: input.borderTopStyle,
      inputBorderWidth: input.borderTopWidth,
      outputBorderStyle: output.borderTopStyle,
    };
  });
  expect(forcedStyles.disabledBorder).toBe(forcedStyles.disabledColor);
  expect(forcedStyles.focusStyle).not.toBe("none");
  expect(forcedStyles.focusWidth).toBe("3px");
  expect(forcedStyles.inputBorderStyle).toBe("solid");
  expect(forcedStyles.inputBorderWidth).toBe("1px");
  expect(forcedStyles.outputBorderStyle).toBe("solid");
});

test("keeps controls and output balanced on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await expect(page.getByRole("button", { name: "Refresh GUIDs" })).toBeVisible({ timeout: 30000 });

  const container = await page.locator("main .container").boundingBox();
  const controls = await page.locator(".generator-controls").boundingBox();
  const output = await page.locator("#guid-container").boundingBox();
  const quantity = await page.locator("#amount-of-guids-input").boundingBox();
  const uppercaseCheckbox = await page.locator("#uppercase-checkbox").boundingBox();
  const uppercaseLabel = await page.locator('label[for="uppercase-checkbox"]').boundingBox();

  expect(container.width).toBeLessThanOrEqual(832);
  expect(Math.abs(controls.x - output.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(controls.width - output.width)).toBeLessThanOrEqual(1);
  expect(quantity.width).toBeLessThanOrEqual(64);
  expect(uppercaseLabel.x - (uppercaseCheckbox.x + uppercaseCheckbox.width)).toBeGreaterThanOrEqual(7.9);
  for (const button of await page.locator(".guid-actions .btn").all()) {
    expect((await button.boundingBox()).height).toBeLessThanOrEqual(44);
  }
  expect(output.height).toBeGreaterThanOrEqual(224);
  expect(output.height).toBeLessThanOrEqual(448);
});

test("footer stays on one desktop line and wraps without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await expect(page.getByRole("contentinfo")).toBeVisible();

  const desktopFooter = await page.locator("footer .container").boundingBox();
  expect(desktopFooter.height).toBeLessThanOrEqual(25);

  const desktopLinkTops = await page.locator("footer a").evaluateAll((links) =>
    links.map((link) => Math.round(link.getBoundingClientRect().top)),
  );
  expect(new Set(desktopLinkTops).size).toBe(1);

  for (const width of [900, 768, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }

  const mobileFooter = await page.locator("footer .container").boundingBox();
  expect(mobileFooter.height).toBeGreaterThan(40);
});

test("quantity stepper supports buttons, bounds, and keyboard entry", async ({ page }) => {
  const quantity = page.locator("#amount-of-guids-input");
  const decrease = page.getByRole("button", { name: "Decrease quantity" });
  const increase = page.getByRole("button", { name: "Increase quantity" });
  const status = page.getByRole("status");

  await expect(quantity).toHaveValue("1");
  await expect(quantity).toHaveAttribute("min", "0");

  const borderGeometry = await page.evaluate(() => {
    const group = getComputedStyle(document.querySelector(".quantity-stepper"));
    const decrease = getComputedStyle(document.querySelector('[aria-label="Decrease quantity"]'));
    const input = getComputedStyle(document.querySelector("#amount-of-guids-input"));
    const increase = getComputedStyle(document.querySelector('[aria-label="Increase quantity"]'));
    return {
      groupBorder: group.borderTopWidth,
      decreaseOuterRadius: decrease.borderTopLeftRadius,
      decreaseInnerRadius: decrease.borderTopRightRadius,
      inputInlineBorders: [input.borderLeftWidth, input.borderRightWidth],
      increaseInnerRadius: increase.borderTopLeftRadius,
      increaseOuterRadius: increase.borderTopRightRadius,
    };
  });
  expect(borderGeometry.groupBorder).toBe("0px");
  expect(borderGeometry.decreaseOuterRadius).not.toBe("0px");
  expect(borderGeometry.decreaseInnerRadius).toBe("0px");
  expect(borderGeometry.inputInlineBorders).toEqual(["0px", "0px"]);
  expect(borderGeometry.increaseInnerRadius).toBe("0px");
  expect(borderGeometry.increaseOuterRadius).not.toBe("0px");

  await decrease.click();
  await expect(quantity).toHaveValue("0");
  await expect(decrease).toBeDisabled();
  await expect(status).toHaveText("No GUIDs generated.");
  expect((await page.locator("#guid-container").innerText()).trim()).toBe("");

  await increase.click();
  await expect(quantity).toHaveValue("1");
  await expect(status).toHaveText("Generated 1 GUID.");

  await quantity.fill("3");
  await quantity.press("Tab");
  await expect(quantity).toHaveValue("3");
  await expect(status).toHaveText("Generated 3 GUIDs.");
  expect((await page.locator("#guid-container").innerText()).trim().split("\n")).toHaveLength(3);

  await quantity.focus();
  await quantity.press("ArrowUp");
  await quantity.press("Tab");
  await expect(quantity).toHaveValue("4");
  expect((await page.locator("#guid-container").innerText()).trim().split("\n")).toHaveLength(4);

  await quantity.fill("-1");
  await quantity.press("Tab");
  await expect(quantity).toHaveValue("0");
  await expect(decrease).toBeDisabled();
});

test("generates and formats multiple GUIDs with every .NET format", async ({ page }) => {
  const amountInput = page.locator("#amount-of-guids-input");
  const status = page.getByRole("status");

  await amountInput.fill("3");
  await amountInput.press("Tab");
  await expect(status).toHaveText("Generated 3 GUIDs.");
  await page.locator("#uppercase-checkbox").check();
  await expect(status).toHaveText("GUIDs changed to uppercase.");

  const formats = [
    ["D Hyphens", "D", /^[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}$/],
    ["N No separators", "N", /^[0-9A-F]{32}$/],
    ["B Braces", "B", /^\{[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}\}$/],
    ["P Parentheses", "P", /^\([0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}\)$/],
    [
      "X Hexadecimal components",
      "X",
      /^\{0X[0-9A-F]{8},0X[0-9A-F]{4},0X[0-9A-F]{4},\{0X[0-9A-F]{2}(?:,0X[0-9A-F]{2}){7}\}\}$/,
    ],
  ];

  for (const [accessibleName, format, pattern] of formats) {
    await page.getByRole("radio", { name: accessibleName }).check();
    await expect(status).toHaveText(`GUID format changed to ${format}.`);

    const values = (await page.locator("#guid-container").innerText()).trim().split("\n");
    expect(values).toHaveLength(3);
    for (const value of values) {
      expect(value).toMatch(pattern);
    }
  }
});

test("refresh replaces generated values", async ({ page }) => {
  const before = await page.locator("#guid-container").innerText();
  await page.getByRole("button", { name: "Refresh GUIDs" }).click();
  await expect(page.locator("#guid-container")).not.toHaveText(before);
  await expect(page.getByRole("status")).toHaveText("Generated 1 GUID.");
});

test("exposes and dismisses an accessible runtime error", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("blazor-error-ui").style.display = "block";
  });

  const error = page.getByRole("alert");
  await expect(error).toContainText("The GUID generator stopped unexpectedly.");
  await error.getByRole("button", { name: "Dismiss error message" }).click();
  await expect(error).toBeHidden();
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

test("serves a useful static loading and error shell", async ({ request }) => {
  const response = await request.get("/");
  const html = await response.text();

  expect(html).toContain("Preparing the GUID generator…");
  expect(html).toContain("This GUID generator requires JavaScript and WebAssembly.");
  expect(html).toContain('role="alert"');
  expect(html).toContain('aria-label="Dismiss error message"');
  expect(html).not.toContain('onclick="copyGuids');
});

test("serves Cloudflare-ready cache, security, and WebAssembly headers", async ({ page, request }) => {
  const documentResponse = await request.get("/");
  expect(documentResponse.headers()["cache-control"]).toBe("public, max-age=0, must-revalidate");
  expect(documentResponse.headers()["x-content-type-options"]).toBe("nosniff");
  expect(documentResponse.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(documentResponse.headers()["content-security-policy"]).toBe("base-uri 'self'; object-src 'none'; frame-ancestors 'none'");
  expect(documentResponse.headers()["permissions-policy"]).toContain("camera=()");
  expect(documentResponse.headers()["x-frame-options"]).toBe("DENY");

  const robotsResponse = await request.get("/robots.txt");
  expect(robotsResponse.status()).toBe(200);
  expect(robotsResponse.headers()["content-type"]).toContain("text/plain");
  expect(await robotsResponse.text()).toBe("User-agent: *\nAllow: /\n");

  const socialImageResponse = await request.get("/SocialImage.png");
  expect(socialImageResponse.status()).toBe(200);
  expect(socialImageResponse.headers()["content-type"]).toContain("image/png");

  const wasmUrl = await page.evaluate(() => {
    const entry = performance.getEntriesByType("resource").find((resource) => resource.name.includes(".wasm"));
    return entry?.name;
  });
  expect(wasmUrl).toBeTruthy();

  const wasmResponse = await request.get(wasmUrl);
  expect(wasmResponse.headers()["content-type"]).toContain("application/wasm");
  expect(wasmResponse.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
});
