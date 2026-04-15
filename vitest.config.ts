import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "openclaw/plugin-sdk/plugin-entry": resolve(
        __dirname,
        "types/openclaw/plugin-sdk/plugin-entry/index.js"
      ),
    },
  },
});
