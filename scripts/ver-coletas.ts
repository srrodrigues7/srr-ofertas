/**
 * As últimas coletas e o tamanho da vitrine, no terminal.
 *
 * Uso:  npm run coletas            (as 25 últimas)
 *       npm run coletas -- 60      (as 60 últimas)
 */
try {
  process.loadEnvFile();
} catch {
  // sem .env: usa as variáveis do ambiente
}
const { prisma } = await import("@/lib/prisma");

const n = Number(process.argv[2]) || 25;
const fmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const coletas = await prisma.coleta.findMany({ orderBy: { id: "desc" }, take: n });
for (const c of coletas.reverse()) {
  const quanto = c.duracaoMs != null ? `${(c.duracaoMs / 1000).toFixed(1)}s` : "…";
  console.log(
    `${fmt.format(c.comecouEm)} ${c.fonteId.padEnd(17)} ${c.tipo.padEnd(10)} ${c.status.padEnd(9)} ` +
      `${quanto.padStart(6)} req=${c.requisicoes} itens=${c.itens} hist=${c.historico}  ${c.escopo}` +
      (c.resumo ? `\n      ${c.resumo}` : "") +
      (c.erro ? `\n      ERRO: ${c.erro}` : ""),
  );
}

const [ofertas, porFonte, historico] = await Promise.all([
  prisma.oferta.count({ where: { ativa: true } }),
  prisma.oferta.groupBy({ by: ["fonteId", "detalhe"], where: { ativa: true }, _count: true }),
  prisma.precoObservado.count(),
]);
console.log(
  `\nVitrine: ${ofertas} ofertas ativas (` +
    porFonte.map((p) => `${p.fonteId}/${p.detalhe}: ${p._count}`).join(", ") +
    `). Histórico: ${historico} registros.`,
);
await prisma.$disconnect();
export {};
