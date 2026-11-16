import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "blazor-guid-generator",
    compatibilityDate: "2026-11-15",
    domains: ["newguids.swimburger.net"],
    assets: {
      notFoundHandling: "single-page-application",
    },
    observability: {
      enabled: true,
      redactQueryString: true,
      logs: {
        enabled: true,
        headSamplingRate: 1,
      },
      traces: {
        enabled: true,
        headSamplingRate: 0.01,
      },
    },
  },
});
