import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pedirPagina, type Contador } from "../http";

/**
 * Conector da CATIVA pela vitrine aberta viajandocomdesconto.com — o canal
 * oficial que a Cativa dá às agências para mostrarem aos clientes (ficha:
 * docs/fontes/cativa.md).
 *
 * A página é estática e traz dentro dela, em JSON, todos os pacotes e todos os
 * bloqueios aéreos da Cativa. Este módulo só baixa (perguntando antes "mudou?")
 * e tira os blocos de dados; quem traduz para o molde é `pacotes.ts`.
 */

export const ENDERECO_CATIVA = "https://viajandocomdesconto.com/";
const AGENTE = "SRRViagens-RadarOfertas/1.0 (agencia parceira Cativa)";
const PASTA = join(tmpdir(), "srr-ofertas");
const ARQ_HTML = join(PASTA, "cativa-vitrine.html");
const ARQ_META = join(PASTA, "cativa-vitrine.json");

export type HotelCativa = {
  nome: string;
  preco: string;
  taxas: string;
  regime: string;
  promo: string;
  parcela: string;
};
export type SaidaCativa = {
  iata: string;
  cidade: string;
  uf: string;
  data: string;
  de: string;
  por: string;
  inclui: string[];
  hoteis: HotelCativa[];
  link: string;
  divulgacao: string;
  taxas: string;
  min_parcela: string;
  outras: string;
};
export type PacoteCativa = {
  nome: string;
  destino: string;
  slug: string;
  categoria: string;
  /** O nome do pacote no sistema da Cativa (o que o portal mostra). */
  src?: string;
  origens: SaidaCativa[];
};
export type VoosCativa = {
  /** Uma linha por bloqueio, 16 campos separados por "|". */
  blob: string;
  /** Aeroporto → [cidade do aeroporto, destino turístico]. */
  mapa: Record<string, [string, string]>;
  /** Data de geração dos bloqueios ("09/10/2026"). */
  ger: string;
  usd: number;
};

export type VitrineCativa = {
  pacotes: PacoteCativa[];
  voos: VoosCativa;
  /** Política de criança por pacote · saída · hotel ("01 CHD ATÉ 12 ANOS"). */
  criancas: Map<string, string>;
  /** Cidade (sem acento, minúscula) → aeroporto, da tabela do próprio site. */
  destinoFix: Map<string, string>;
  /** Quando a página foi publicada (cabeçalho Last-Modified). */
  publicadaEm: Date | null;
  /** A página mudou desde a leitura anterior? */
  mudou: boolean;
};

/** A última leitura, na memória do motor (e num arquivo, para quando ele religar). */
let ultima: { html: string; etag: string | null; ultimaMudanca: string | null } | null = null;

export async function lerVitrineCativa(opcoes: { prazoS: number; contador: Contador }): Promise<VitrineCativa> {
  if (!ultima) ultima = await lerDoArquivo();
  const r = await pedirPagina(ENDERECO_CATIVA, {
    fonteId: "cativa",
    prazoS: opcoes.prazoS,
    contador: opcoes.contador,
    etag: ultima?.etag,
    ultimaMudanca: ultima?.ultimaMudanca,
    agente: AGENTE,
  });
  let mudou = false;
  if (r.corpo != null) {
    mudou = !ultima || ultima.html !== r.corpo;
    ultima = { html: r.corpo, etag: r.etag, ultimaMudanca: r.ultimaMudanca };
    await guardarNoArquivo(ultima);
  } else if (!ultima) {
    throw new Error("A Cativa respondeu \"não mudou\", mas não há leitura anterior guardada.");
  }
  const html = ultima.html;
  const pacotes = maiorLista(html, "const PACOTES =") as PacoteCativa[] | null;
  const voos = jsonDepoisDe(html, "window.__PVOO_PAYLOAD =")?.valor as VoosCativa | undefined;
  if (!pacotes?.length) throw new Error("Não achei os pacotes na página da Cativa — o site mudou de formato?");
  if (!voos?.blob) throw new Error("Não achei os bloqueios aéreos na página da Cativa — o site mudou de formato?");
  return {
    pacotes,
    voos,
    criancas: politicaDeCriancas(html),
    destinoFix: tabelaDeDestinos(html),
    publicadaEm: ultima.ultimaMudanca ? new Date(ultima.ultimaMudanca) : null,
    mudou,
  };
}

// --- arquivo de cache --------------------------------------------------------

async function lerDoArquivo() {
  try {
    const meta = JSON.parse(await readFile(ARQ_META, "utf8")) as { etag: string | null; ultimaMudanca: string | null };
    return { html: await readFile(ARQ_HTML, "utf8"), ...meta };
  } catch {
    return null;
  }
}

async function guardarNoArquivo(u: { html: string; etag: string | null; ultimaMudanca: string | null }) {
  try {
    await mkdir(PASTA, { recursive: true });
    await writeFile(ARQ_HTML, u.html);
    await writeFile(ARQ_META, JSON.stringify({ etag: u.etag, ultimaMudanca: u.ultimaMudanca }));
  } catch {
    // Sem arquivo, só se perde o "mudou?" depois de religar o motor.
  }
}

// --- tirar o JSON de dentro do HTML ------------------------------------------

/**
 * O JSON ([...] ou {...}) que vem logo depois de `marcador`. O mesmo texto
 * também aparece dentro do código do próprio site (o editor dele procura por
 * "const PACOTES = ["); essas ocorrências não são dados e são puladas.
 */
export function jsonDepoisDe(html: string, marcador: string, aPartirDe = 0): { valor: unknown; fim: number } | null {
  for (let i = html.indexOf(marcador, aPartirDe); i >= 0; i = html.indexOf(marcador, i + 1)) {
    let k = i + marcador.length;
    while (html[k] === " ") k++;
    if (html[k] !== "[" && html[k] !== "{") continue;
    const achado = lerJson(html, k);
    if (achado) return achado;
  }
  return null;
}

function lerJson(html: string, comeco: number): { valor: unknown; fim: number } | null {
  let prof = 0;
  let emTexto = false;
  for (let k = comeco; k < html.length; k++) {
    const c = html[k];
    if (emTexto) {
      if (c === "\\") k++;
      else if (c === '"') emTexto = false;
      continue;
    }
    if (c === '"') emTexto = true;
    else if (c === "[" || c === "{") prof++;
    else if (c === "]" || c === "}") {
      prof--;
      if (prof === 0) {
        try {
          return { valor: JSON.parse(html.slice(comeco, k + 1)), fim: k + 1 };
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** O marcador aparece mais de uma vez: fica com a lista maior. */
function maiorLista(html: string, marcador: string): unknown[] | null {
  let melhor: unknown[] | null = null;
  for (let pos = 0; ; ) {
    const achado = jsonDepoisDe(html, marcador, pos);
    if (!achado) break;
    if (Array.isArray(achado.valor) && achado.valor.length > (melhor?.length ?? 0)) melhor = achado.valor;
    pos = achado.fim;
  }
  return melhor;
}

export const semAcento = (s: string) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * A política de criança grátis de cada hotel vem num segundo bloco
 * (`PV_SNAPSHOT`), uma linha por pacote · saída. Chave: nome · aeroporto · hotel.
 */
function politicaDeCriancas(html: string): Map<string, string> {
  const mapa = new Map<string, string>();
  const lista = maiorLista(html, "const PV_SNAPSHOT =") as
    | { nome: string; origem_iata: string; hoteis?: { nome: string; crianca?: string }[] }[]
    | null;
  for (const s of lista ?? []) {
    for (const h of s.hoteis ?? []) {
      if (h.crianca?.trim()) mapa.set(chaveCrianca(s.nome, s.origem_iata, h.nome), h.crianca.trim());
    }
  }
  return mapa;
}

export const chaveCrianca = (pacote: string, origem: string, hotel: string) =>
  [semAcento(pacote), origem, semAcento(hotel)].join("|");

/** `DEST_FIX = {'foz do iguacu':'IGU', …}` — a tabela do próprio site. */
function tabelaDeDestinos(html: string): Map<string, string> {
  const i = html.indexOf("DEST_FIX = {");
  const mapa = new Map<string, string>();
  if (i < 0) return mapa;
  const trecho = html.slice(i, html.indexOf("}", i) + 1);
  for (const m of trecho.matchAll(/'([^']+)'\s*:\s*'([A-Z]{3})'/g)) mapa.set(m[1], m[2]);
  return mapa;
}
