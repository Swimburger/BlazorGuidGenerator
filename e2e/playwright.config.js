// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  reporter: process.env.CI
    ? [["failures"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:5002",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node serve-published.js",
    url: "http://localhost:5002",
    timeout: 10000,
    reuseExistingServer: false,
  },
});
