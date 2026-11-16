const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../dist/wwwroot");
const port = 5002;
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".dat", "application/octet-stream"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".wasm", "application/wasm"],
]);

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error(`Published app not found at ${root}. Run pnpm run build first.`);
  process.exit(1);
}

http.createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  let filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(`${root}${path.sep}`) || path.basename(filePath) === "_headers") {
    response.writeHead(404).end();
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(root, "index.html");
  }

  let servedPath = filePath;
  const acceptedEncodings = request.headers["accept-encoding"] || "";
  if (acceptedEncodings.includes("br") && fs.existsSync(`${filePath}.br`)) {
    servedPath = `${filePath}.br`;
  } else if (acceptedEncodings.includes("gzip") && fs.existsSync(`${filePath}.gz`)) {
    servedPath = `${filePath}.gz`;
  }

  const headers = {
    "Content-Type": contentTypes.get(path.extname(filePath)) || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Vary": "Accept-Encoding",
    "Cache-Control": requestPath.startsWith("/_framework/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate",
  };
  if (servedPath.endsWith(".br")) headers["Content-Encoding"] = "br";
  if (servedPath.endsWith(".gz")) headers["Content-Encoding"] = "gzip";

  response.writeHead(200, headers);
  fs.createReadStream(servedPath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving published app from ${root} on http://localhost:${port}`);
});
