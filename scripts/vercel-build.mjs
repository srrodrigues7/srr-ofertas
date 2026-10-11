/**
 * O build da Vercel: aplica as migrações e depois constrói o painel.
 *
 * - Produção (o ramo main) migra o banco de produção.
 * - As versões de rascunho (Preview, cada ramo de etapa) migram o banco de
 *   TESTES: na Vercel, as variáveis de Preview apontam para o milespro-staging.
 *   Assim nada que ainda não foi aprovado chega à produção.
 *
 * Falha fechada: sem DATABASE_URL o build para, em vez de publicar um painel
 * que não sabe onde está o banco.
 *
 * A migração usa o papel srr_ofertas, que só alcança o schema ofertas.
 */
import { execFileSync } from "node:child_process";

const ambiente = process.env.VERCEL_ENV ?? "local";

function rodar(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
}

if (!process.env.DATABASE_URL) {
  console.error(`\n✖ Falta DATABASE_URL nas variáveis da Vercel (ambiente: ${ambiente}).\n`);
  process.exit(1);
}

console.log(`Build do SRR Ofertas — ambiente ${ambiente}.`);
rodar("npx", ["prisma", "migrate", "deploy"]);
rodar("npx", ["prisma", "generate"]);
rodar("npx", ["next", "build"]);
