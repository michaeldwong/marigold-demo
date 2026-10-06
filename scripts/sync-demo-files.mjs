// Copies the customer-facing Volterra files and the cited 45X source documents into public/demo-files
// so the dashboard can open them. Internal test-oracle files are never copied. Cross-platform (Node fs/path only).
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "demo-files");
const dataset = join(root, "data", "volterra_synthetic", "volterra_synthetic_data");
const taxDocs = ["i7207--2025.pdf", "f7207.pdf", "FR-2024-10-28.pdf"];

if (existsSync(dataset)) {
  rmSync(join(out, "volterra"), { recursive: true, force: true });
  cpSync(dataset, join(out, "volterra"), {
    recursive: true,
    filter: (src) => !src.split(sep).some((part) => part === "INTERNAL_TEST_ONLY" || part.startsWith(".")),
  });
  console.log("sync-demo-files: copied customer-facing Volterra files");
} else {
  console.log("sync-demo-files: dataset not found, keeping existing public/demo-files/volterra");
}

const docs = join(root, "docs", "compliance");
for (const f of taxDocs) {
  if (existsSync(join(docs, f))) {
    mkdirSync(join(out, "45x"), { recursive: true });
    cpSync(join(docs, f), join(out, "45x", f));
  }
}
