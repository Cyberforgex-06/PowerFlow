import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
});
