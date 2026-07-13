import { defineConfig, globalIgnores } from "eslint/config";
import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  globalIgnores([".next/**", "out/**", "node_modules/**", "next-env.d.ts"]),
  ...coreWebVitals,
  ...nextTypescript,
]);
