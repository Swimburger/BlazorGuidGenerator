This Blazor WebAssembly tool generates GUID's using the .NET GUID API. Check it out at [newguids.swimburger.net](https://newguids.swimburger.net/).

The published application is hosted with Cloudflare Workers Static Assets. Build it locally with:

```bash
npm install --global pnpm@12.21.0
pnpm install --frozen-lockfile
pnpm run build:cloudflare
```

Production deployment is intentionally separate from CI:

```bash
pnpm run deploy
```
