import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { lerConfiguracao } from "@/lib/configuracao";
import { lerValores, precificar, type Preco } from "./preco";

/**
 * A vitrine da equipe: as ofertas ativas, com custo, venda e parcelas,
 * agrupadas por rota + mês de embarque ("BSB→SSA · março · a partir de R$ 780
 * · 12 datas"). Mostra tudo, inclusive a fonte (é a visão da equipe; a
 * mensagem do grupo é outra coisa e vem na V4).
 */

export type Filtros = {
  /** A aba: passagem ou pacote. */
  tipo: "passagem" | "pacote";
  destino?: string;
  origem?: string;
  fonte?: string;
  mes?: string;
  /** Passagem: classe e companhia. Pacote: regime e noites. */
  classe?: string;
  companhia?: string;
  regime?: string;
  noites?: string;
  ordem?: "preco" | "recente" | "destino" | "mes";
};

export type ItemVitrine = {
  id: string;
  fonteId: string;
  fonteNome: string;
  buscaId: number | null;
  detalhe: string;
  tipo: string;
  ida: Date | null;
  volta: Date | null;
  noites: number | null;
  composicao: string;
  classe: string;
  companhias: string[];
  companhiaNome: string | null;
  programaId: string | null;
  milhas: number | null;
  milhasNormal: number | null;
  taxasBrl: number | null;
  taxasEstimadas: boolean;
  precoBrl: number | null;
  precoReferenciaBrl: number | null;
  bagagem: string;
  bagagemQtd: number | null;
  idaSaida: Date | null;
  idaChegada: Date | null;
  idaParadas: number | null;
  idaDuracaoMin: number | null;
  idaVoos: string | null;
  voltaSaida: Date | null;
  voltaChegada: Date | null;
  voltaParadas: number | null;
  voltaDuracaoMin: number | null;
  voltaVoos: string | null;
  assentos: number | null;
  emitirAte: Date | null;
  conferidaEm: Date | null;
  conferenciaResultado: string | null;
  conferenciaVariacao: number | null;
  conferenciaMotivo: string | null;
  hotelNome: string | null;
  hotelCategoria: number | null;
  adultos: number;
  criancas: number;
  regime: string | null;
  etiquetas: string[];
  fornecedor: string | null;
  link: string | null;
  vistaEm: Date;
  detalhadaEm: Date | null;
  preco: Preco;
};

export type GrupoVitrine = {
  chave: string;
  origem: string;
  origemCidade: string | null;
  destino: string;
  destinoCidade: string | null;
  destinoPais: string | null;
  internacional: boolean;
  mes: string;
  classe: string;
  tipo: string;
  /** O menor preço de venda do grupo (ou de custo, se a venda não sai). */
  aPartirDe: number | null;
  aPartirDeVenda: boolean;
  fontes: string[];
  buscaIds: number[];
  vistaEm: Date;
  itens: ItemVitrine[];
};

export type Vitrine = {
  grupos: GrupoVitrine[];
  totalGrupos: number;
  totalOfertas: number;
  opcoes: {
    destinos: { codigo: string; nome: string }[];
    origens: string[];
    fontes: { id: string; nome: string }[];
    meses: string[];
    companhias: string[];
    regimes: string[];
    noites: number[];
  };
  faltasGerais: string[];
};

const LIMITE_GRUPOS = 150;

/** O valor que ordena uma oferta: a venda; sem venda, o custo; sem custo, o preço achado. */
function valorDe(i: ItemVitrine): number {
  return i.preco.venda ?? i.preco.custo ?? i.precoBrl ?? Number.POSITIVE_INFINITY;
}

export async function lerVitrine(f: Filtros): Promise<Vitrine> {
  const cfg = await lerConfiguracao(["ofertas.validade_horas"]);
  const desde = new Date(Date.now() - cfg["ofertas.validade_horas"] * 3_600_000);
  // A base de cada aba (passagem ou pacote): as opções dos filtros saem dela.
  const base: Prisma.OfertaWhereInput = { ativa: true, vistaEm: { gte: desde }, tipo: f.tipo };
  const onde: Prisma.OfertaWhereInput = { ...base };
  if (f.destino) onde.destino = f.destino;
  if (f.origem) onde.origem = f.origem;
  if (f.fonte) onde.fonteId = f.fonte;
  if (f.mes) onde.mes = f.mes;
  if (f.classe) onde.classe = f.classe;
  if (f.companhia) onde.companhias = { has: f.companhia };
  if (f.regime) onde.regime = f.regime;
  if (f.noites) onde.noites = Number(f.noites) || undefined;

  const [linhas, valores, destinos, origens, meses, companhias, regimes, noites] = await Promise.all([
    prisma.oferta.findMany({ where: onde }),
    lerValores(),
    prisma.oferta.groupBy({ by: ["destino", "destinoCidade"], where: base, orderBy: { destinoCidade: "asc" } }),
    prisma.oferta.groupBy({ by: ["origem"], where: base, orderBy: { origem: "asc" } }),
    prisma.oferta.groupBy({ by: ["mes"], where: base, orderBy: { mes: "asc" } }),
    prisma.$queryRaw<{ c: string }[]>`
      SELECT DISTINCT unnest(companhias) AS c FROM "ofertas"."oferta"
       WHERE ativa AND tipo = ${f.tipo} AND vista_em >= ${desde} ORDER BY 1`,
    prisma.oferta.groupBy({ by: ["regime"], where: { ...base, regime: { not: null } }, orderBy: { regime: "asc" } }),
    prisma.oferta.groupBy({ by: ["noites"], where: { ...base, noites: { not: null } }, orderBy: { noites: "asc" } }),
  ]);

  const grupos = new Map<string, GrupoVitrine>();
  for (const o of linhas) {
    const num = (d: Prisma.Decimal | null) => d?.toNumber() ?? null;
    const item: ItemVitrine = {
      id: o.id.toString(),
      fonteId: o.fonteId,
      fonteNome: valores.fontes.get(o.fonteId)?.nome ?? o.fonteId,
      buscaId: o.buscaId,
      detalhe: o.detalhe,
      tipo: o.tipo,
      ida: o.ida,
      volta: o.volta,
      noites: o.noites,
      composicao: o.composicao,
      classe: o.classe,
      companhias: o.companhias,
      companhiaNome: o.companhiaNome,
      programaId: o.programaId,
      milhas: o.milhas,
      milhasNormal: o.milhasNormal,
      taxasBrl: num(o.taxasBrl),
      taxasEstimadas: o.taxasEstimadas,
      precoBrl: num(o.precoBrl),
      precoReferenciaBrl: num(o.precoReferenciaBrl),
      bagagem: o.bagagem,
      bagagemQtd: o.bagagemQtd,
      idaSaida: o.idaSaida,
      idaChegada: o.idaChegada,
      idaParadas: o.idaParadas,
      idaDuracaoMin: o.idaDuracaoMin,
      idaVoos: o.idaVoos,
      voltaSaida: o.voltaSaida,
      voltaChegada: o.voltaChegada,
      voltaParadas: o.voltaParadas,
      voltaDuracaoMin: o.voltaDuracaoMin,
      voltaVoos: o.voltaVoos,
      assentos: o.assentos,
      emitirAte: o.emitirAte,
      conferidaEm: o.conferidaEm,
      conferenciaResultado: o.conferenciaResultado,
      conferenciaVariacao: num(o.conferenciaVariacao),
      conferenciaMotivo: o.conferenciaMotivo,
      hotelNome: o.hotelNome,
      hotelCategoria: num(o.hotelCategoria),
      adultos: o.adultos,
      criancas: o.criancas,
      regime: o.regime,
      etiquetas: o.etiquetas,
      fornecedor: o.fornecedor,
      link: o.link,
      vistaEm: o.vistaEm,
      detalhadaEm: o.detalhadaEm,
      preco: precificar(
        {
          fonteId: o.fonteId,
          tipo: o.tipo,
          classe: o.classe,
          internacional: o.internacional,
          programaId: o.programaId,
          milhas: o.milhas,
          milhasNormal: o.milhasNormal,
          taxasBrl: num(o.taxasBrl),
          precoBrl: num(o.precoBrl),
          parcelasFonte: o.parcelasFonte,
        },
        valores,
      ),
    };
    // Pacote agrupa pelo destino DO PACOTE (Porto de Galinhas, Maragogi), não
    // pelo aeroporto de chegada (REC, MCZ): são viagens diferentes.
    const lugar = o.tipo === "pacote" ? (o.destinoCidade ?? o.destino) : o.destino;
    const chave = [o.origem, lugar, o.mes, o.classe, o.tipo].join("|");
    let g = grupos.get(chave);
    if (!g) {
      g = {
        chave,
        origem: o.origem,
        origemCidade: o.origemCidade,
        destino: o.destino,
        destinoCidade: o.destinoCidade,
        destinoPais: o.destinoPais,
        internacional: o.internacional,
        mes: o.mes,
        classe: o.classe,
        tipo: o.tipo,
        aPartirDe: null,
        aPartirDeVenda: false,
        fontes: [],
        buscaIds: [],
        vistaEm: o.vistaEm,
        itens: [],
      };
      grupos.set(chave, g);
    }
    g.destinoCidade ??= o.destinoCidade;
    g.origemCidade ??= o.origemCidade;
    g.destinoPais ??= o.destinoPais;
    if (o.vistaEm > g.vistaEm) g.vistaEm = o.vistaEm;
    if (o.buscaId && !g.buscaIds.includes(o.buscaId)) g.buscaIds.push(o.buscaId);
    g.itens.push(item);
  }

  for (const g of grupos.values()) {
    // O "menor do mês" de uma fonte só aparece se ela não trouxe datas do mês.
    const comDatas = new Set(g.itens.filter((i) => i.detalhe !== "mes").map((i) => i.fonteId));
    g.itens = g.itens.filter((i) => i.detalhe !== "mes" || !comDatas.has(i.fonteId));
    g.itens.sort((a, b) => valorDe(a) - valorDe(b) || (a.ida?.getTime() ?? 0) - (b.ida?.getTime() ?? 0));
    g.fontes = [...new Set(g.itens.map((i) => i.fonteNome))];
    const primeiro = g.itens[0];
    if (primeiro) {
      const v = valorDe(primeiro);
      g.aPartirDe = Number.isFinite(v) ? v : null;
      g.aPartirDeVenda = primeiro.preco.venda != null;
    }
  }

  const lista = [...grupos.values()].filter((g) => g.itens.length);
  const nome = (g: GrupoVitrine) => g.destinoCidade ?? g.destino;
  switch (f.ordem) {
    case "recente":
      lista.sort((a, b) => b.vistaEm.getTime() - a.vistaEm.getTime());
      break;
    case "destino":
      lista.sort((a, b) => nome(a).localeCompare(nome(b), "pt-BR") || a.mes.localeCompare(b.mes));
      break;
    case "mes":
      lista.sort((a, b) => a.mes.localeCompare(b.mes) || (a.aPartirDe ?? 9e9) - (b.aPartirDe ?? 9e9));
      break;
    default:
      lista.sort((a, b) => (a.aPartirDe ?? 9e9) - (b.aPartirDe ?? 9e9));
  }

  // O que falta na configuração e afeta muitas ofertas: avisa uma vez, no topo.
  const faltasGerais = new Set<string>();
  for (const g of lista) for (const i of g.itens) for (const x of i.preco.faltas) if (x !== "taxas") faltasGerais.add(x);

  const nomes = new Map<string, string>();
  for (const d of destinos) if (!nomes.has(d.destino) || d.destinoCidade) nomes.set(d.destino, d.destinoCidade ?? d.destino);
  return {
    grupos: lista.slice(0, LIMITE_GRUPOS),
    totalGrupos: lista.length,
    totalOfertas: lista.reduce((n, g) => n + g.itens.length, 0),
    opcoes: {
      destinos: [...nomes.entries()]
        .map(([codigo, n]) => ({ codigo, nome: `${n} (${codigo})` }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      origens: origens.map((o) => o.origem),
      fontes: [...valores.fontes.entries()].map(([id, v]) => ({ id, nome: v.nome })),
      meses: meses.map((m) => m.mes),
      companhias: companhias.map((c) => c.c),
      regimes: regimes.map((r) => r.regime!).filter(Boolean),
      noites: noites.map((n) => n.noites!).filter((n) => n != null),
    },
    faltasGerais: [...faltasGerais],
  };
}
