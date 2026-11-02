import { prisma } from "@/lib/prisma";
import { lerConfiguracao } from "@/pacote/configuracao";
import { codigoDaCompanhia, nomeDaCompanhia } from "@/pacote/companhias";
import { diasEntre, hoje, mesDe, somarDias } from "@/pacote/datas";
import { desativarAusentes, gravarLugares, gravarOfertas, gravarPrecos } from "./gravar";
import type { LugarVisto, OfertaNova, PrecoNovo, Regime } from "./molde";
import { executar, fontePausada, fontesLigadas, ultimasColetas, vencimento, type Log, type Tarefa } from "./nucleo";
import {
  ENDERECO_CATIVA,
  chaveCrianca,
  lerVitrineCativa,
  semAcento,
  type PacoteCativa,
  type VitrineCativa,
} from "./fontes/cativa";

/**
 * A coleta de PACOTES de operadora (V1b), em cima do núcleo genérico — irmã de
 * `passagens.ts`. Hoje uma fonte: a Cativa, pela vitrine aberta dela.
 *
 * Uma leitura da página traz o catálogo inteiro, então é UMA tarefa (escopo
 * "vitrine") de `cativa.intervalo_horas` em `cativa.intervalo_horas`:
 * - pacotes prontos (aéreo + hotel) → `tipo = 'pacote'`, aba Pacotes;
 * - bloqueios aéreos (ida e volta) → `tipo = 'passagem'`, aba Passagens, com
 *   assentos restantes e "emitir até" (decisão do Saulo, 13/10).
 *
 * Saídas (decisão do Saulo, 14/10): as origens dos pedidos NACIONAIS (hoje
 * BSB) levam tudo; as demais origens dos pedidos (GRU, GIG) só internacional.
 * Preço: o total por pessoa COM a taxa (o que o cliente paga), em quarto duplo.
 */

const CATIVA = "cativa";
/** "Somente para Passagens Aéreas: parcelamento em até 6x sem juros" (Cativa). */
const PARCELAS_PASSAGEM_CATIVA = 6;
const HORA = 60 * 60_000;

export async function coletarPacotes(opcoes: { ate: number; log: Log }): Promise<string> {
  const cfg = await lerConfiguracao(["cativa.intervalo_horas", "coleta.pausa_apos_bloqueio_min"]);
  const fontes = await fontesLigadas();
  if (!fontes.has(CATIVA)) return "";
  if (await fontePausada(CATIVA, cfg["coleta.pausa_apos_bloqueio_min"])) return "Cativa: em pausa (recusou o acesso).";
  const v = vencimento((await ultimasColetas(CATIVA)).get("vitrine"), cfg["cativa.intervalo_horas"] * HORA);
  if (v === null) return "";
  const t = tarefaVitrineCativa(opcoes.log);
  if (Date.now() + t.custoS * 1000 > opcoes.ate) return "Cativa: fica para a próxima passada (sem tempo nesta).";
  const status = await executar(t, "agenda", opcoes.log);
  return `Cativa: ${status === "ok" ? "vitrine lida" : status}.`;
}

/** A tarefa (exportada para o teste manual: scripts/coletar-cativa.ts). */
export function tarefaVitrineCativa(log: Log): Tarefa {
  return {
    fonteId: CATIVA,
    tipo: "varredura",
    escopo: "vitrine",
    prioridade: 1,
    custoS: 30,
    rodar: async ({ contador, coletaId }) => {
      const cfg = await lerConfiguracao(["cativa.prazo_s", "cativa.pagina_parada_dias"]);
      const vitrine = await lerVitrineCativa({ prazoS: cfg["cativa.prazo_s"], contador });
      const saidas = await saidasPermitidas();
      const lugares = await lugaresPorNome();

      const pac = traduzirPacotes(vitrine, saidas, lugares);
      const blq = traduzirBloqueios(vitrine, saidas);
      await gravarLugares(blq.lugares);
      const chaves = await gravarOfertas([...pac.ofertas, ...blq.ofertas], coletaId);
      const nPrecos = await gravarPrecos(blq.precos);
      const saiu = await desativarAusentes({ fonteId: CATIVA, detalhes: ["dia", "voo"], vistas: chaves });

      const partes = [
        `${pac.ofertas.length} pacote(s) (${pac.ofertas.filter((o) => o.regime === "all_inclusive").length} all inclusive)`,
        `${blq.ofertas.length} bloqueio(s)`,
      ];
      if (pac.semAeroporto.size) partes.push(`${pac.semAeroporto.size} destino(s) de pacote sem aeroporto conhecido`);
      if (pac.datasInvalidas) partes.push(`${pac.datasInvalidas} saída(s) de pacote com datas inválidas na fonte (fora)`);
      if (saiu) partes.push(`${saiu} saíram da vitrine`);
      let resumo =
        `Cativa (${vitrine.mudou ? "página nova" : "página igual"}, publicada ${dataHora(vitrine.publicadaEm)}; ` +
        `bloqueios gerados em ${vitrine.voos.ger}): ${partes.join(", ")}.`;
      if (vitrine.publicadaEm) {
        const dias = (Date.now() - vitrine.publicadaEm.getTime()) / (24 * HORA);
        if (dias > cfg["cativa.pagina_parada_dias"]) {
          const aviso = `A página da Cativa não é republicada há ${Math.floor(dias)} dias.`;
          log.aviso(aviso);
          resumo = `⚠ ${aviso} ${resumo}`;
        }
      }
      if (pac.semAeroporto.size) log.info(`Cativa — pacotes sem aeroporto: ${[...pac.semAeroporto].slice(0, 30).join("; ")}`);
      return { itens: chaves.length, historico: nPrecos, resumo };
    },
  };
}

// --- de onde sai ------------------------------------------------------------

type Saidas = { nacional: Set<string>; internacional: Set<string> };

/** As origens dos pedidos de busca: nacionais levam tudo, as outras só internacional. */
async function saidasPermitidas(): Promise<Saidas> {
  const buscas = await prisma.busca.findMany({ where: { ligada: true }, select: { origem: true, destino: true } });
  const lugares = new Map(
    (await prisma.lugar.findMany({ where: { codigo: { in: buscas.map((b) => b.destino) } } })).map((l) => [l.codigo, l]),
  );
  const nacional = new Set<string>();
  const internacional = new Set<string>();
  for (const b of buscas) {
    internacional.add(b.origem);
    if ((lugares.get(b.destino)?.pais ?? "Brasil") === "Brasil") nacional.add(b.origem);
  }
  return { nacional, internacional };
}

const pode = (s: Saidas, origem: string, ehInternacional: boolean) =>
  ehInternacional ? s.internacional.has(origem) : s.nacional.has(origem);

// --- destino do pacote → aeroporto -------------------------------------------

/** Cidade (sem acento) → código do aeroporto, do cadastro de lugares. */
async function lugaresPorNome(): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  for (const l of await prisma.lugar.findMany({ select: { codigo: true, cidade: true } })) {
    const n = semAcento(l.cidade);
    if (!mapa.has(n)) mapa.set(n, l.codigo);
  }
  return mapa;
}

/**
 * Destinos de praia/serra que o pacote nomeia e que não são cidade de
 * aeroporto: o aeroporto por onde a Cativa chega. Referência geográfica (como
 * os nomes de companhia), não configuração.
 */
const AEROPORTO_DO_DESTINO: Record<string, string> = {
  "porto de galinhas": "REC", "carneiros": "REC", "serrambi": "REC", "cabo de santo agostinho": "REC",
  "maragogi": "MCZ", "barra de sao miguel": "MCZ", "sao miguel dos milagres": "MCZ", "ipioca": "MCZ", "japaratinga": "MCZ",
  "mata de sao joao": "SSA", "praia do forte": "SSA", "imbassai": "SSA", "costa do sauipe": "SSA",
  "morro de sao paulo": "SSA", "camacari": "SSA",
  "itacare": "IOS", "comandatuba": "IOS",
  "arraial d'ajuda": "BPS", "arraial dajuda": "BPS", "trancoso": "BPS", "caraiva": "BPS", "santa cruz cabralia": "BPS",
  "pipa": "NAT", "sao miguel do gostoso": "NAT", "galinhos": "NAT",
  "jericoacoara": "JJD", "canoa quebrada": "FOR", "cumbuco": "FOR", "beberibe": "FOR", "aquiraz": "FOR",
  "gramado": "POA", "canela": "POA", "serra gaucha": "POA", "bento goncalves": "POA",
  "balneario camboriu": "NVT", "beto carrero": "NVT",
  "rio quente": "CLV", "caldas novas": "CLV", "bonito": "BYO",
  "fernando de noronha": "FEN", "chapada dos guimaraes": "CGB", "buzios": "GIG", "angra dos reis": "GIG",
  "aparecida": "GRU", "campos do jordao": "GRU",
};

function resolverDestino(
  destino: string,
  vitrine: VitrineCativa,
  lugares: Map<string, string>,
): { codigo: string | null; nome: string } {
  const m = destino.match(/\(([A-Z]{3})\)/);
  const nome = nomeDoDestino(destino);
  if (m) return { codigo: m[1], nome };
  const n = semAcento(nome);
  for (const [iata, [cidadeAeroporto, turistico]] of Object.entries(vitrine.voos.mapa)) {
    if (semAcento(turistico) === n || semAcento(cidadeAeroporto) === n) return { codigo: iata, nome };
  }
  const codigo = vitrine.destinoFix.get(n) ?? AEROPORTO_DO_DESTINO[n] ?? lugares.get(n) ?? null;
  return { codigo, nome };
}

/** "PORTO SEGURO (BPS)" → "Porto Seguro"; "Arraial D'Ajuda - BA" → "Arraial D'Ajuda". */
function nomeDoDestino(destino: string): string {
  let s = destino.replace(/\([A-Z]{3}\)/g, "").replace(/\s+-\s+[A-Z]{2}\s*$/, "").trim();
  if (s === s.toUpperCase()) {
    s = s
      .toLowerCase()
      .replace(/(^|\s)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())
      .replace(/\s(De|Da|Do|Das|Dos|E)\s/g, (x) => x.toLowerCase());
  }
  return s;
}

// --- pacotes ----------------------------------------------------------------

function traduzirPacotes(vitrine: VitrineCativa, saidas: Saidas, lugares: Map<string, string>) {
  const ofertas: OfertaNova[] = [];
  const semAeroporto = new Set<string>();
  let datasInvalidas = 0;
  const amanha = somarDias(hoje(), 1);
  for (const p of vitrine.pacotes) {
    const internacional = p.categoria === "Internacional";
    for (const s of p.origens ?? []) {
      if (!pode(saidas, s.iata, internacional)) continue;
      const [ini, fim] = String(s.data ?? "").split(/\s+a\s+/);
      const ida = isoDe(ini);
      const volta = voltaCoerente(ida, isoDe(fim));
      if (!ida || ida < amanha) continue;
      if (!volta) {
        datasInvalidas++;
        continue;
      }
      const destino = resolverDestino(p.destino, vitrine, lugares);
      // Pacote de vários destinos às vezes traz a cidade de SAÍDA no destino.
      if (!destino.codigo || destino.codigo === s.iata) {
        semAeroporto.add(p.destino);
        continue;
      }
      for (const h of s.hoteis ?? []) {
        const o = ofertaDePacote(p, s, h, { ida, volta, internacional, destino: { codigo: destino.codigo, nome: destino.nome }, vitrine });
        if (o) ofertas.push(o);
      }
    }
  }
  return { ofertas, semAeroporto, datasInvalidas };
}

function ofertaDePacote(
  p: PacoteCativa,
  s: PacoteCativa["origens"][number],
  h: PacoteCativa["origens"][number]["hoteis"][number],
  x: { ida: string; volta: string; internacional: boolean; destino: { codigo: string; nome: string }; vitrine: VitrineCativa },
): OfertaNova | null {
  const preco = reais(h.preco);
  if (!preco) return null;
  const taxa = reais(h.taxas) ?? 0;
  const hotel = h.nome.replace(/\s{2,}.*/, "").trim();
  const regime = regimeDe(h.regime) ?? (/all inclusive/i.test(hotel) ? "all_inclusive" : null);
  const crianca = x.vitrine.criancas.get(chaveCrianca(p.nome, s.iata, h.nome)) ?? null;
  const etiquetas: string[] = [];
  if (crianca) etiquetas.push("crianca_gratis");
  return {
    fonteId: CATIVA,
    tipo: "pacote",
    detalhe: "dia",
    origem: s.iata,
    origemCidade: s.cidade || null,
    destino: x.destino.codigo,
    // O destino do PACOTE (Porto de Galinhas), não a cidade do aeroporto (Recife).
    destinoCidade: x.destino.nome,
    internacional: x.internacional,
    mes: mesDe(x.ida),
    ida: x.ida,
    volta: x.volta,
    noites: diasEntre(x.ida, x.volta),
    composicao: "ida_volta",
    classe: "economica",
    companhias: [],
    precoBrl: centavos(preco + taxa),
    taxasBrl: taxa,
    parcelasFonte: parcelasDe(h.parcela),
    bagagem: "nao_informada",
    hotelNome: hotel,
    regime,
    // "Cotação em quarto duplo": o preço é por pessoa, para 2 no quarto.
    adultos: 2,
    criancas: 0,
    aceitaCrianca: crianca ? true : null,
    etiquetas,
    fornecedor: "Cativa",
    // O orçamento do pacote no sistema da Cativa (o "Abrir na Cativa" da vitrine);
    // sem ele, a página do pacote na vitrine aberta.
    link: s.link || linkDaVitrine(p.slug, s.iata),
    localizador: {
      pacote: p.src || p.nome,
      nome: p.nome,
      slug: p.slug,
      destinoTexto: p.destino,
      origem: s.iata,
      ida: x.ida,
      volta: x.volta,
      hotel,
    },
    dadosFonte: {
      inclui: s.inclui ?? [],
      outrasDatas: String(s.outras ?? "").split(/[;,]/).map((d) => d.trim()).filter(Boolean),
      promo: h.promo || null,
      regimeTexto: h.regime || null,
      cotadoEm: s.divulgacao || null,
      criancaGratis: crianca,
      aereo: { de: reais(s.de), por: reais(s.por) },
      vitrine: linkDaVitrine(p.slug, s.iata),
    },
  };
}

/** O regime como a casa entende (molde), a partir do texto da Cativa. */
export function regimeDe(texto: string | null | undefined): Regime | null {
  const t = semAcento(texto ?? "");
  if (!t) return null;
  if (t.includes("all inclusive")) return "all_inclusive";
  if (/pensao completa|\bfap\b/.test(t)) return "pensao_completa";
  if (/meia pensao|\bmap\b/.test(t)) return "meia_pensao";
  if (/so hospedagem|somente hospedagem|sem cafe|somente apartamento/.test(t)) return "sem_refeicao";
  if (t.includes("cafe")) return "cafe";
  return null;
}

// --- bloqueios aéreos ---------------------------------------------------------

function traduzirBloqueios(vitrine: VitrineCativa, saidas: Saidas) {
  const ofertas: OfertaNova[] = [];
  const precos: PrecoNovo[] = [];
  const lugares: LugarVisto[] = [];
  const amanha = somarDias(hoje(), 1);
  const hojeIso = hoje();
  const { mapa } = vitrine.voos;
  for (const linha of vitrine.voos.blob.split("\n")) {
    if (!linha) continue;
    // 16 campos: origem|destino|ida|volta|noites|assentos|tarifa|tarifaEmDolar|prazo|
    //            idaSai|idaChega|voltaSai|voltaChega|taxa|nacional|companhia
    const c = linha.split("|");
    const nacional = c[14] === "1";
    if (!pode(saidas, c[0], !nacional)) continue;
    const ida = isoCurto(c[2]);
    const volta = isoCurto(c[3]);
    const prazo = isoCurto(c[8]);
    if (!ida || !volta || ida < amanha) continue;
    if (prazo && prazo < hojeIso) continue;
    const assentos = Number(c[5]);
    if (!(assentos > 0)) continue;
    const tarifa = c[7] === "1" ? Number(c[6]) * vitrine.voos.usd : Number(c[6]);
    if (!(tarifa > 0)) continue;
    const taxa = c[13] ? Number(c[13]) : 0;
    const codigo = codigoDaCompanhia(c[15]);
    const preco = centavos(tarifa + taxa);
    const [cidadeAeroporto, turistico] = mapa[c[1]] ?? [null, null];
    if (cidadeAeroporto) lugares.push({ codigo: c[1], cidade: cidadeAeroporto });
    const idaH = horario(ida, c[9], c[10]);
    const voltaH = horario(volta, c[11], c[12]);
    ofertas.push({
      fonteId: CATIVA,
      tipo: "passagem",
      detalhe: "voo",
      origem: c[0],
      origemCidade: mapa[c[0]]?.[0] ?? null,
      destino: c[1],
      destinoCidade: cidadeAeroporto,
      internacional: !nacional,
      mes: mesDe(ida),
      ida,
      volta,
      noites: Number(c[4]) || diasEntre(ida, volta),
      composicao: "ida_volta",
      classe: "economica",
      companhias: codigo ? [codigo] : [],
      companhiaNome: codigo ? nomeDaCompanhia(codigo) : c[15] || null,
      precoBrl: preco,
      // As condições de pagamento da Cativa (no orçamento dela): "somente para
      // Passagens Aéreas: parcelamento em até 6x sem juros" (pacote: 10x).
      parcelasFonte: PARCELAS_PASSAGEM_CATIVA,
      taxasBrl: taxa,
      bagagem: "nao_informada",
      idaSaida: idaH.saida,
      idaChegada: idaH.chegada,
      voltaSaida: voltaH.saida,
      voltaChegada: voltaH.chegada,
      assentos,
      // A página só dá o DIA do prazo; a hora exata vem do portal, na
      // conferência. Até lá, o começo do dia (do lado seguro).
      emitirAte: prazo ? `${prazo}T00:00:00-03:00` : null,
      etiquetas: ["bloqueio"],
      fornecedor: "Cativa (bloqueio)",
      link: ENDERECO_CATIVA,
      localizador: { tipo: "bloqueio", origem: c[0], destino: c[1], ida, volta, idaSai: c[9] || null, tarifa },
      dadosFonte: { destinoTuristico: turistico, geradoEm: vitrine.voos.ger, linha },
    });
    precos.push({
      fonteId: CATIVA, tipo: "ida_volta", origem: c[0], destino: c[1], classe: "economica", mes: mesDe(ida),
      ida, volta, unidade: "brl", valor: preco, companhia: codigo,
    });
  }
  return { ofertas, precos, lugares };
}

/** "0900","1100" no dia "2026-12-02" → hora local; chegada antes da saída = dia seguinte. */
function horario(dia: string, sai: string, chega: string): { saida: string | null; chegada: string | null } {
  const h = (s: string) => (s && s.length === 4 ? `${s.slice(0, 2)}:${s.slice(2)}:00` : null);
  const hs = h(sai);
  const hc = h(chega);
  return {
    saida: hs ? `${dia}T${hs}` : null,
    chegada: hc ? `${hs && hc < hs ? somarDias(dia, 1) : dia}T${hc}` : null,
  };
}

// --- miúdos -------------------------------------------------------------------

const centavos = (v: number) => Math.round(v * 100) / 100;

function reais(s: string | null | undefined): number | null {
  const m = String(s ?? "").match(/([\d.]+,\d{2}|[\d.]+)/);
  if (!m) return null;
  const v = Number(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : null;
}

function parcelasDe(s: string | null | undefined): number | null {
  const m = String(s ?? "").match(/(\d+)\s*x/i);
  return m ? Number(m[1]) : null;
}

/** "17/11/2026" → "2026-11-17". */
function isoDe(dmy: string | undefined): string | null {
  const m = String(dmy ?? "").match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (!m) return null;
  return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2]}-${m[1]}`;
}

/** "261202" → "2026-12-02". */
const isoCurto = (s: string) => (s && s.length === 6 ? `20${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}` : null);

function dataHora(d: Date | null): string {
  if (!d) return "em data desconhecida";
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/**
 * A volta, se fizer sentido (1 a 30 noites). A página da Cativa tem erros de
 * digitação ("12/12/2026 a 09/12/2026"); na virada do ano, um ano a mais na
 * volta resolve. Fora disso, a saída fica fora — nunca uma data inventada.
 */
function voltaCoerente(ida: string | null, volta: string | null): string | null {
  if (!ida || !volta) return null;
  const ok = (v: string) => {
    const n = diasEntre(ida, v);
    return n >= 1 && n <= 30;
  };
  if (ok(volta)) return volta;
  const anoSeguinte = `${Number(volta.slice(0, 4)) + 1}${volta.slice(4)}`;
  return volta < ida && ok(anoSeguinte) ? anoSeguinte : null;
}

const linkDaVitrine = (slug: string, saida: string) => `${ENDERECO_CATIVA}#pacote=${encodeURIComponent(slug)}&saida=${saida}`;
