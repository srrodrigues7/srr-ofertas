/**
 * Roda UMA coleta da Cativa agora, sem o motor (para testar e conferir):
 *
 *   npm run cativa
 *
 * Grava no banco do .env como o motor gravaria (registro em `coleta`,
 * ofertas, histórico) e mostra o resumo e alguns números da vitrine.
 */
process.loadEnvFile();
const { prisma } = await import("@/lib/prisma");
const { executar } = await import("@/lib/coleta/nucleo");
const { tarefaVitrineCativa } = await import("@/lib/coleta/pacotes");

const log = { info: console.log, aviso: console.warn, erro: console.error };
const inicio = Date.now();
const resultado = await executar(tarefaVitrineCativa(log), "agora", log);
const ultima = await prisma.coleta.findFirst({ where: { fonteId: "cativa" }, orderBy: { id: "desc" } });
console.log(`\nStatus: ${resultado} em ${((Date.now() - inicio) / 1000).toFixed(1)} s · ${ultima?.requisicoes ?? 0} requisição(ões)`);
console.log(ultima?.resumo ?? ultima?.erro ?? "");

const porTipo = await prisma.oferta.groupBy({
  by: ["tipo", "origem"],
  where: { fonteId: "cativa", ativa: true },
  _count: true,
  orderBy: [{ tipo: "asc" }, { origem: "asc" }],
});
console.log("\nNa vitrine (Cativa, ativas):");
for (const g of porTipo) console.log(`  ${g.tipo.padEnd(9)} ${g.origem}: ${g._count}`);
await prisma.$disconnect();
export {};
