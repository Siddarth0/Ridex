import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-secret-test-secret-test-secret-42",
      FRONTEND_URL: "http://localhost:3000",
    },
    testTimeout: 30_000,
  },
});
