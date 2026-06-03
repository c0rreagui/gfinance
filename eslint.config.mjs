import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Enforce ecosystem boundaries between G-Work and G-Finance
  {
    files: ["src/app/tasks/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "**/finance/**",
            "**/transactions/**",
            "**/cards/**",
            "**/debts/**",
            "**/subscriptions/**",
            "**/wealth/**",
            "**/analytics/**",
            "**/crypto/**",
            "**/integrations/**",
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/app/finance/**/*",
      "src/app/transactions/**/*",
      "src/app/cards/**/*",
      "src/app/debts/**/*",
      "src/app/subscriptions/**/*",
      "src/app/wealth/**/*",
      "src/app/analytics/**/*",
      "src/app/crypto/**/*",
      "src/app/integrations/**/*",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "**/tasks/**",
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
