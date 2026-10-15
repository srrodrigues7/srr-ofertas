import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { horaLocalParaBanco, paraBanco } from "@/lib/datas";
import {
  chaveDaOferta,
  chaveDoPreco,
  etiquetasDeduzidas,
  type Detalhe,
  type LugarVisto,
  type OfertaNova,
  type PrecoNovo,
} from "./molde";

/**
 * Grava o que um conector achou. É o único caminho até o banco: toda fonte
 * passa por aqui, no mesmo molde.
 */

/** Completa a oferta com o que já sabemos do destino (cidade, país, região,
 *  estilo) — a fonte nem sempre conta. */
async function completarComLugares(ofertas: OfertaNova[]): Promise<void> {
  const codigos = [...new Set(ofertas.map((o) => o.destino))];
  if (!codigos.length) return;
  const lugares = await prisma.lugar.findMany({ where: { codigo: { in: codigos } } });
  const porCodigo = new Map(lugares.map((l) => [l.codigo, l]));
  for (const o of ofertas) {
    const l = porCodigo.get(o.destino);
    if (!l) continue;
    o.destinoCidade ??= l.cidade;
    o.destinoUf ??= l.uf;
    o.destinoPais ??= l.pais;
    o.destinoRegiao ??= l.regiao;
    o.estilo ??= l.estilo;
  }
}

function dadosDaOferta(o: OfertaNova, coletaId: bigint | null) {
  return {
    fonteId: o.fonteId,
    buscaId: o.buscaId ?? null,
    coletaId,
    tipo: o.tipo,
    detalhe: o.detalhe,
    origem: o.origem,
    origemCidade: o.origemCidade ?? null,
    destino: o.destino,
    destinoCidade: o.destinoCidade ?? null,
    destinoUf: o.destinoUf ?? null,
    destinoPais: o.destinoPais ?? null,
    destinoRegiao: o.destinoRegiao ?? null,
    internacional: o.internacional,
    mes: o.mes,
    ida: o.ida ? paraBanco(o.ida) : null,
    volta: o.volta ? paraBanco(o.volta) : null,
    noites: o.noites ?? null,
    composicao: o.composicao,
    classe: o.classe,
    companhias: o.companhias,
    companhiaNome: o.companhiaNome ?? null,
    programaId: o.programaId ?? null,
    milhas: o.milhas ?? null,
    milhasNormal: o.milhasNormal ?? null,
    taxasBrl: o.taxasBrl ?? null,
    taxasEstimadas: o.taxasEstimadas ?? false,
    precoBrl: o.precoBrl ?? null,
    precoReferenciaBrl: o.precoReferenciaBrl ?? null,
    parcelasFonte: o.parcelasFonte ?? null,
    bagagem: o.bagagem,
    bagagemQtd: o.bagagemQtd ?? null,
    idaSaida: horaLocalParaBanco(o.idaSaida),
    idaChegada: horaLocalParaBanco(o.idaChegada),
    idaParadas: o.idaParadas ?? null,
    idaDuracaoMin: o.idaDuracaoMin ?? null,
    idaVoos: o.idaVoos ?? null,
    voltaSaida: horaLocalParaBanco(o.voltaSaida),
    voltaChegada: horaLocalParaBanco(o.voltaChegada),
    voltaParadas: o.voltaParadas ?? null,
    voltaDuracaoMin: o.voltaDuracaoMin ?? null,
    voltaVoos: o.voltaVoos ?? null,
    assentos: o.assentos ?? null,
    emitirAte: o.emitirAte ? new Date(o.emitirAte) : null,
    localizador: o.localizador ? (o.localizador as Prisma.InputJsonValue) : Prisma.DbNull,
    hotelNome: o.hotelNome ?? null,
    hotelCategoria: o.hotelCategoria ?? null,
    regime: o.regime ?? null,
    adultos: o.adultos ?? 1,
    criancas: o.criancas ?? 0,
    aceitaCrianca: o.aceitaCrianca ?? null,
    estilo: o.estilo ?? null,
    etiquetas: etiquetasDeduzidas(o),
    fornecedor: o.fornecedor ?? null,
    link: o.link ?? null,
    dadosFonte: o.dadosFonte === undefined ? Prisma.DbNull : (o.dadosFonte as Prisma.InputJsonValue),
    ativa: true,
    vistaEm: new Date(),
    ...(o.detalhe === "voo" ? { detalhadaEm: new Date() } : {}),
  };
}

/**
 * Grava (cria ou atualiza) as ofertas. Devolve as chaves gravadas.
 *
 * Uma oferta já detalhada (voo, horários, taxas exatas) que o calendário vê de
 * novo PELO MESMO PREÇO só ganha "vista agora" — o detalhe continua valendo.
 * Se o preço mudou, o detalhe antigo não vale mais: volta a "dia" e espera um
 * detalhe novo.
 */
export async function gravarOfertas(ofertas: OfertaNova[], coletaId: bigint | null): Promise<string[]> {
  if (!ofertas.length) return [];
  await completarComLugares(ofertas);

  // A mesma chave duas vezes no mesmo lote: fica a mais barata.
  const porChave = new Map<string, OfertaNova>();
  for (const o of ofertas) {
    const k = chaveDaOferta(o);
    const atual = porChave.get(k);
    if (!atual || valorDe(o) < valorDe(atual)) porChave.set(k, o);
  }
  const chaves = [...porChave.keys()];
  const existentes = await prisma.oferta.findMany({
    where: { chave: { in: chaves } },
    select: { chave: true, detalhe: true, milhas: true, precoBrl: true },
  });
  const jaTem = new Map(existentes.map((e) => [e.chave, e]));

  const operacoes = chaves.map((chave) => {
    const o = porChave.get(chave)!;
    const antes = jaTem.get(chave);
    if (
      antes &&
      antes.detalhe === "voo" &&
      o.detalhe === "dia" &&
      antes.milhas === (o.milhas ?? null) &&
      (antes.precoBrl?.toNumber() ?? null) === (o.precoBrl ?? null)
    ) {
      return prisma.oferta.update({
        where: { chave },
        data: { vistaEm: new Date(), ativa: true, coletaId, buscaId: o.buscaId ?? undefined },
      });
    }
    const dados = dadosDaOferta(o, coletaId);
    // Preço diferente do que estava = a conferência antiga não vale mais.
    const precoMudou =
      antes && (antes.milhas !== (o.milhas ?? null) || (antes.precoBrl?.toNumber() ?? null) !== (o.precoBrl ?? null));
    return prisma.oferta.upsert({
      where: { chave },
      create: { chave, ...dados },
      update: {
        ...dados,
        ...(antes?.detalhe === "voo" && o.detalhe !== "voo" ? { detalhadaEm: null } : {}),
        ...(precoMudou ? { conferidaEm: null, conferenciaResultado: null } : {}),
      },
    });
  });
  // Em lotes, para não segurar uma transação enorme.
  for (let i = 0; i < operacoes.length; i += 50) {
    await prisma.$transaction(operacoes.slice(i, i + 50));
  }
  return chaves;
}

function valorDe(o: OfertaNova): number {
  return o.milhas ?? o.precoBrl ?? Number.POSITIVE_INFINITY;
}

/**
 * Tira da vitrine as ofertas de um escopo que a fonte, buscada de novo, não
 * mostrou mais. Só se chama depois de uma coleta que deu certo.
 */
export async function desativarAusentes(escopo: {
  fonteId: string;
  detalhes: Detalhe[];
  vistas: string[];
  buscaId?: number;
  origem?: string;
  destino?: string;
  classe?: string;
  mesDe?: string;
  mesAte?: string;
  /** Só as ofertas de descoberta (sem pedido de busca). */
  semBusca?: boolean;
}): Promise<number> {
  const condicoes: Prisma.Sql[] = [
    Prisma.sql`ativa`,
    Prisma.sql`fonte_id = ${escopo.fonteId}`,
    Prisma.sql`detalhe = ANY(${escopo.detalhes}::text[])`,
    Prisma.sql`NOT (chave = ANY(${escopo.vistas}::text[]))`,
  ];
  if (escopo.buscaId !== undefined) condicoes.push(Prisma.sql`busca_id = ${escopo.buscaId}`);
  if (escopo.semBusca) condicoes.push(Prisma.sql`busca_id IS NULL`);
  if (escopo.origem) condicoes.push(Prisma.sql`origem = ${escopo.origem}`);
  if (escopo.destino) condicoes.push(Prisma.sql`destino = ${escopo.destino}`);
  if (escopo.classe) condicoes.push(Prisma.sql`classe = ${escopo.classe}`);
  if (escopo.mesDe) condicoes.push(Prisma.sql`mes >= ${escopo.mesDe}`);
  if (escopo.mesAte) condicoes.push(Prisma.sql`mes <= ${escopo.mesAte}`);
  return prisma.$executeRaw`
    UPDATE "ofertas"."oferta" SET ativa = false
     WHERE ${Prisma.join(condicoes, " AND ")}`;
}

/**
 * Guarda os preços no histórico: um registro por item por dia (de Brasília),
 * com o menor e o último preço do dia e quantas vezes foi visto.
 */
export async function gravarPrecos(precos: PrecoNovo[]): Promise<number> {
  const porChave = new Map<string, PrecoNovo>();
  for (const p of precos) {
    if (!(p.valor > 0)) continue;
    const k = chaveDoPreco(p);
    const atual = porChave.get(k);
    if (!atual || p.valor < atual.valor) porChave.set(k, p);
  }
  const itens = [...porChave.entries()];
  for (let i = 0; i < itens.length; i += 400) {
    const lote = itens.slice(i, i + 400).map(
      ([chave, p]) => Prisma.sql`(
        ${chave}, (now() AT TIME ZONE 'America/Sao_Paulo')::date, ${p.fonteId}, ${p.tipo},
        ${p.origem}, ${p.destino}, ${p.classe}, ${p.mes},
        ${p.ida ?? null}::date, ${p.volta ?? null}::date, ${p.unidade}, ${p.programaId ?? null},
        ${p.valor}::numeric, ${p.valor}::numeric, ${p.companhia ?? null})`,
    );
    await prisma.$executeRaw`
      INSERT INTO "ofertas"."preco_observado"
        (chave, dia, fonte_id, tipo, origem, destino, classe, mes, ida, volta, unidade,
         programa_id, minimo, ultimo, companhia)
      VALUES ${Prisma.join(lote)}
      ON CONFLICT (chave, dia) DO UPDATE SET
        minimo    = LEAST("preco_observado".minimo, EXCLUDED.minimo),
        ultimo    = EXCLUDED.ultimo,
        vezes     = "preco_observado".vezes + 1,
        companhia = COALESCE(EXCLUDED.companhia, "preco_observado".companhia),
        ultima_em = now()`;
  }
  return itens.length;
}

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

/** Só oferta conferida (ok ou com o preço já atualizado) pode ser aprovada. */
export function podeSerAprovada(o: { conferidaEm: Date | null; conferenciaResultado: string | null; ativa: boolean }) {
  return o.ativa && o.conferidaEm != null && (o.conferenciaResultado === "ok" || o.conferenciaResultado === "mudou");
}

/** Ensina ao cadastro de lugares o que a fonte contou (sem apagar o que já se sabe). */
export async function gravarLugares(lugares: LugarVisto[]): Promise<void> {
  const porCodigo = new Map(lugares.filter((l) => l.codigo && l.cidade).map((l) => [l.codigo, l]));
  if (!porCodigo.size) return;
  const linhas = [...porCodigo.values()].map(
    (l) => Prisma.sql`(${l.codigo}, ${l.cidade}, ${l.uf ?? null}, ${l.pais ?? null}, ${l.regiao ?? null})`,
  );
  await prisma.$executeRaw`
    INSERT INTO "ofertas"."lugar" (codigo, cidade, uf, pais, regiao)
    VALUES ${Prisma.join(linhas)}
    ON CONFLICT (codigo) DO UPDATE SET
      uf     = COALESCE("lugar".uf, EXCLUDED.uf),
      pais   = COALESCE("lugar".pais, EXCLUDED.pais),
      regiao = COALESCE("lugar".regiao, EXCLUDED.regiao)`;
}
