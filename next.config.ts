import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not let `next dev` write AGENTS.md / CLAUDE.md into the repository.
  agentRules: false,
  devIndicators: false,
};

export default nextConfig;
