import type { Browser, Page } from "playwright-core";
import { mensagemDe } from "@/lib/erros";
import { FonteRecusou, falhaSimulada, pedirJson, type Contador } from "../http";
import type { Bagagem, LugarVisto } from "../molde";

/**
 * Conector da Smiles. Ficha completa: docs/fontes/smiles.md.
 *
 * Dois caminhos, cada um no degrau mais alto que a Smiles permite:
 *
 * 1. CALENDÁRIO (degrau 2, requisição simples): o menor preço em milhas Clube
 *    de cada dia, num sentido, para um intervalo de meses — numa chamada só.
 *    Não traz voo, horário, bagagem, taxa nem executiva. É aberto: a própria
 *    configuração pública da Smiles não o põe na lista de endereços protegidos.
 *
 * 2. DETALHE (degrau 4): a busca completa e a taxa de embarque ficam atrás do
 *    Akamai, que recusa quem não é navegador. O motor abre UMA janela do Edge
 *    na página inicial da Smiles e faz as buscas pelo endpoint de dentro dela,
 *    como uma extensão faria. Sem disfarce: navegador comum, com janela.
 *
 * Na Smiles, em milhas, ida e volta é cobrado por trecho: a soma dos dois
 * trechos É o preço do ida-e-volta (conferido: 28 dias, zero diferença).
 */

const FONTE = "smiles";
const ENV_URL = "https://www.smiles.com.br/mfe-apps/check-env.txt";
const CONFIG_PUBLICA = (env: string) =>
  `https://ldrelay-${env}.smiles.com.br/sdk/evalx/5ff64893991a4c0aa4974fc7/users/eyJrZXkiOiJHUkVFTiJ9`;
const CALENDARIO = (env: string) => `https://api-air-calendar-${env}.smiles.com.br/v1/airlines/calendar/month`;
const BUSCA = (env: string) => `https://api-air-flightsearch-${env}.smiles.com.br/v1/airlines/search`;
const TAXA = (env: string) => `https://api-airlines-boarding-tax-${env}.smiles.com.br/v1/airlines/flight/boardingtax`;

// --- ambiente (a Smiles alterna entre "green" e "blue") ----------------------

let ambiente: { nome: string; em: number } | null = null;

async function ambienteDaSmiles(prazoS: number, contador: Contador): Promise<string> {
  if (ambiente && Date.now() - ambiente.em < 60 * 60_000) return ambiente.nome;
  falhaSimulada(FONTE);
  contador.requisicoes++;
  const r = await fetch(ENV_URL, { signal: AbortSignal.timeout(prazoS * 1000) });
  const nome = (await r.text()).trim().toLowerCase();
  if (!r.ok || !/^[a-z]{3,10}$/.test(nome)) throw new Error(`Não reconheci o ambiente da Smiles ("${nome.slice(0, 20)}").`);
  ambiente = { nome, em: Date.now() };
  return nome;
}

// --- 1. calendário ---------------------------------------------------------

type DiaCalendario = { date: string; miles?: number; fare?: { type?: string } };
type Aeroporto = { code?: string; city?: string; country?: string };
type RespostaCalendario = {
  resultType?: string;
  hasCongener?: boolean;
  calendarSegmentList?: {
    departure?: { airport?: Aeroporto };
    arrival?: { airport?: Aeroporto };
    calendarDayList?: DiaCalendario[];
  }[];
};

export type DiaSmiles = { milhas: number; parceira: boolean };

/**
 * O menor preço (milhas Clube, só ida, por pessoa) de cada dia entre `de` e
 * `ate`. Com `comParceiras`, consulta também as companhias parceiras e fica
 * com o menor de cada dia.
 */
export async function calendarioSmiles(
  origem: string,
  destino: string,
  de: string,
  ate: string,
  opcoes: { comParceiras: boolean; prazoS: number; pausaMs: number; contador: Contador },
): Promise<{ dias: Map<string, DiaSmiles>; lugares: LugarVisto[]; destinoPais: string | null }> {
  const env = await ambienteDaSmiles(opcoes.prazoS, opcoes.contador);
  const dias = new Map<string, DiaSmiles>();
  const lugares: LugarVisto[] = [];
  let destinoPais: string | null = null;

  // A Smiles deixa vazio o mês cujo início não é o dia 1 (conferido): pede
  // sempre do dia 1 e descarta os dias antes de `de`.
  const inicio = `${de.slice(0, 7)}-01`;
  for (const parceira of opcoes.comParceiras ? [false, true] : [false]) {
    const q = new URLSearchParams({
      originAirportCode: origem,
      destinationAirportCode: destino,
      departureDate: de,
      adults: "1",
      children: "0",
      infants: "0",
      forceCongener: String(parceira),
      cabin: "ALL",
      startDate: inicio,
      endDate: ate,
    });
    const r = await pedirJson<RespostaCalendario>(`${CALENDARIO(env)}?${q}`, {
      fonteId: FONTE,
      prazoS: opcoes.prazoS,
      contador: opcoes.contador,
    });
    const seg = r.calendarSegmentList?.[0];
    for (const a of [seg?.departure?.airport, seg?.arrival?.airport]) {
      if (a?.code && a.city) lugares.push({ codigo: a.code, cidade: a.city, pais: a.country ?? null });
    }
    destinoPais ??= seg?.arrival?.airport?.country ?? null;
    for (const d of seg?.calendarDayList ?? []) {
      if (!d.date || !d.miles || d.miles <= 0 || d.date < de || d.date > ate) continue;
      const atual = dias.get(d.date);
      if (!atual || d.miles < atual.milhas) dias.set(d.date, { milhas: d.miles, parceira: r.resultType === "congener" });
    }
    if (opcoes.comParceiras && !parceira) await new Promise((res) => setTimeout(res, opcoes.pausaMs));
  }
  return { dias, lugares, destinoPais };
}

/** O link da busca na Smiles para a equipe conferir (abre o site normal). */
export function linkSmiles(origem: string, destino: string, ida: string, volta: string | null, executiva: boolean) {
  const ms = (d: string) => Date.parse(`${d}T15:00:00Z`); // meio-dia em Brasília
  const q = new URLSearchParams({
    adults: "1",
    cabin: executiva ? "BUSINESS" : "ALL",
    children: "0",
    departureDate: String(ms(ida)),
    ...(volta ? { returnDate: String(ms(volta)) } : {}),
    infants: "0",
    isElegible: "false",
    isFlexibleDateChecked: "false",
    originAirport: origem,
    destinationAirport: destino,
    tripType: volta ? "1" : "2",
    searchType: "g3",
    segments: "1",
  });
  return `https://www.smiles.com.br/mfe/emissao-passagem/?${q}`;
}

// --- 2. detalhe, de dentro do Edge -------------------------------------------

type Tarifa = { type: string; miles: number; money: number; uid: string; g3?: { costTax?: string } };
type VooBruto = {
  uid: string;
  cabin: string;
  stops: number;
  availableSeats?: number;
  airlineFlightMoney?: number;
  departure: { date: string; airport?: Aeroporto };
  arrival: { date: string; airport?: Aeroporto };
  airline: { code: string; name?: string };
  baggage?: { free?: string; quantity?: string | number };
  duration?: { hours: number; minutes: number };
  legList?: { flightNumber: string; marketingAirline?: { code: string } }[];
  fareList: Tarifa[];
};

/** Um voo, só ida, já traduzido. */
export type VooSmiles = {
  saida: string;
  chegada: string;
  paradas: number;
  duracaoMin: number | null;
  voos: string;
  companhia: string;
  companhiaNome: string | null;
  classe: string;
  bagagem: Bagagem;
  bagagemQtd: number | null;
  assentos: number | null;
  milhasClube: number | null;
  milhasNormal: number | null;
  /** A taxa, quando já vem na busca (voos da GOL). Parceiras: pedir à parte. */
  taxa: number | null;
  /** Quanto a companhia cobra em dinheiro pelo mesmo voo. */
  dinheiro: number | null;
  uid: string;
  tarifaClubeUid: string | null;
  lugares: LugarVisto[];
};

function traduzirVoo(v: VooBruto): VooSmiles {
  const clube = v.fareList.find((f) => f.type === "SMILES_CLUB");
  const normal = v.fareList.find((f) => f.type === "SMILES");
  const dinheiro = v.fareList.find((f) => f.type === "MONEY");
  const custoTaxa = Number(clube?.g3?.costTax ?? normal?.g3?.costTax);
  const qtd = Number(v.baggage?.quantity ?? 0);
  const despachada = v.baggage?.free === "true" && qtd > 0;
  const lugares: LugarVisto[] = [];
  for (const a of [v.departure.airport, v.arrival.airport]) {
    if (a?.code && a.city) lugares.push({ codigo: a.code, cidade: a.city, pais: a.country ?? null });
  }
  return {
    saida: v.departure.date,
    chegada: v.arrival.date,
    paradas: v.stops,
    duracaoMin: v.duration ? v.duration.hours * 60 + v.duration.minutes : null,
    voos: (v.legList ?? [])
      .map((l) => `${l.marketingAirline?.code ?? v.airline.code} ${l.flightNumber}`)
      .join(" + "),
    companhia: v.airline.code,
    companhiaNome: v.airline.name?.replace(/\s*\([A-Z0-9]{2}\)$/, "") ?? null,
    classe: v.cabin,
    bagagem: despachada ? "despachada" : "so_mao",
    bagagemQtd: despachada ? qtd : 0,
    assentos: v.availableSeats ?? null,
    milhasClube: clube?.miles || null,
    milhasNormal: normal?.miles || null,
    taxa: Number.isFinite(custoTaxa) && custoTaxa > 0 ? custoTaxa : null,
    dinheiro: dinheiro?.money || v.airlineFlightMoney || null,
    uid: v.uid,
    tarifaClubeUid: clube?.uid ?? null,
    lugares,
  };
}

/** O melhor voo de uma lista: menos milhas Clube; empate, menos paradas; depois o mais curto. */
export function melhorVoo(voos: VooSmiles[]): VooSmiles | null {
  const comPreco = voos.filter((v) => v.milhasClube);
  comPreco.sort(
    (a, b) =>
      a.milhasClube! - b.milhasClube! ||
      a.paradas - b.paradas ||
      (a.duracaoMin ?? 9e9) - (b.duracaoMin ?? 9e9),
  );
  return comPreco[0] ?? null;
}

// O código que roda DENTRO da página vai como texto: o compilador acrescenta
// auxiliares às funções que não existem lá dentro.
const PEDIR_NA_PAGINA = `async (a) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), a.prazoMs);
  try {
    const res = await fetch(a.url, { headers: a.cabecalhos, credentials: a.comCookies ? "include" : "omit", signal: ctl.signal });
    return { status: res.status, corpo: await res.text() };
  } catch (e) {
    return { status: 0, corpo: String(e && e.message || e) };
  } finally { clearTimeout(t); }
}`;

/**
 * Uma janela do Edge aberta na Smiles. Abre na primeira busca, fecha no fim da
 * passada — aconteça o que acontecer (lição 9: navegador sempre devolvido).
 */
export class NavegadorSmiles {
  private navegador: Browser | null = null;
  private pagina: Page | null = null;
  private chave: string | null = null;
  private env: string | null = null;
  /** Quantas buscas este navegador fez (vai para o resumo da coleta). */
  buscas = 0;

  constructor(private readonly prazoS: number) {}

  private async abrir(contador: Contador): Promise<Page> {
    if (this.pagina) return this.pagina;
    falhaSimulada(FONTE);
    this.env = await ambienteDaSmiles(this.prazoS, contador);
    // A chave pública da busca: a mesma que a página lê, do mesmo lugar público.
    contador.requisicoes++;
    const cfg = await fetch(CONFIG_PUBLICA(this.env), { signal: AbortSignal.timeout(this.prazoS * 1000) }).then((r) =>
      r.json(),
    );
    this.chave = acharChave(cfg);
    if (!this.chave) throw new Error("Não achei a chave pública de busca na configuração da Smiles.");

    const { chromium } = await import("playwright-core");
    this.navegador = await chromium.launch({
      channel: "msedge",
      headless: false, // sem janela o Akamai recusa — e não disfarçamos
      args: ["--start-minimized"],
      timeout: this.prazoS * 1000,
    });
    const pagina = await this.navegador.newPage();
    contador.requisicoes++;
    await pagina.goto("https://www.smiles.com.br/home", { timeout: 60_000, waitUntil: "domcontentloaded" });
    // O tempo de a página se apresentar ao Akamai, como faria com uma pessoa.
    await pagina.waitForTimeout(6_000);
    this.pagina = pagina;
    return pagina;
  }

  private async pedir(url: string, comChave: boolean, contador: Contador) {
    const pagina = await this.abrir(contador);
    contador.requisicoes++;
    this.buscas++;
    const cabecalhos: Record<string, string> = { Accept: "application/json, text/plain, */*", Channel: "WEB" };
    if (comChave && this.chave) cabecalhos["x-api-key"] = this.chave;
    const args = { url, cabecalhos, comCookies: !comChave, prazoMs: this.prazoS * 1000 };
    const r = (await Promise.race([
      pagina.evaluate(`(${PEDIR_NA_PAGINA})(${JSON.stringify(args)})`),
      new Promise((_, rej) => setTimeout(() => rej(new Error("A página da Smiles não respondeu a tempo.")), (this.prazoS + 5) * 1000)),
    ])) as { status: number; corpo: string };
    if (r.status === 403 || r.status === 406 || r.status === 429) {
      throw new FonteRecusou(r.status, `A Smiles recusou a busca de dentro do navegador (HTTP ${r.status}).`);
    }
    if (r.status !== 200) throw new Error(`Busca na Smiles falhou (HTTP ${r.status}): ${r.corpo.slice(0, 150)}`);
    return JSON.parse(r.corpo) as unknown;
  }

  /** Voos de um dia, só ida. */
  async buscar(
    origem: string,
    destino: string,
    data: string,
    opcoes: { executiva: boolean; parceiras: boolean; contador: Contador },
  ): Promise<VooSmiles[]> {
    const q = new URLSearchParams({
      cabin: opcoes.executiva ? "BUSINESS" : "ALL",
      originAirportCode: origem,
      destinationAirportCode: destino,
      departureDate: data,
      memberNumber: "",
      adults: "1",
      children: "0",
      infants: "0",
      forceCongener: String(opcoes.parceiras),
    });
    await this.abrir(opcoes.contador);
    const d = (await this.pedir(`${BUSCA(this.env!)}?${q}`, true, opcoes.contador)) as {
      requestedFlightSegmentList?: { flightList?: VooBruto[] }[];
    };
    const voos = (d.requestedFlightSegmentList?.[0]?.flightList ?? []).map(traduzirVoo);
    return opcoes.executiva ? voos.filter((v) => v.classe === "BUSINESS") : voos;
  }

  /** A taxa de embarque completa de um voo (por pessoa), em reais. */
  async taxa(voo: VooSmiles, contador: Contador): Promise<number | null> {
    if (voo.taxa != null) return voo.taxa;
    if (!voo.tarifaClubeUid) return null;
    const q = new URLSearchParams({
      type: "SEGMENT_1",
      uid: voo.uid,
      fareuid: voo.tarifaClubeUid,
      adults: "1",
      children: "0",
      infants: "0",
    });
    await this.abrir(contador);
    const d = (await this.pedir(`${TAXA(this.env!)}?${q}`, false, contador)) as {
      totals?: { totalBoardingTax?: { money?: number } };
    };
    const valor = d.totals?.totalBoardingTax?.money;
    return typeof valor === "number" && valor >= 0 ? valor : null;
  }

  async fechar(): Promise<void> {
    const n = this.navegador;
    this.navegador = null;
    this.pagina = null;
    if (!n) return;
    try {
      await Promise.race([n.close(), new Promise((r) => setTimeout(r, 10_000))]);
    } catch (e) {
      console.warn(`Não consegui fechar o Edge com calma: ${mensagemDe(e)}`);
    }
  }
}

function acharChave(o: unknown): string | null {
  if (o && typeof o === "object") {
    const r = o as Record<string, unknown>;
    if (typeof r.flightSearchApiKey === "string") return r.flightSearchApiKey;
    for (const v of Object.values(r)) {
      const k = acharChave(v);
      if (k) return k;
    }
  }
  return null;
}
