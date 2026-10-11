/**
 * Monta a pasta que vai no pen drive para instalar o motor no computador
 * dedicado:  pacote/SRR Ofertas/
 *
 *   npm run pacote:instalador                 (o motor segue o ramo main)
 *   npm run pacote:instalador -- --ramo outro (para testar um ramo de etapa)
 *
 * Junta os arquivos de instalador/ e um .env feito de:
 * - DATABASE_URL de .env.producao (gerado por `npm run banco:preparar -- --alvo producao`);
 * - o endereço do GitHub (do `git remote` deste projeto) e o ramo.
 *
 * Os .ps1 saem com BOM (marca no começo do arquivo) porque o PowerShell do
 * Windows, sem ela, lê os acentos errado. Nada de senha é impresso.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const ramo = args.includes("--ramo") ? args[args.indexOf("--ramo") + 1] : "main";

function pare(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

if (!existsSync(".env.producao")) {
  pare("Falta .env.producao. Rode antes: npm run banco:preparar -- --alvo producao");
}
const producao = {};
for (const l of readFileSync(".env.producao", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
  if (m) producao[m[1]] = m[2];
}
if (!producao.DATABASE_URL) pare(".env.producao não tem DATABASE_URL.");

let remoto;
try {
  remoto = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
} catch {
  pare("Este projeto ainda não tem o GitHub como 'origin' (git remote add origin ...).");
}
// https://github.com/conta/projeto(.git) → git@github.com:conta/projeto.git
const m = remoto.match(/github\.com[/:]([^/]+\/[^/.]+?)(\.git)?$/);
if (!m) pare(`O 'origin' (${remoto}) não parece ser do GitHub.`);
const repoSsh = `git@github.com:${m[1]}.git`;

const destino = path.join("pacote", "SRR Ofertas");
rmSync("pacote", { recursive: true, force: true });
mkdirSync(destino, { recursive: true });

const BOM = "﻿";
const crlf = (t) => t.replace(/\r?\n/g, "\r\n");

for (const nome of ["instalar.ps1", "conferir.ps1", "desinstalar.ps1"]) {
  const texto = readFileSync(path.join("instalador", nome), "utf8").replace(/^﻿/, "");
  writeFileSync(path.join(destino, nome), BOM + crlf(texto));
}
for (const nome of ["Instalar SRR Ofertas.cmd", "Conferir motor.cmd", "Desinstalar SRR Ofertas.cmd"]) {
  writeFileSync(path.join(destino, nome), crlf(readFileSync(path.join("instalador", nome), "utf8")));
}
writeFileSync(path.join(destino, "LEIA-ME.txt"), BOM + crlf(readFileSync(path.join("instalador", "LEIA-ME.txt"), "utf8")));
cpSync(path.join("instalador", "vigia.mjs"), path.join(destino, "vigia.mjs"));

const env = [
  "# SRR Ofertas — configuração do motor no computador dedicado.",
  "# Tem a senha do banco: não compartilhe, não mande por chat. Montado por scripts/montar-pacote.mjs.",
  `DATABASE_URL="${producao.DATABASE_URL}"`,
  `SRR_REPO="${repoSsh}"`,
  `SRR_RAMO="${ramo}"`,
  'ATUALIZAR_A_CADA_MIN="10"',
  "",
].join("\r\n");
writeFileSync(path.join(destino, ".env"), env);

console.log(`\n✔ Pacote pronto em ${destino}`);
console.log(`  Código: ${repoSsh} — ramo ${ramo}`);
console.log("  Copie a pasta \"SRR Ofertas\" para um pen drive. Depois de instalar, apague o pen drive.\n");
