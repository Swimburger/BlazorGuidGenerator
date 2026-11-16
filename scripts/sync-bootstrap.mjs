import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/bootstrap/dist/css");
const destination = resolve(root, "wwwroot/css/bootstrap");

await mkdir(destination, { recursive: true });

for (const file of ["bootstrap.min.css", "bootstrap.min.css.map"]) {
  await copyFile(resolve(source, file), resolve(destination, file));
}
