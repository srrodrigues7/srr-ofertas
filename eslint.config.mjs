import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Gerado pelo `prisma generate` a cada npm install.
    "src/generated/**",
    // O pacote do instalador é montado a partir de instalador/, que já é lido.
    "pacote/**",
    // As cópias de trabalho de outras sessões (worktrees) moram dentro da pasta.
    ".claude/**",
  ]),
]);

export default eslintConfig;
