import { defineConfig } from "../tests/node_modules/vitest/dist/config.js";
import { resolve } from "node:path";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: [
      { find: /^open-sse\//, replacement: `${resolve(process.cwd(), "open-sse")}/` },
      { find: "open-sse", replacement: resolve(process.cwd(), "open-sse") },
      { find: /^@\//, replacement: `${resolve(process.cwd(), "src")}/` },
    ],
  },
});