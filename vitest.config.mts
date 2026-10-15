import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    maxWorkers: 2,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: [
      "node_modules/**",
      ".next/**",
      ".next-build/**",
      ".next-e2e/**",
      "tests/e2e/**",
    ],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/api/generated.ts"],
    },
  },
});
