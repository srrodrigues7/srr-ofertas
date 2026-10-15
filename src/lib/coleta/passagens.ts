import { prisma } from "@/lib/prisma";
import { CHAVES_DA_COLETA, lerConfiguracao, type ConfiguracaoDaColeta } from "@/lib/configuracao";
import { nomeDaCompanhia } from "@/lib/companhias";
import { diasEntre, doBanco, fimDoMes, hoje, inicioDoMes, mesDe, somarDias } from "@/lib/datas";
import type { Contador } from "./http";
import { desativarAusentes, gravarLugares, gravarOfertas, gravarPrecos } from "./gravar";
import type { OfertaNova, PrecoNovo } from "./molde";
import {
  vencimento,
  executar,
  fontePausada,
  fontesLigadas,
  limparInterrompidas,
  rodarAgenda,
  ultimasColetas,
  type Log,
  type Resultado,
  type Tarefa as TarefaDoNucleo,
} from "./nucleo";
import { calendarioSmiles, linkSmiles, type DiaSmiles } from "./fontes/smiles";
import { cidadesDoMural, precosDaRota, regiaoDaCategoria, type CidadeMd, type MesPreco } from "./fontes/melhores-destinos";

/**
 * A coleta de PASSAGENS: o que o motor faz em cada passada, em cima do núcleo
 * genérico (nucleo.ts).
 *
 * 1. Atende primeiro o "Buscar agora" (a fila `busca_agora`).
 * 2. Depois monta a lista do que está VENCIDO — cada coisa tem um escopo
 *    ("cal:12:0-2" = calendário do pedido 12, meses 0 a 2) e um intervalo; a
 *    última coleta daquele escopo diz se já passou da hora — e o núcleo vai
 *    fazendo, a mais atrasada primeiro, até acabar o tempo da passada.
 *
 * Fonte que RECUSA o acesso (bloqueio) fica em paz por
 * `coleta.pausa_apos_bloqueio_min`. Uma fonte que falha não derruba a outra.
 */

/** O que as tarefas de passagem recebem: a configuração da passada. */
type Contexto = {
  cfg: ConfiguracaoDaColeta;
  contador: Contador;
  coletaId: bigint;
};

/** Uma tarefa de passagem: como a do núcleo, mas recebe o contexto inteiro. */
type Tarefa = Omit<TarefaDoNucleo, "rodar"> & { rodar: (ctx: Contexto) => Promise<Resultado> };

/** Liga a tarefa de passagem ao núcleo, que só conhece contador e coleta. */
function paraNucleo(t: Tarefa, cfg: ConfiguracaoDaColeta): TarefaDoNucleo {
  return { ...t, rodar: (base) => t.rodar({ ...base, cfg }) };
}

type BuscaLinha = Awaited<ReturnType<typeof lerBuscas>>[number];
type Faixa = { deMes: number; ateMes: number; intervaloHoras: number };

const HORA = 60 * 60_000;
const SMILES = "smiles";
const MD = "melhores_destinos";

/** As cidades do mural do MD, por origem (guardadas na memória do motor). */
const muralEmMemoria = new Map<string, { cidades: CidadeMd[]; em: number }>();

// ---------------------------------------------------------------------------

export async function coletarPassagens(opcoes: { ate: number; log: Log }): Promise<string> {
  const { log } = opcoes;
  const cfg = await lerConfiguracao(CHAVES_DA_COLETA);
  await limparInterrompidas();
  await prisma.$executeRaw`
    UPDATE "ofertas"."busca_agora" SET status = 'erro', terminou_em = now(),
           resumo = 'Interrompido: o motor caiu ou foi desligado no meio da busca. Peça de novo.'
     WHERE status = 'buscando' AND comecou_em < now() - interval '15 minutes'`;

  const partes: string[] = [];
  // 1. "Buscar agora"
  for (;;) {
    const pedido = await pegarPedidoDaFila();
    if (!pedido) break;
    partes.push(await atenderBuscarAgora(pedido.id, pedido.buscaId, cfg, log));
  }

  // 2. A agenda
  const tarefas = (await montarAgenda(cfg)).map((t) => paraNucleo(t, cfg));
  const { feitas, erros, total } = await rodarAgenda(tarefas, opcoes.ate, log);
  const pendentes = total - feitas;
  partes.push(
    total
      ? `Coleta: ${feitas} de ${total} tarefa(s) vencida(s)${erros ? `, ${erros} com erro` : ""}` +
          (pendentes > 0 ? ` (${pendentes} ficam para a próxima passada)` : "") +
          "."
      : "Coleta: nada vencido.",
  );
  return partes.join(" ");
}

/** Há alguém esperando um "Buscar agora"? (o motor acorda mais cedo) */
export async function haPedidoNaFila(): Promise<boolean> {
  return (await prisma.buscaAgora.count({ where: { status: "na_fila" } })) > 0;
}

/** Faxina da coleta (o motor chama uma vez por hora). */
export async function faxinaDaColeta(): Promise<string> {
  const cfg = await lerConfiguracao(["historico.guardar_dias", "ofertas.validade_horas", "passadas.guardar_dias"]);
  const precos = await prisma.$executeRaw`
    DELETE FROM "ofertas"."preco_observado" WHERE dia < (now() - (${cfg["historico.guardar_dias"]}::int * interval '1 day'))::date`;
  const coletas = await prisma.$executeRaw`
    DELETE FROM "ofertas"."coleta" WHERE comecou_em < now() - (${cfg["passadas.guardar_dias"]}::int * interval '1 day')`;
  const vencidas = await prisma.$executeRaw`
    UPDATE "ofertas"."oferta" SET ativa = false
     WHERE ativa AND (vista_em < now() - (${cfg["ofertas.validade_horas"]}::int * interval '1 hour')
                      OR ida < (now() AT TIME ZONE 'America/Sao_Paulo')::date)`;
  await prisma.$executeRaw`
    DELETE FROM "ofertas"."busca_agora" WHERE pedido_em < now() - interval '30 days'`;
  const r: string[] = [];
  if (vencidas) r.push(`${vencidas} oferta(s) vencida(s) saíram da vitrine`);
  if (precos) r.push(`${precos} preço(s) com mais de ${cfg["historico.guardar_dias"]} dias apagado(s)`);
  if (coletas) r.push(`${coletas} registro(s) de coleta antigos apagado(s)`);
  return r.join("; ");
}

// --- "Buscar agora" ---------------------------------------------------------

async function pegarPedidoDaFila(): Promise<{ id: bigint; buscaId: number } | null> {
  const [p] = await prisma.$queryRaw<{ id: bigint; busca_id: number }[]>`
    UPDATE "ofertas"."busca_agora" SET status = 'buscando', comecou_em = now()
     WHERE id = (SELECT id FROM "ofertas"."busca_agora" WHERE status = 'na_fila'
                  ORDER BY pedido_em LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING id, busca_id`;
  return p ? { id: p.id, buscaId: p.busca_id } : null;
}

async function atenderBuscarAgora(
  pedidoId: bigint,
  buscaId: number,
  cfg: ConfiguracaoDaColeta,
  log: Log,
): Promise<string> {
  const [busca] = await lerBuscas(buscaId);
  const partes: string[] = [];
  let falhas = 0;
  if (!busca) {
    partes.push("O pedido de busca não existe mais.");
  } else {
    const fontes = await fontesLigadas();
    const faixas = await lerFaixas();
    const lugar = await prisma.lugar.findUnique({ where: { codigo: busca.destino } });
    const tarefas: Tarefa[] = [];
    // Executiva: nenhuma fonte de hoje dá (o calendário da Smiles é econômica;
    // o MD também). O pedido fica guardado para quando houver fonte.
    if (busca.classe === "economica") {
      if (fontes.has(SMILES)) for (const f of faixas) tarefas.push(tarefaCalendario(busca, f, lugar?.pais ?? null));
      if (fontes.has(MD)) for (const mes of mesesDoHorizonte(busca, faixas)) tarefas.push(tarefaDatasMd(busca, mes, cfg));
    } else {
      partes.push("Executiva: nenhuma fonte ligada dá preço de executiva por enquanto.");
    }
    for (const t of tarefas) {
      const s = await executar(paraNucleo(t, cfg), "agora", log);
      if (s === "erro" || s === "bloqueado") falhas++;
    }
    const ativas = await prisma.oferta.count({ where: { buscaId, ativa: true } });
    partes.push(
      `Buscar agora ${busca.origem}→${busca.destino}: ${tarefas.length} busca(s)` +
        (falhas ? `, ${falhas} com erro (veja a Saúde)` : "") +
        `; ${ativas} oferta(s) na vitrine.`,
    );
  }
  await prisma.buscaAgora.update({
    where: { id: pedidoId },
    data: { status: falhas ? "erro" : "feito", terminouEm: new Date(), resumo: partes.join(" ") },
  });
  return partes.join(" ");
}

// --- a agenda ---------------------------------------------------------------

async function lerBuscas(id?: number) {
  return prisma.busca.findMany({
    where: id ? { id } : { ligada: true, destinoTipo: "cidade" },
    orderBy: { id: "asc" },
  });
}

async function lerFaixas(): Promise<Faixa[]> {
  const faixas = await prisma.faixaBusca.findMany({ orderBy: { deMes: "asc" } });
  return faixas.map((f) => ({ deMes: f.deMes, ateMes: f.ateMes, intervaloHoras: f.intervaloHoras }));
}

async function montarAgenda(cfg: ConfiguracaoDaColeta): Promise<Tarefa[]> {
  const fontes = await fontesLigadas();
  const buscas = await lerBuscas();
  const faixas = await lerFaixas();
  const lugares = new Map(
    (await prisma.lugar.findMany({ where: { codigo: { in: buscas.map((b) => b.destino) } } })).map((l) => [l.codigo, l]),
  );
  const pausa = cfg["coleta.pausa_apos_bloqueio_min"];
  // Os meses próximos ganham um empurrão: na mesma situação, vão antes.
  const bonus = (f: Faixa | undefined) => (f ? 0.3 * (1 - faixas.indexOf(f) / Math.max(1, faixas.length)) : 0);
  const daSmiles: Tarefa[] = [];
  const doMd: Tarefa[] = [];

  if (fontes.has(SMILES) && !(await fontePausada(SMILES, pausa))) {
    const ultimas = await ultimasColetas(SMILES);
    for (const f of faixas) {
      for (const b of buscas.filter((x) => x.classe === "economica")) {
        const t = tarefaCalendario(b, f, lugares.get(b.destino)?.pais ?? null);
        const v = vencimento(ultimas.get(t.escopo), f.intervaloHoras * HORA);
        if (v === null) continue;
        t.prioridade = v + bonus(f);
        daSmiles.push(t);
      }
    }
  }

  if (fontes.has(MD) && !(await fontePausada(MD, pausa))) {
    const ultimas = await ultimasColetas(MD);
    const intervalo = cfg["md.intervalo_horas"] * HORA;
    // As datas de cada mês de cada pedido (o mural do MD é só econômica).
    const economicas = buscas.filter((x) => x.classe === "economica");
    const meses = [...new Set(economicas.flatMap((b) => mesesDoHorizonte(b, faixas)))].sort();
    for (const mes of meses) {
      for (const b of economicas) {
        if (!mesesDoHorizonte(b, faixas).includes(mes)) continue;
        const t = tarefaDatasMd(b, mes, cfg);
        const f = faixaDoDia(`${mes}-15`, faixas);
        const v = vencimento(ultimas.get(t.escopo), Math.max(intervalo, (f?.intervaloHoras ?? 24) * HORA));
        if (v === null) continue;
        t.prioridade = v + bonus(f);
        doMd.push(t);
      }
    }
    // A descoberta: tudo o que o mural tem, de cada origem dos pedidos.
    const origens = [...new Set(buscas.map((b) => b.origem))];
    const cobertos = new Set(buscas.map((b) => `${b.origem}|${cidadeMd(b.destino)}`));
    for (const origem of origens) {
      const soInternacional = !buscas.some(
        (b) => b.origem === origem && (lugares.get(b.destino)?.pais ?? "Brasil") === "Brasil",
      );
      const memoria = muralEmMemoria.get(origem);
      // Sem a lista de cidades na memória (o motor acabou de subir), o mural é urgente.
      const v = memoria ? vencimento(ultimas.get(`mural:${origem}`), intervalo) : 1.5;
      if (v !== null) doMd.push({ ...tarefaMural(origem, soInternacional), prioridade: v });
      for (const c of memoria?.cidades ?? []) {
        if (cobertos.has(`${origem}|${cidadeMd(c.destino)}`)) continue;
        const t = tarefaCidadeMd(c);
        const vc = vencimento(ultimas.get(t.escopo), intervalo);
        if (vc === null) continue;
        t.prioridade = vc - 0.5; // depois dos pedidos
        doMd.push(t);
      }
    }
  }

  // Intercala as fontes: no empate, uma de cada (o núcleo ordena sem embaralhar empates).
  const tarefas: Tarefa[] = [];
  for (let i = 0; i < Math.max(daSmiles.length, doMd.length); i++) {
    if (daSmiles[i]) tarefas.push(daSmiles[i]);
    if (doMd[i]) tarefas.push(doMd[i]);
  }
  return tarefas;
}

function faixaDoDia(dia: string, faixas: Faixa[]): Faixa | undefined {
  const meses =
    (Number(dia.slice(0, 4)) - Number(hoje().slice(0, 4))) * 12 + Number(dia.slice(5, 7)) - Number(hoje().slice(5, 7));
  return faixas.find((f) => meses >= f.deMes && meses <= f.ateMes);
}

/** O período de uma faixa, recortado pela janela do pedido. Nunca hoje (amanhã em diante). */
function periodo(b: BuscaLinha, f: Faixa): { de: string; ate: string } | null {
  const amanha = somarDias(hoje(), 1);
  let de = inicioDoMes(hoje(), f.deMes);
  let ate = fimDoMes(hoje(), f.ateMes);
  if (de < amanha) de = amanha;
  if (b.dataDe && doBanco(b.dataDe) > de) de = doBanco(b.dataDe);
  if (b.dataAte && doBanco(b.dataAte) < ate) ate = doBanco(b.dataAte);
  return de <= ate ? { de, ate } : null;
}

function mesesDoHorizonte(b: BuscaLinha, faixas: Faixa[]): string[] {
  const meses = new Set<string>();
  for (const f of faixas) {
    const p = periodo(b, f);
    if (!p) continue;
    for (let m = p.de.slice(0, 7); m <= p.ate.slice(0, 7); m = inicioDoMes(`${m}-01`, 1).slice(0, 7)) meses.add(m);
  }
  return [...meses].sort();
}

function internacionalDe(pais: string | null, origem: string): boolean {
  if (pais) return pais !== "Brasil";
  // Sem saber o país: o calendário pergunta às parceiras também (é barato).
  return origem !== "BSB";
}

// --- Smiles: calendário ------------------------------------------------------

function tarefaCalendario(b: BuscaLinha, f: Faixa, pais: string | null): Tarefa {
  return {
    fonteId: SMILES,
    tipo: "calendario",
    escopo: `cal:${b.id}:${f.deMes}-${f.ateMes}`,
    buscaId: b.id,
    prioridade: 1,
    custoS: 15,
    rodar: (ctx) => rodarCalendario(b, f, pais, ctx),
  };
}

async function rodarCalendario(b: BuscaLinha, f: Faixa, pais: string | null, ctx: Contexto): Promise<Resultado> {
  const p = periodo(b, f);
  if (!p) return { itens: 0, historico: 0, resumo: "Fora da janela do pedido." };
  const { cfg, contador } = ctx;
  const comParceiras = internacionalDe(pais, b.origem);
  const opcoes = { comParceiras, prazoS: cfg["smiles.prazo_s"], pausaMs: cfg["smiles.pausa_ms"], contador };
  const estMin = b.estadiaMin ?? 1;
  const estMax = Math.max(estMin, b.estadiaMax ?? estMin);

  const ida = await calendarioSmiles(b.origem, b.destino, p.de, p.ate, opcoes);
  let volta: Awaited<ReturnType<typeof calendarioSmiles>> | null = null;
  if (b.idaVolta) {
    await esperar(cfg["smiles.pausa_ms"]);
    volta = await calendarioSmiles(b.destino, b.origem, somarDias(p.de, estMin), somarDias(p.ate, estMax), opcoes);
  }
  await gravarLugares([...ida.lugares, ...(volta?.lugares ?? [])]);
  const destinoPais = ida.destinoPais ?? pais;
  const internacional = destinoPais ? destinoPais !== "Brasil" : comParceiras;

  // O histórico: todo dia, nos dois sentidos.
  const precos: PrecoNovo[] = [];
  const registrar = (o: string, d: string, dias: Map<string, DiaSmiles>) => {
    for (const [dia, v] of dias) {
      precos.push({
        fonteId: SMILES, tipo: "trecho", origem: o, destino: d, classe: "economica", mes: mesDe(dia),
        ida: dia, unidade: "milhas", valor: v.milhas, programaId: SMILES, companhia: v.parceira ? null : "G3",
      });
    }
  };
  registrar(b.origem, b.destino, ida.dias);
  if (volta) registrar(b.destino, b.origem, volta.dias);
  const nPrecos = await gravarPrecos(precos);

  // As combinações: para cada dia de ida, a volta mais barata dentro da estadia.
  type Combo = { ida: string; volta: string | null; milhas: number; parceira: boolean };
  const combos: Combo[] = [];
  for (const [dIda, vIda] of ida.dias) {
    if (!volta) {
      combos.push({ ida: dIda, volta: null, milhas: vIda.milhas, parceira: vIda.parceira });
      continue;
    }
    let melhor: Combo | null = null;
    for (let e = estMin; e <= estMax; e++) {
      const dVolta = somarDias(dIda, e);
      const vVolta = volta.dias.get(dVolta);
      if (!vVolta) continue;
      const total = vIda.milhas + vVolta.milhas;
      if (!melhor || total < melhor.milhas) {
        melhor = { ida: dIda, volta: dVolta, milhas: total, parceira: vIda.parceira || vVolta.parceira };
      }
    }
    if (melhor) combos.push(melhor);
  }
  // As K mais baratas de cada mês de embarque.
  const porMes = new Map<string, Combo[]>();
  for (const c of combos) {
    const m = mesDe(c.ida);
    if (!porMes.has(m)) porMes.set(m, []);
    porMes.get(m)!.push(c);
  }
  const escolhidos: Combo[] = [];
  for (const lista of porMes.values()) {
    lista.sort((a, c) => a.milhas - c.milhas || a.ida.localeCompare(c.ida));
    escolhidos.push(...lista.slice(0, cfg["smiles.combinacoes_por_mes"]));
  }

  const taxa = taxaEstimada(internacional, cfg);
  const ofertas: OfertaNova[] = escolhidos.map((c) => ({
    fonteId: SMILES,
    buscaId: b.id,
    tipo: "passagem",
    detalhe: "dia",
    origem: b.origem,
    destino: b.destino,
    destinoPais,
    internacional,
    mes: mesDe(c.ida),
    ida: c.ida,
    volta: c.volta,
    noites: c.volta ? diasEntre(c.ida, c.volta) : null,
    composicao: c.volta ? "soma_trechos" : "so_ida",
    classe: "economica",
    companhias: c.parceira ? [] : ["G3"],
    companhiaNome: c.parceira ? "parceira da Smiles" : "GOL",
    programaId: SMILES,
    milhas: c.milhas,
    taxasBrl: c.volta ? taxa : taxa / 2,
    taxasEstimadas: true,
    bagagem: "nao_informada",
    etiquetas: [],
    fornecedor: "Smiles",
    link: linkSmiles(b.origem, b.destino, c.ida, c.volta, false),
  }));
  const chaves = await gravarOfertas(ofertas, ctx.coletaId);
  const saiu = await desativarAusentes({
    fonteId: SMILES, detalhes: ["dia", "voo"], vistas: chaves, buscaId: b.id, classe: "economica",
    mesDe: mesDe(p.de), mesAte: mesDe(p.ate),
  });
  const menor = escolhidos.reduce((m, c) => Math.min(m, c.milhas), Number.POSITIVE_INFINITY);
  return {
    itens: chaves.length,
    historico: nPrecos,
    resumo:
      `${b.origem}→${b.destino} ${p.de}..${p.ate}: ${ida.dias.size} dias de ida, ${volta?.dias.size ?? 0} de volta; ` +
      `${chaves.length} combinações guardadas` +
      (Number.isFinite(menor) ? `, a menor com ${menor.toLocaleString("pt-BR")} milhas` : "") +
      (saiu ? `; ${saiu} saíram da vitrine` : ""),
  };
}

/** A taxa de ida e volta da Smiles: sempre ESTIMADA (Valores). A taxa real só
 *  sai da busca completa, que fica atrás do Akamai e não é usada. */
function taxaEstimada(internacional: boolean, cfg: ConfiguracaoDaColeta): number {
  return internacional ? cfg["smiles.taxa_estimada_internacional_brl"] : cfg["smiles.taxa_estimada_nacional_brl"];
}

// --- Melhores Destinos ---------------------------------------------------------

/** O código de cidade que o MD usa, para saber se um destino do mural já tem pedido. */
function cidadeMd(codigo: string): string {
  const mapa: Record<string, string> = {
    GRU: "SAO", CGH: "SAO", GIG: "RIO", SDU: "RIO", CNF: "BHZ", PLU: "BHZ", EZE: "BUE", AEP: "BUE",
    JFK: "NYC", EWR: "NYC", LGA: "NYC", LHR: "LON", LGW: "LON", CDG: "PAR", ORY: "PAR", FCO: "ROM",
    MXP: "MIL", LIN: "MIL",
  };
  return mapa[codigo] ?? codigo;
}

function tarefaMural(origem: string, soInternacional: boolean): Tarefa {
  return {
    fonteId: MD,
    tipo: "varredura",
    escopo: `mural:${origem}`,
    prioridade: 1,
    custoS: 40,
    rodar: async (ctx) => {
      const cidades = await cidadesDoMural(origem, {
        soInternacional, prazoS: ctx.cfg["md.prazo_s"], pausaMs: ctx.cfg["md.pausa_ms"], contador: ctx.contador,
      });
      muralEmMemoria.set(origem, { cidades, em: Date.now() });
      await gravarLugares(
        cidades.map((c) => ({ codigo: c.destino, cidade: c.cidade, ...regiaoDaCategoria(c.categoria) })),
      );
      return {
        itens: 0,
        historico: cidades.length, // os destinos achados no mural (o que esta coleta trouxe)
        resumo: `Mural de ${origem}: ${cidades.length} destinos${soInternacional ? " (só internacionais)" : ""}.`,
      };
    },
  };
}

function ofertasDoMd(
  origem: string,
  destino: string,
  buscaId: number | null,
  internacional: boolean,
  meses: MesPreco[],
  cidades: { origem: string | null; destino: string | null },
  datasPorMes: number,
  mesComDatas: string | null,
): { ofertas: OfertaNova[]; precos: PrecoNovo[] } {
  const ofertas: OfertaNova[] = [];
  const precos: PrecoNovo[] = [];
  const amanha = somarDias(hoje(), 1);
  for (const m of meses) {
    precos.push({
      fonteId: MD, tipo: "mes", origem, destino, classe: "economica", mes: m.mes, unidade: "brl", valor: m.preco,
    });
    const base = {
      fonteId: MD, buscaId, tipo: "passagem" as const, origem, origemCidade: cidades.origem, destino,
      destinoCidade: cidades.destino, internacional, classe: "economica" as const, etiquetas: [] as string[],
      fornecedor: null, composicao: "ida_volta" as const,
    };
    // O menor preço do mês — a vitrine mostra quando ainda não há datas do mês.
    ofertas.push({
      ...base, detalhe: "mes", mes: m.mes, precoBrl: m.preco, bagagem: "nao_informada", companhias: [],
      link: `https://www.melhoresdestinos.com.br/passagens-aereas`,
    });
    if (!m.datas || (mesComDatas && m.mes !== mesComDatas)) continue;
    const datas = m.datas.filter((d) => d.ida >= amanha && !d.programa).sort((a, b) => a.preco - b.preco);
    for (const d of datas.slice(0, 50)) {
      precos.push({
        fonteId: MD, tipo: "ida_volta", origem, destino, classe: "economica", mes: m.mes, ida: d.ida, volta: d.volta,
        unidade: "brl", valor: d.preco, companhia: d.companhia,
      });
    }
    for (const d of datas.slice(0, datasPorMes)) {
      ofertas.push({
        ...base,
        detalhe: "dia",
        mes: mesDe(d.ida),
        ida: d.ida,
        volta: d.volta,
        noites: d.estadia || diasEntre(d.ida, d.volta),
        companhias: d.companhia ? [d.companhia] : [],
        companhiaNome: nomeDaCompanhia(d.companhia),
        precoBrl: d.preco,
        bagagem: d.bagagem,
        fornecedor: d.fornecedor,
        link: d.link,
      });
    }
  }
  return { ofertas, precos };
}

function tarefaCidadeMd(c: CidadeMd): Tarefa {
  return {
    fonteId: MD,
    tipo: "datas",
    escopo: `rota:${c.origem}:${c.destino}`,
    prioridade: 1,
    custoS: 5,
    rodar: async (ctx) => {
      const r = await precosDaRota(c.origem, c.destino, {
        estadiaMin: ctx.cfg["md.estadia_min"], estadiaMax: ctx.cfg["md.estadia_max"],
        prazoS: ctx.cfg["md.prazo_s"], contador: ctx.contador,
      });
      await esperar(ctx.cfg["md.pausa_ms"]);
      const { ofertas, precos } = ofertasDoMd(
        c.origem, c.destino, null, c.internacional, r.meses,
        { origem: r.origemCidade, destino: r.destinoCidade ?? c.cidade }, ctx.cfg["md.datas_por_mes"], null,
      );
      const { regiao, pais } = regiaoDaCategoria(c.categoria);
      for (const o of ofertas) {
        o.destinoRegiao ??= regiao;
        o.destinoPais ??= pais;
      }
      const chaves = await gravarOfertas(ofertas, ctx.coletaId);
      const nPrecos = await gravarPrecos(precos);
      await desativarAusentes({
        fonteId: MD, detalhes: ["mes", "dia"], vistas: chaves, origem: c.origem, destino: c.destino, semBusca: true,
      });
      const menor = Math.min(...r.meses.map((m) => m.preco));
      return {
        itens: chaves.length,
        historico: nPrecos,
        resumo: `${c.origem}→${c.cidade}: ${r.meses.length} meses` + (Number.isFinite(menor) ? `, a partir de R$ ${menor}` : ""),
      };
    },
  };
}

function tarefaDatasMd(b: BuscaLinha, mes: string, cfg: ConfiguracaoDaColeta): Tarefa {
  return {
    fonteId: MD,
    tipo: "datas",
    escopo: `datas:${b.id}:${mes}`,
    buscaId: b.id,
    prioridade: 1,
    custoS: 5,
    rodar: async (ctx) => {
      const r = await precosDaRota(b.origem, b.destino, {
        mes,
        estadiaMin: b.estadiaMin ?? cfg["md.estadia_min"],
        estadiaMax: b.estadiaMax ?? cfg["md.estadia_max"],
        prazoS: ctx.cfg["md.prazo_s"],
        contador: ctx.contador,
      });
      await esperar(ctx.cfg["md.pausa_ms"]);
      const lugar = await prisma.lugar.findUnique({ where: { codigo: b.destino } });
      const internacional = internacionalDe(lugar?.pais ?? null, b.origem);
      // Cada chamada traz o menor preço de todos os meses e as datas só do mês pedido.
      const { ofertas, precos } = ofertasDoMd(
        b.origem, b.destino, b.id, internacional, r.meses,
        { origem: r.origemCidade, destino: r.destinoCidade }, ctx.cfg["md.datas_por_mes"], mes,
      );
      const chaves = await gravarOfertas(ofertas, ctx.coletaId);
      const nPrecos = await gravarPrecos(precos);
      await desativarAusentes({
        fonteId: MD, detalhes: ["dia"], vistas: chaves, buscaId: b.id, mesDe: mes, mesAte: mes,
      });
      await desativarAusentes({ fonteId: MD, detalhes: ["mes"], vistas: chaves, buscaId: b.id });
      const doMes = r.meses.find((m) => m.mes === mes);
      return {
        itens: chaves.length,
        historico: nPrecos,
        resumo:
          `${b.origem}→${b.destino} ${mes}: ` +
          (doMes ? `a partir de R$ ${doMes.preco}, ${doMes.datas?.length ?? 0} pares de datas` : "sem preço no mês"),
      };
    },
  };
}

function esperar(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const _paraTeste = { periodo, mesesDoHorizonte };
