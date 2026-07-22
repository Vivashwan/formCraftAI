import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.{js,mjs}"],
  },
  resolve: {
    // Match the app's "@/*" -> project root alias.
    alias: { "@": dir },
  },
});
