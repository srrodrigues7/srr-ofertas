import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { lerConfiguracao } from "@/lib/configuracao";
import { dormir, hoje } from "@/lib/datas";
import { registrarConferencia } from "@/lib/coleta/gravar";
import { executar, type Log } from "@/lib/coleta/nucleo";
import { calendarioSmiles } from "@/lib/coleta/fontes/smiles";
import { FONTE_ALERTA, type DadosDoAlerta } from "./regras";

/**
 * A CONFERÊNCIA das ofertas de alerta (V6). Regra da casa: não conferida não
 * pode ser aprovada (lição 4 da HUB 92: preço velho não chega ao cliente).
 *
 * - Smiles econômica: o robô confere sozinho no calendário aberto da Smiles
 *   (o mesmo da V1a): tira as datas que sumiram, e o preço passa a ser o do
 *   calendário (tarifa Clube, que é o custo da SRR). Nenhuma data sobrou =
 *   esgotou, sai da vitrine.
 * - Azul, LATAM e Smiles executiva: não há como o robô conferir hoje. Decisão
 *   do Saulo (30/10/2026): a equipe confere no site do programa e aperta
 *   "Conferi" (`conferirAMao`), com o nome de quem conferiu e a taxa.
 * - Sem a taxa em reais, nem o robô dá o selo: a equipe confere a taxa.
 *
 * Os pedidos vêm da fila `conferencia_pedido` (o botão "Conferir agora", a
 * aprovação da V4 e os automáticos daqui). O revalidador da Cativa só pega os
 * da Cativa; estes são das ofertas de alerta.
 */

const CHAVES = ["alertas.conferir_smiles_horas", "smiles.prazo_s", "smiles.pausa_ms"] as const;

export const MOTIVO_A_MAO =
  "o robô não confere este programa/classe: confira no site do programa e aperte \"Conferi\"";

/** O robô sabe conferir esta oferta? (Smiles, econômica.) */
export function roboConfere(o: { programaId: string | null; classe: string }): boolean {
  return o.programaId === "smiles" && o.classe === "economica";
}

export async function conferirAlertas(opcoes: { ate: number; log: Log }): Promise<string> {
  const cfg = await lerConfiguracao(CHAVES);
  if (cfg["alertas.conferir_smiles_horas"] > 0) await enfileirarAutomaticas(cfg["alertas.conferir_smiles_horas"]);

  const pedidos = await prisma.conferenciaPedido.findMany({
    where: { status: "na_fila", oferta: { fonteId: FONTE_ALERTA } },
    orderBy: { pedidoEm: "asc" },
    include: { oferta: true },
  });
  if (!pedidos.length) return "";
  // Quem apertou o botão (ou a aprovação) primeiro; os automáticos depois.
  pedidos.sort((a, b) => Number(b.motivo !== "automatico") - Number(a.motivo !== "automatico"));

  let feitas = 0;
  let robo = 0;
  for (const p of pedidos) {
    if (Date.now() + 30_000 > opcoes.ate) break;
    await prisma.conferenciaPedido.update({ where: { id: p.id }, data: { status: "conferindo", comecouEm: new Date() } });
    const o = p.oferta;
    if (!o.ativa) {
      await fechar(p.id, "feito", "a oferta já tinha saído da vitrine");
      continue;
    }
    if (!roboConfere(o)) {
      await registrarConferencia(o.id, { resultado: "nao_deu", motivo: MOTIVO_A_MAO });
      await fechar(p.id, "feito", MOTIVO_A_MAO);
      feitas++;
      continue;
    }
    if (robo > 0) await dormir(cfg["smiles.pausa_ms"]);
    let resumo = "";
    const status = await executar(
      {
        fonteId: "smiles",
        tipo: "conferencia",
        escopo: `alerta:${o.id}`,
        prioridade: 1,
        custoS: 20,
        rodar: async ({ contador }) => {
          resumo = await conferirNaSmiles(o, { prazoS: cfg["smiles.prazo_s"], pausaMs: cfg["smiles.pausa_ms"], contador });
          return { itens: 1, historico: 0, resumo };
        },
      },
      p.motivo === "automatico" ? "agenda" : "agora",
      opcoes.log,
    );
    robo++;
    feitas++;
    if (status === "erro" || status === "bloqueado") {
      const motivo = "o calendário da Smiles não respondeu (veja a Saúde)";
      await registrarConferencia(o.id, { resultado: "nao_deu", motivo });
      await fechar(p.id, "erro", motivo);
    } else {
      await fechar(p.id, "feito", resumo);
    }
  }
  return feitas ? `${feitas} conferência(s) de alerta (${robo} no calendário da Smiles)` : "";
}

async function fechar(id: bigint, status: "feito" | "erro", resumo: string) {
  await prisma.conferenciaPedido.update({
    where: { id },
    data: { status, terminouEm: new Date(), resumo: resumo.slice(0, 500) },
  });
}

/** Smiles econômica ativa, que não foi conferida nem pedida há `horas`. */
async function enfileirarAutomaticas(horas: number): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "ofertas"."conferencia_pedido" (oferta_id, motivo)
    SELECT o.id, 'automatico' FROM "ofertas"."oferta" o
     WHERE o.ativa AND o.fonte_id = ${FONTE_ALERTA} AND o.programa_id = 'smiles' AND o.classe = 'economica'
       AND NOT EXISTS (
         SELECT 1 FROM "ofertas"."conferencia_pedido" p
          WHERE p.oferta_id = o.id
            AND (p.status IN ('na_fila', 'conferindo') OR p.pedido_em > now() - (${horas}::int * interval '1 hour')))
    ON CONFLICT DO NOTHING`;
}

type OfertaDoAlerta = {
  id: bigint;
  origem: string;
  destino: string;
  composicao: string;
  companhias: string[];
  taxasBrl: Prisma.Decimal | null;
  dadosFonte: Prisma.JsonValue;
};

/**
 * Confere uma oferta de alerta no calendário da Smiles. O calendário dá o
 * menor preço Clube de cada dia (só ida); a oferta continua valendo nas datas
 * do alerta que ainda aparecem lá.
 */
async function conferirNaSmiles(
  o: OfertaDoAlerta,
  opcoes: { prazoS: number; pausaMs: number; contador: { requisicoes: number } },
): Promise<string> {
  const dados = (o.dadosFonte as { alerta?: DadosDoAlerta } | null)?.alerta;
  if (!dados) {
    await registrarConferencia(o.id, { resultado: "nao_deu", motivo: "a oferta não guardou as datas do alerta" });
    return "sem datas guardadas";
  }
  const dia = hoje();
  const idas = dados.datasIda.filter((d) => d >= dia);
  if (!idas.length) {
    await registrarConferencia(o.id, { resultado: "esgotou", motivo: "todas as datas de ida do alerta já passaram" });
    return "datas passaram";
  }
  // Voo só GOL: o calendário da GOL basta; com parceira, pergunta as duas.
  const comParceiras = !(o.companhias.length === 1 && o.companhias[0] === "G3");
  const ida = await calendarioSmiles(o.origem, o.destino, idas[0], idas.at(-1)!, { comParceiras, ...opcoes });
  if (!ida.dias.size) {
    await registrarConferencia(o.id, {
      resultado: "nao_deu",
      motivo: "o calendário da Smiles veio vazio para estas datas (o robô tenta de novo mais tarde; ou confira no site e aperte \"Conferi\")",
    });
    return "rota sem calendário";
  }
  const idasOk = idas.filter((d) => ida.dias.has(d));
  if (!idasOk.length) {
    await registrarConferencia(o.id, { resultado: "esgotou", motivo: "nenhuma data de ida do alerta aparece mais no calendário da Smiles" });
    return "esgotou (ida)";
  }
  let milhas = Math.min(...idasOk.map((d) => ida.dias.get(d)!.milhas));
  let voltasOk: string[] = [];
  const porDiaIda = Object.fromEntries(idasOk.map((d) => [d, ida.dias.get(d)!.milhas]));
  let porDiaVolta: Record<string, number> = {};
  if (o.composicao !== "so_ida") {
    const voltas = dados.datasVolta.filter((d) => d > idasOk[0]);
    if (!voltas.length) {
      await registrarConferencia(o.id, { resultado: "esgotou", motivo: "nenhuma volta depois das idas que sobraram" });
      return "esgotou (volta)";
    }
    await dormir(opcoes.pausaMs);
    const volta = await calendarioSmiles(o.destino, o.origem, voltas[0], voltas.at(-1)!, { comParceiras, ...opcoes });
    if (!volta.dias.size) {
      await registrarConferencia(o.id, {
        resultado: "nao_deu",
        motivo: "o calendário da Smiles veio vazio para as voltas (o robô tenta de novo mais tarde; ou confira no site e aperte \"Conferi\")",
      });
      return "volta sem calendário";
    }
    voltasOk = voltas.filter((d) => volta.dias.has(d));
    if (!voltasOk.length) {
      await registrarConferencia(o.id, { resultado: "esgotou", motivo: "nenhuma data de volta do alerta aparece mais no calendário da Smiles" });
      return "esgotou (volta)";
    }
    milhas += Math.min(...voltasOk.map((d) => volta.dias.get(d)!.milhas));
    porDiaVolta = Object.fromEntries(voltasOk.map((d) => [d, volta.dias.get(d)!.milhas]));
  }

  // As datas que sobraram passam a ser as da oferta (o cliente escolhe entre elas).
  const novos: DadosDoAlerta = {
    ...dados,
    datasIda: idasOk,
    datasVolta: voltasOk,
    milhasPorDiaIda: porDiaIda,
    milhasPorDiaVolta: porDiaVolta,
  };
  await prisma.oferta.update({
    where: { id: o.id },
    data: {
      dadosFonte: { ...(o.dadosFonte as Record<string, unknown>), alerta: novos } as Prisma.InputJsonValue,
    },
  });
  const datas = `${idasOk.length} de ${idas.length} data(s) de ida${o.composicao !== "so_ida" ? `, ${voltasOk.length} de volta` : ""}`;
  if (o.taxasBrl == null) {
    // Datas e milhas conferidas, mas sem a taxa não há selo: a equipe confere.
    await registrarConferencia(o.id, {
      resultado: "nao_deu",
      valor: milhas,
      motivo: `calendário da Smiles ok (${datas}, ${milhas.toLocaleString("pt-BR")} milhas Clube); falta a taxa: confira e aperte "Conferi"`,
    });
    return `${datas}; falta a taxa`;
  }
  await registrarConferencia(o.id, { resultado: "ok", valor: milhas, motivo: `calendário da Smiles: ${datas}` });
  return datas;
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
