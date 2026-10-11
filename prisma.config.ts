import { defineConfig } from "prisma/config";

// Prisma 7 tirou a URL de dentro do schema.prisma — ela mora aqui.
// DATABASE_URL: a conexão de sessão (porta 5432), usada pelo migrate e pelo
// motor. O painel na Vercel usa a de transação (PGBOUNCER_URL), em src/lib/prisma.ts.
//
// O Prisma não lê .env sozinho: carregamos com o loader nativo do Node. No
// computador do motor e na Vercel as variáveis já vêm do ambiente, então a
// ausência do arquivo não é erro.
try {
  process.loadEnvFile();
} catch {
  // sem .env local — segue com as variáveis do ambiente
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Sem `env()` de propósito: o `prisma generate`, que roda a cada npm
    // install, não precisa de banco e não pode falhar por falta dele. Já o
    // migrate, sem URL, para com erro — que é o que queremos.
    url: process.env.DATABASE_URL ?? "",
  },
  migrations: {
    path: "prisma/migrations",
  },
});
