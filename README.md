This Blazor WebAssembly tool generates GUID's using the .NET GUID API. Check it out at [newguids.swimburger.net](https://newguids.swimburger.net/).

The published application is hosted with Cloudflare Workers Static Assets. Build it locally with:

```bash
npm ci
npm run build:cloudflare
```

Production deployment is intentionally separate from CI:

```bash
npm run deploy
```
