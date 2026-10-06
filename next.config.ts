import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=true builds plain HTML/JS into ./out for GitHub Pages
 * (see .github/workflows/deploy.yml). PAGES_BASE_PATH sets the URL prefix,
 * e.g. "/marigold-demo" for https://<user>.github.io/marigold-demo.
 * Local `npm run dev` / `npm run build && npm start` are unaffected.
 */
const staticExport = process.env.STATIC_EXPORT === "true";
const basePath = process.env.PAGES_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not let `next dev` write AGENTS.md / CLAUDE.md into the repository.
  agentRules: false,
  devIndicators: false,
  ...(staticExport && { output: "export" as const, trailingSlash: true }),
  ...(basePath && { basePath }),
  // Lets the UI prefix links to files in public/ (e.g. source documents) on GitHub Pages.
  env: { NEXT_PUBLIC_BASE_PATH: basePath ?? "" },
};

export default nextConfig;
