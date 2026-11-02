/**
 * Copia o pacote do Radar para o VoePro (etapa L: as telas do Radar moram no
 * VoePro; o motor, o schema `ofertas` e as migrações ficam aqui). Irmão do
 * `exportar-kit.mjs` do VoePro, que faz o caminho contrário com o kit visual.
 *
 *   node scripts/exportar-pacote.mjs <pasta do VoePro>
 *
 * O script:
 * - confere que o destino é um projeto Next.js com git, de outra pasta;
 * - confere as regras do pacote (só imports de dentro dele e do cliente do
 *   `ofertas`; `scripts/conferir-pacote.mjs`);
 * - confere que o VoePro tem **instalada** a mesma versão do Prisma e do Next
 *   (pelo `package-lock.json`, não pela faixa do `package.json`);
 * - recusa se a cópia de lá (`src/radar/`, `prisma/ofertas/`) tiver mudança não
 *   commitada: o pacote não se edita lá;
 * - troca `src/radar/` inteiro pelo `src/pacote/` daqui, e copia o
 *   `prisma/schema.prisma` para `prisma/ofertas/schema.prisma`, com o gerador
 *   apontado para `src/generated/ofertas` e o aviso de que lá não se migra;
 * - escreve `src/radar/ORIGEM.md` com o commit de onde veio.
 *
 * Não commita, não toca banco nem rede. O que fazer lá depois (o cliente do
 * `ofertas`, a configuração do Prisma sem migrações, as telas e a guarda) está
 * em `docs/etapas/L-radar-no-voepro.md`.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PACOTE, problemasDoPacote } from "./conferir-pacote.mjs";

const RAIZ = path.resolve(import.meta.dirname, "..");
const VERSOES = ["prisma", "@prisma/client", "@prisma/adapter-pg", "next"];

function recusar(motivo) {
  console.error(`Recusado: ${motivo}`);
  process.exit(1);
}

const destinoArg = process.argv[2];
if (!destinoArg) recusar("diga a pasta do VoePro: node scripts/exportar-pacote.mjs <pasta>");
const DESTINO = path.resolve(destinoArg);
const relativa = path.relative(RAIZ, DESTINO);
if (!(relativa === ".." || relativa.startsWith(".." + path.sep) || path.isAbsolute(relativa))) {
  recusar("o destino é este mesmo projeto (ou fica dentro dele).");
}

const pacoteJson = path.join(DESTINO, "package.json");
if (!existsSync(pacoteJson)) recusar(`não achei ${pacoteJson}.`);
const deps = (() => {
  const p = JSON.parse(readFileSync(pacoteJson, "utf8"));
  return { ...p.dependencies, ...p.devDependencies };
})();
if (!deps.next || !deps["@prisma/client"]) recusar("o destino não é um projeto Next.js com Prisma.");

const problemas = problemasDoPacote();
if (problemas.length) recusar(`o pacote quebrou as regras:\n- ${problemas.join("\n- ")}`);

function instaladas(pasta) {
  const lock = path.join(pasta, "package-lock.json");
  if (!existsSync(lock)) recusar(`não achei ${lock} (preciso da versão instalada, não da faixa).`);
  const pacotes = JSON.parse(readFileSync(lock, "utf8")).packages ?? {};
  return Object.fromEntries(VERSOES.map((n) => [n, pacotes[`node_modules/${n}`]?.version ?? null]));
}
const aqui = instaladas(RAIZ);
const la = instaladas(DESTINO);
const diferentes = VERSOES.filter((n) => aqui[n] !== la[n]);
if (diferentes.length) {
  recusar(`versões instaladas diferentes: ${diferentes.map((n) => `${n} aqui ${aqui[n]}, lá ${la[n]}`).join("; ")}.`);
}

const git = (pasta, ...args) => execFileSync("git", ["-C", pasta, ...args], { encoding: "utf8" }).trim();
let sujo = "";
try {
  sujo = git(DESTINO, "status", "--porcelain", "--", "src/radar", "prisma/ofertas");
} catch {
  recusar("o destino não é um repositório git: sem git, não dá para desfazer a cópia.");
}
if (sujo) recusar(`a cópia do pacote no destino tem mudança não commitada:\n${sujo}\nO pacote não se edita lá. Commite ou descarte, e rode de novo.`);

// A origem também precisa estar commitada: o ORIGEM.md diz um commit, e o que
// vai copiado tem de ser exatamente ele.
const sujoAqui = git(RAIZ, "status", "--porcelain", "--", "src/pacote", "prisma/schema.prisma");
if (sujoAqui) recusar(`o pacote daqui tem mudança não commitada:\n${sujoAqui}\nCommite antes de exportar.`);

const commit = git(RAIZ, "rev-parse", "--short", "HEAD");
const ramo = git(RAIZ, "rev-parse", "--abbrev-ref", "HEAD");
const hoje = new Date().toISOString().slice(0, 10);

// 1. O pacote → src/radar/
const alvo = path.join(DESTINO, "src", "radar");
rmSync(alvo, { recursive: true, force: true });
cpSync(PACOTE, alvo, { recursive: true });
writeFileSync(
  path.join(alvo, "ORIGEM.md"),
  `# De onde veio este pacote

Copiado do Radar de ofertas (srr-ofertas), \`src/pacote/\`, commit \`${commit}\` do
ramo \`${ramo}\`, em ${hoje}, por \`scripts/exportar-pacote.mjs\`.

**Não edite os arquivos desta pasta aqui.** O dono do pacote e do schema
\`ofertas\` é o srr-ofertas: a mudança é feita lá e copiada de novo com o mesmo
comando. O guia está lá, em \`docs/etapas/L-radar-no-voepro.md\`.
`,
);

// 2. O schema → prisma/ofertas/schema.prisma, só para gerar o cliente
const schema = readFileSync(path.join(RAIZ, "prisma", "schema.prisma"), "utf8");
const gerador = /(generator\s+client\s*\{[^}]*?output\s*=\s*)"[^"]*"/;
if (!gerador.test(schema)) recusar("não achei o `output` do gerador no prisma/schema.prisma daqui.");
const copia = schema.replace(gerador, '$1"../../src/generated/ofertas"');
const pastaSchema = path.join(DESTINO, "prisma", "ofertas");
mkdirSync(pastaSchema, { recursive: true });
writeFileSync(
  path.join(pastaSchema, "schema.prisma"),
  `// ============================================================================
// NÃO MIGRAR. O dono deste schema é o srr-ofertas (o Radar), que é quem cria e
// aplica as migrações do \`ofertas\`, com o papel \`srr_ofertas\`. Esta cópia
// serve só para gerar o cliente do \`ofertas\` no VoePro:
//   npx prisma generate --config prisma.ofertas.config.ts
// Copiado do srr-ofertas, commit ${commit}, em ${hoje}. Não edite aqui.
// ============================================================================

${copia}`,
);

console.log(`Pacote copiado para ${alvo} e schema para ${pastaSchema} (commit ${commit}, ${ramo}).`);
console.log("Agora, no VoePro: gere o cliente (prisma.ofertas.config.ts) e siga o docs/etapas/L-radar-no-voepro.md do Radar.");
