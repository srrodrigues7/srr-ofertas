import { falhaSimulada, pedirJson, type Contador } from "../http";
import type { LugarVisto } from "../molde";

/**
 * Conector da Smiles. Ficha completa: docs/fontes/smiles.md.
 *
 * Só o CALENDÁRIO (degrau 2, requisição simples): o menor preço em milhas
 * Clube de cada dia, num sentido, para um intervalo de meses — numa chamada
 * só. É aberto: a própria configuração pública da Smiles não o põe na lista
 * de endereços protegidos. Não traz voo, horário, bagagem, taxa nem
 * executiva: a taxa é ESTIMADA (Valores) e a tela diz isso.
 *
 * A busca completa e a taxa de embarque ficam atrás do Akamai (proteção
 * anti-robô) e NÃO são usadas: escolher um jeito de acesso porque ele passa
 * pela proteção é contorná-la (regra da casa, 00-contexto.md §4). O caminho
 * legítimo é a Smiles liberar acesso — o pedido está na ficha.
 *
 * Na Smiles, em milhas, ida e volta é cobrado por trecho: a soma dos dois
 * trechos É o preço do ida-e-volta (conferido: 28 dias, zero diferença).
 */

const FONTE = "smiles";
const ENV_URL = "https://www.smiles.com.br/mfe-apps/check-env.txt";
const CALENDARIO = (env: string) => `https://api-air-calendar-${env}.smiles.com.br/v1/airlines/calendar/month`;

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

