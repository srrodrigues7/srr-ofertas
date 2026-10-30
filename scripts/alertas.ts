/**
 * Os alertas do WhatsApp (V6) sem o motor:
 *
 *   npm run alertas                  uma vez: ponte + leitor + validade, e o relatório
 *   npm run alertas -- --vigiar      só a ponte, de minuto em minuto (para quando o
 *                                    monitor de WhatsApp e o motor estão em
 *                                    computadores diferentes: rode no do monitor)
 *   npm run alertas -- --ler-de-novo lê de novo TODAS as mensagens guardadas (depois
 *                                    de mudar uma regra em Valores) e mostra o relatório
 *   npm run alertas -- --conferir    também confere as de Smiles econômica no calendário
 *
 * Grava no banco do .env como o motor gravaria. A ponte precisa de
 * MONITOR_WHATSAPP_PASTA no .env (a pasta do monitor de WhatsApp).
 */
process.loadEnvFile();
const { prisma } = await import("@/lib/prisma");
const { passarPonte, pastaDoMonitor } = await import("@/lib/alertas/ponte");
const { lerPendentes, faxinaDosAlertas, marcarTodasParaLerDeNovo, recontarProgramas, ROTULOS } = await import("@/lib/alertas/alertas");
const { conferirAlertas } = await import("@/lib/alertas/conferencia");

const args = new Set(process.argv.slice(2));
const log = { info: console.log, aviso: console.warn, erro: console.error };

if (args.has("--vigiar")) {
  if (!pastaDoMonitor()) {
    console.error("Falta MONITOR_WHATSAPP_PASTA no .env (a pasta do monitor de WhatsApp).");
    process.exit(78);
  }
  console.log("Ponte ligada: lendo o arquivo do monitor a cada minuto. Ctrl+C para parar.");
  let parar = false;
  process.on("SIGINT", () => (parar = true));
  while (!parar) {
    const r = await passarPonte();
    if (r.texto) console.log(`${new Date().toLocaleTimeString("pt-BR")} ${r.texto}`);
    for (let i = 0; i < 60 && !parar; i++) await new Promise((res) => setTimeout(res, 1000));
  }
  await prisma.$disconnect();
  process.exit(0);
}

const ponte = await passarPonte();
console.log(ponte.configurada ? ponte.texto || "Ponte: nada novo no arquivo do monitor." : "Ponte: MONITOR_WHATSAPP_PASTA não está no .env (pulei).");
if (args.has("--ler-de-novo")) console.log(`${await marcarTodasParaLerDeNovo()} mensagem(ns) marcada(s) para ler de novo.`);
for (;;) {
  const r = await lerPendentes();
  if (!r.lidas) break;
  console.log(r.texto);
}
await recontarProgramas();
const saiu = await faxinaDosAlertas();
if (saiu) console.log(`${saiu} oferta(s) de alerta venceram.`);
if (args.has("--conferir")) console.log((await conferirAlertas({ ate: Date.now() + 10 * 60_000, log })) || "Nada para conferir.");

// O relatório: todas as mensagens guardadas, por resultado.
const total = await prisma.alertaMensagem.count();
const porResultado = await prisma.alertaMensagem.groupBy({ by: ["resultado"], _count: true, orderBy: { resultado: "asc" } });
const repetidas = await prisma.alertaMensagem.count({ where: { repetida: true } });
console.log(`\nMensagens guardadas: ${total} (${repetidas} repetida(s) de um alerta anterior)`);
for (const g of porResultado) console.log(`  ${(ROTULOS[g.resultado ?? ""] ?? "falta ler").padEnd(18)} ${g._count}`);

const motivos = await prisma.alertaMensagem.groupBy({
  by: ["resultado", "motivo"],
  where: { resultado: { in: ["nao_entendido", "sem_datas", "fora_classe", "fora_origem", "fora_programa"] } },
  _count: true,
  orderBy: { _count: { motivo: "desc" } },
});
for (const r of ["nao_entendido", "sem_datas", "fora_classe", "fora_programa", "fora_origem"]) {
  const lista = motivos.filter((m) => m.resultado === r);
  if (!lista.length) continue;
  console.log(`\n${ROTULOS[r]}:`);
  for (const m of lista.slice(0, 12)) console.log(`  ${String(m._count).padStart(4)}  ${m.motivo ?? "—"}`);
  if (lista.length > 12) console.log(`  … e mais ${lista.length - 12} motivo(s)`);
}

const ativas = await prisma.oferta.groupBy({
  by: ["programaId", "classe"],
  where: { fonteId: "alerta_cpm", ativa: true },
  _count: true,
  orderBy: [{ programaId: "asc" }, { classe: "asc" }],
});
console.log("\nNa vitrine (ofertas de alerta ativas):");
if (!ativas.length) console.log("  nenhuma");
for (const g of ativas) console.log(`  ${(g.programaId ?? "?").padEnd(16)} ${g.classe.padEnd(10)} ${g._count}`);
await prisma.$disconnect();
export {};
