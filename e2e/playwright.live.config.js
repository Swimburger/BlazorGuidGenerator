// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  outputDir: "./test-results/live",
  reporter: [["list"], ["html", { outputFolder: "playwright-report/live", open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL || "https://newguids.swimburger.net",
    trace: "retain-on-failure",
  },
});
