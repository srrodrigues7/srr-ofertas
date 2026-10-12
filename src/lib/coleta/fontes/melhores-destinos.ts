import { pedirJson, type Contador } from "../http";
import type { Bagagem } from "../molde";

/**
 * Conector do Melhores Destinos. Ficha completa: docs/fontes/melhores-destinos.md.
 *
 * Degrau 2: o "mural" de passagens que o MD achou nas últimas 24 h, pelo
 * endpoint aberto que a própria página usa. Ida e volta REAL (o par de datas
 * vendido junto), em reais, por pessoa: por mês o menor preço e, para um mês
 * por vez, as datas (ida, volta, estadia), companhia, bagagem e onde comprar.
 * Não traz horário, voo, conexões nem assentos.
 */

const BASE = "https://passagensaereas.melhoresdestinos.com.br/api/v1/twd/web";
const FONTE = "melhores_destinos";

export type CidadeMd = {
  origem: string;
  /** Código que o MD usa (aeroporto ou cidade: SAO, RIO, BHZ…). */
  destino: string;
  cidade: string;
  /** A categoria do mural: "Brasil", "Europa", "América do Sul"… */
  categoria: string;
  /** "Brasil" é a única categoria nacional. */
  internacional: boolean;
};

type No = {
  name?: string;
  to_name?: string;
  link?: string;
  categories?: No[];
  cities?: { to_city_name: string; link: string }[];
};

/**
 * As cidades que o mural tem para uma origem, andando pelas categorias (a
 * Europa, por exemplo, tem subcategorias). Algumas dezenas de requisições.
 */
export async function cidadesDoMural(
  origem: string,
  opcoes: { soInternacional: boolean; prazoS: number; pausaMs: number; contador: Contador },
): Promise<CidadeMd[]> {
  const pedir = (url: string) => pedirJson<No>(url, { fonteId: FONTE, prazoS: opcoes.prazoS, contador: opcoes.contador });
  const raiz = await pedir(`${BASE}/categories?from_iata_code=${encodeURIComponent(origem)}`);
  const saida: CidadeMd[] = [];
  const vistos = new Set<string>();

  async function andar(no: No, categoria: string, profundidade: number) {
    for (const c of no.cities ?? []) {
      const m = /itinerary_prices\/([A-Z]{3})\/([A-Z]{3})/.exec(c.link);
      if (!m || vistos.has(m[2])) continue;
      vistos.add(m[2]);
      saida.push({
        origem,
        destino: m[2],
        cidade: c.to_city_name,
        categoria,
        internacional: categoria !== "Brasil",
      });
    }
    if (profundidade > 3) return;
    for (const sub of no.categories ?? []) {
      if (!sub.link) continue;
      await new Promise((r) => setTimeout(r, opcoes.pausaMs));
      await andar(await pedir(sub.link), categoria, profundidade + 1);
    }
  }

  for (const cat of raiz.categories ?? []) {
    const nome = cat.name ?? "?";
    if (opcoes.soInternacional && nome === "Brasil") continue;
    if (!cat.link) continue;
    await new Promise((r) => setTimeout(r, opcoes.pausaMs));
    await andar(await pedir(cat.link), nome, 1);
  }
  return saida;
}

type DataMd = {
  luggage_type?: string;
  loyalty_program?: string | null;
  departure?: string;
  arrival?: string;
  stay?: number;
  price?: number;
  airline_code?: string;
  link?: string;
  provider_name?: string;
};
type MesMd = { month?: string; year?: number; price?: number | null; dates?: DataMd[] | null };
type RotaMd = { from_city_name?: string; to_city_name?: string; months?: MesMd[] };

const MESES: Record<string, string> = {
  Jan: "01", Fev: "02", Mar: "03", Abr: "04", Mai: "05", Jun: "06",
  Jul: "07", Ago: "08", Set: "09", Out: "10", Nov: "11", Dez: "12",
};

export type DataPreco = {
  ida: string;
  volta: string;
  estadia: number;
  preco: number;
  companhia: string | null;
  bagagem: Bagagem;
  /** Programa de milhas, quando o MD mostra preço em milhas (raro no mural). */
  programa: string | null;
  fornecedor: string | null;
  link: string | null;
};

export type MesPreco = { mes: string; preco: number; datas: DataPreco[] | null };

export function bagagemDoMd(tipo: string | undefined): Bagagem {
  switch (tipo) {
    case "checked_luggage":
      return "despachada";
    case "carry_on_luggage_only":
      return "so_mao";
    case "personal_item_luggage":
      return "item_pessoal";
    default:
      return "nao_informada";
  }
}

/** "21/1" do mês "2027-01" → "2027-01-21" (a volta pode cair no mês/ano seguinte). */
function dataDoMd(dm: string | undefined, referencia: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(dm ?? "");
  if (!m) return null;
  let ano = Number(referencia.slice(0, 4));
  const mesRef = Number(referencia.slice(5, 7));
  const mes = Number(m[2]);
  if (mes < mesRef - 6) ano += 1; // dezembro → janeiro
  return `${ano}-${String(mes).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/**
 * Os preços de uma rota: o menor de cada mês e, quando o MD manda, as datas.
 * Sem `mes`, o MD manda as datas só do mês mais barato.
 */
export async function precosDaRota(
  origem: string,
  destino: string,
  opcoes: { mes?: string; estadiaMin: number; estadiaMax: number; prazoS: number; contador: Contador },
): Promise<{ meses: MesPreco[]; origemCidade: string | null; destinoCidade: string | null }> {
  const q = new URLSearchParams({ min_stay: String(opcoes.estadiaMin), max_stay: String(opcoes.estadiaMax) });
  if (opcoes.mes) q.set("month", opcoes.mes);
  const r = await pedirJson<RotaMd>(
    `${BASE}/itinerary_prices/${encodeURIComponent(origem)}/${encodeURIComponent(destino)}?${q}`,
    { fonteId: FONTE, prazoS: opcoes.prazoS, contador: opcoes.contador },
  );
  const meses: MesPreco[] = [];
  for (const m of r.months ?? []) {
    const num = m.month ? MESES[m.month] : undefined;
    if (!num || !m.year || !m.price) continue;
    const mes = `${m.year}-${num}`;
    const datas = m.dates
      ? m.dates
          .map((d): DataPreco | null => {
            const ida = dataDoMd(d.departure, mes);
            const volta = ida ? dataDoMd(d.arrival, ida.slice(0, 7)) : null;
            if (!ida || !volta || !d.price) return null;
            return {
              ida,
              volta,
              estadia: d.stay ?? 0,
              preco: d.price,
              companhia: d.airline_code || null,
              bagagem: bagagemDoMd(d.luggage_type),
              programa: d.loyalty_program || null,
              fornecedor: d.provider_name || null,
              link: d.link || null,
            };
          })
          .filter((d): d is DataPreco => d !== null)
      : null;
    meses.push({ mes, preco: m.price, datas });
  }
  return { meses, origemCidade: r.from_city_name ?? null, destinoCidade: r.to_city_name ?? null };
}

/** As categorias do mural viram as regiões do cadastro de lugares. */
export function regiaoDaCategoria(categoria: string): { regiao: string | null; pais: string | null } {
  switch (categoria) {
    case "Brasil":
      return { regiao: null, pais: "Brasil" };
    case "Estados Unidos":
      return { regiao: "América do Norte", pais: "Estados Unidos" };
    case "Canadá":
      return { regiao: "América do Norte", pais: "Canadá" };
    case "Europa":
    case "América do Sul":
    case "África":
    case "Ásia":
      return { regiao: categoria, pais: null };
    case "Caribe, México e Região":
      return { regiao: "Caribe e México", pais: null };
    case "Oriente Médio e Israel":
      return { regiao: "Oriente Médio", pais: null };
    case "Austrália e N. Zelândia":
      return { regiao: "Oceania", pais: null };
    default:
      return { regiao: null, pais: null };
  }
}
