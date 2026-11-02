/**
 * Confere as regras do pacote do Radar (`src/pacote/`), que vai copiado para o
 * VoePro (etapa L): cada arquivo só importa de dentro do pacote ou do cliente
 * do schema `ofertas` (`@/generated/ofertas/client`). Nada de `@/lib/`,
 * `@/app/`, `next/*` ou `@/generated/prisma` — no VoePro, `@/generated/prisma`
 * é o cliente do `crm`, e `@/lib/` é o código de lá.
 *
 * Roda no `npm run check` e no `exportar-pacote.mjs`. Uso: node scripts/conferir-pacote.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
export const PACOTE = path.join(RAIZ, "src", "pacote");
const PERMITIDO_DE_FORA = new Set(["@/generated/ofertas/client"]);

function arquivos(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const p = path.join(pasta, nome);
    return statSync(p).isDirectory() ? arquivos(p) : /\.(ts|tsx|mjs|js)$/.test(nome) ? [p] : [];
  });
}

/** Os problemas do pacote em `pasta` (vazio = tudo certo). */
export function problemasDoPacote(pasta = PACOTE) {
  const problemas = [];
  for (const arq of arquivos(pasta)) {
    const texto = readFileSync(arq, "utf8");
    const rel = path.relative(pasta, arq);
    const imports = [
      ...texto.matchAll(/\bfrom\s+["']([^"']+)["']/g),
      ...texto.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g),
      ...texto.matchAll(/^\s*import\s+["']([^"']+)["']/gm),
    ].map((m) => m[1]);
    for (const de of imports) {
      if (de.startsWith("./") || de.startsWith("../")) {
        const alvo = path.resolve(path.dirname(arq), de);
        if (path.relative(pasta, alvo).startsWith("..")) problemas.push(`${rel}: "${de}" sai de dentro do pacote`);
      } else if (!PERMITIDO_DE_FORA.has(de)) {
        problemas.push(`${rel}: importa "${de}" (o pacote só pode importar de dentro dele e de @/generated/ofertas/client)`);
      }
    }
    if (/^\s*["']use (server|client)["']/m.test(texto)) problemas.push(`${rel}: "use server"/"use client" não cabe no pacote`);
  }
  return problemas;
}

// Rodado direto (e não importado pelo exportar-pacote.mjs).
if (path.basename(process.argv[1] ?? "") === "conferir-pacote.mjs") {
  const problemas = problemasDoPacote();
  if (problemas.length) {
    console.error(`O pacote do Radar quebrou as regras (src/pacote/):\n- ${problemas.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Pacote do Radar: imports ok.");
}
