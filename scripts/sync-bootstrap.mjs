import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/bootstrap/dist/css");
const destination = resolve(root, "wwwroot/css/bootstrap");

await mkdir(destination, { recursive: true });

const css = await readFile(resolve(source, "bootstrap.min.css"), "utf8");
const productionCss = css.replace(/\n?\/\*# sourceMappingURL=bootstrap\.min\.css\.map \*\//, "");
await writeFile(resolve(destination, "bootstrap.min.css"), productionCss);
