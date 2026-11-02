import { prisma } from "./banco";

/**
 * A conferência de uma oferta: o que o robô (revalidador da Cativa, calendário
 * da Smiles) e a equipe (o "Conferi") gravam depois de olhar o preço na fonte.
 * Mora no pacote porque o "Conferi" é uma tela (etapa L); o motor importa
 * `registrarConferencia` daqui.
 */

export type ResultadoConferencia = "ok" | "mudou" | "esgotou" | "nao_deu";

/**
 * Registra a conferência de uma oferta na fonte (o revalidador da V1b/V4
 * chama isto). Regra do Saulo: esgotou sai da vitrine; preço mudou atualiza o
 * preço e marca a variação; não deu para conferir fica como estava, sem selo
 * — e oferta sem selo não pode ser aprovada (`podeSerAprovada`).
 * `valor` é o preço conferido na unidade da oferta (milhas, se é em milhas; senão R$).
 */
export async function registrarConferencia(
  ofertaId: bigint,
  r: { resultado: ResultadoConferencia; valor?: number | null; motivo?: string | null },
): Promise<void> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, select: { milhas: true, precoBrl: true } });
  const emMilhas = o.milhas != null;
  const anterior = emMilhas ? o.milhas : (o.precoBrl?.toNumber() ?? null);
  const valor = r.valor ?? null;
  const resultado: ResultadoConferencia =
    r.resultado === "ok" && valor != null && anterior != null && valor !== anterior ? "mudou" : r.resultado;
  const variacao = valor != null && anterior ? Math.round((valor / anterior - 1) * 10_000) / 100 : null;
  await prisma.oferta.update({
    where: { id: ofertaId },
    data: {
      conferenciaResultado: resultado,
      conferenciaMotivo: r.motivo ?? null,
      conferenciaAnterior: anterior,
      conferenciaValor: valor,
      conferenciaVariacao: variacao,
      // "Não deu" não ganha selo: continua sem poder ser aprovada.
      conferidaEm: resultado === "nao_deu" ? null : new Date(),
      ...(resultado === "esgotou" ? { ativa: false } : {}),
      ...(resultado === "mudou" && valor != null ? (emMilhas ? { milhas: Math.round(valor) } : { precoBrl: valor }) : {}),
    },
  });
}


/**
 * "Conferi" — a equipe conferiu no site do programa (decisão do Saulo para
 * Azul, LATAM e Smiles executiva, e para a taxa que o alerta não deu). Fica o
 * nome de quem conferiu e a hora. Sem a taxa, não há selo.
 */
export async function conferirAMao(
  ofertaId: bigint,
  c: { quem: string; esgotou: boolean; milhas: number | null; taxasBrl: number | null },
): Promise<void> {
  const o = await prisma.oferta.findUniqueOrThrow({
    where: { id: ofertaId },
    select: { milhas: true, taxasBrl: true, ativa: true },
  });
  if (!o.ativa) throw new Error("Esta oferta já saiu da vitrine.");
  const quem = c.quem.trim().slice(0, 60);
  if (!quem) throw new Error("Diga quem conferiu.");
  if (c.esgotou) {
    await registrarConferencia(ofertaId, { resultado: "esgotou", motivo: `esgotou — conferido à mão por ${quem}` });
    return;
  }
  const taxas = c.taxasBrl ?? o.taxasBrl?.toNumber() ?? null;
  if (taxas == null || !(taxas >= 0)) throw new Error("Informe a taxa total em reais (ida + volta, por pessoa).");
  if (c.milhas != null && !(c.milhas > 0)) throw new Error("Milhas inválidas.");
  // No alerta, milhas e "normal" são o mesmo número (Azul e LATAM custam pela
  // normal): a correção vale para as duas.
  await prisma.oferta.update({
    where: { id: ofertaId },
    data: { taxasBrl: taxas, taxasEstimadas: false, ...(c.milhas != null ? { milhasNormal: c.milhas } : {}) },
  });
  await registrarConferencia(ofertaId, {
    resultado: "ok",
    valor: c.milhas ?? o.milhas,
    motivo: `conferido à mão por ${quem}`,
  });
}
