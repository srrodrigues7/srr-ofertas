import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { pedirPagina, type Contador } from "../http";

/**
 * Conector da CATIVA pela vitrine aberta viajandocomdesconto.com — o canal
 * oficial que a Cativa dá às agências para mostrarem aos clientes (ficha:
 * docs/fontes/cativa.md).
 *
 * A página é estática e traz, em JSON, todos os pacotes e todos os bloqueios
 * aéreos da Cativa: até 22/10 dentro dela; desde então, em arquivos do próprio
 * site que ela carrega (`/_s/<código>.js`). Este módulo só baixa e tira os
 * blocos de dados; quem traduz para o molde é `pacotes.ts`.
 */

export const ENDERECO_CATIVA = "https://viajandocomdesconto.com/";
const AGENTE = "SRRViagens-RadarOfertas/1.0 (agencia parceira Cativa)";
const PASTA = join(tmpdir(), "srr-ofertas");
const ARQ_HTML = join(PASTA, "cativa-vitrine.html");

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

/**
 * Desde 22/10 os dados não vêm mais dentro da página: ela carrega uns poucos
 * arquivos do próprio site (`/_s/<código>.js`), e os blocos estão neles. O
 * nome do arquivo é a impressão digital do conteúdo (o site serve com
 * `immutable`): arquivo de nome já visto não se baixa de novo.
 */
const MAX_ARQUIVOS = 8;
const MAX_BYTES = 15 * 1024 * 1024;
const PASTA_ARQUIVOS = join(PASTA, "cativa-arquivos");
const ARQUIVO_DO_SITE = /^\/_s\/[A-Za-z0-9_-]+\.js$/;

/** A última página lida (para dizer "página nova") e os arquivos já baixados, na memória do motor. */
let ultimaPagina: string | null | undefined;
const arquivos = new Map<string, string>();

export async function lerVitrineCativa(opcoes: { prazoS: number; contador: Contador }): Promise<VitrineCativa> {
  if (ultimaPagina === undefined) ultimaPagina = await lerDoArquivo(ARQ_HTML);
  // Sem a pergunta "mudou?": em 02/11 o site respondeu "não mudou" (304) com a
  // página já trocada (a data dela fica parada). A página tem 0,5 MB; os
  // arquivos grandes é que só se baixam quando o nome muda.
  const r = await pedirPagina(ENDERECO_CATIVA, {
    fonteId: "cativa",
    prazoS: opcoes.prazoS,
    contador: opcoes.contador,
    agente: AGENTE,
    limiteBytes: MAX_BYTES,
  });
  const html = r.corpo ?? "";
  const mudou = ultimaPagina !== html;
  if (mudou) {
    ultimaPagina = html;
    await guardarNoArquivo(ARQ_HTML, html);
  }

  // Procura na página primeiro (o formato antigo); só se faltar, nos arquivos.
  let vitrine = extrairVitrine(html);
  let ondeProcurei = "na página da Cativa";
  if (!completa(vitrine)) {
    const enderecos = arquivosDoSite(html);
    let lidos = await lerArquivos(enderecos, opcoes, true);
    vitrine = extrairVitrine([html, ...lidos.textos].join("\n;\n"));
    // Um arquivo guardado pode estar ruim (resposta errada, gravação cortada):
    // sem os blocos, esquece o que estava guardado e baixa tudo uma vez.
    if (!completa(vitrine) && lidos.guardados > 0) {
      lidos = await lerArquivos(enderecos, opcoes, false);
      vitrine = extrairVitrine([html, ...lidos.textos].join("\n;\n"));
    }
    // Só guarda o que deu certo: um arquivo ruim nunca vira cache.
    if (completa(vitrine)) await guardarArquivos(enderecos, lidos.textos);
    ondeProcurei = `na página da Cativa nem nos ${enderecos.length} arquivo(s) /_s/ dela`;
  }
  const { pacotes, voos, texto } = vitrine;
  if (!pacotes?.length) throw new Error(`Não achei os pacotes (const PACOTES) ${ondeProcurei} — o site mudou de formato?`);
  if (!voos?.blob) throw new Error(`Não achei os bloqueios aéreos (__PVOO_PAYLOAD) ${ondeProcurei} — o site mudou de formato?`);
  return {
    pacotes,
    voos,
    criancas: politicaDeCriancas(texto),
    destinoFix: tabelaDeDestinos(texto),
    publicadaEm: dataDePublicacao(html, r.ultimaMudanca),
    mudou,
  };
}

/** Os blocos de dados num texto (a página, ou a página mais os arquivos). */
export function extrairVitrine(texto: string) {
  return {
    texto,
    pacotes: maiorLista(texto, "const PACOTES =") as PacoteCativa[] | null,
    voos: jsonDepoisDe(texto, "window.__PVOO_PAYLOAD =")?.valor as VoosCativa | undefined,
  };
}

/** Os `<script src="/_s/…">` da página: só do próprio site, no máximo MAX_ARQUIVOS. */
export function arquivosDoSite(html: string): string[] {
  const base = new URL(ENDERECO_CATIVA);
  const achados: string[] = [];
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    let url: URL;
    try {
      url = new URL(m[1].replace(/&amp;/g, "&"), base);
    } catch {
      continue;
    }
    if (url.origin !== base.origin || !ARQUIVO_DO_SITE.test(url.pathname)) continue;
    if (!achados.includes(url.href)) achados.push(url.href);
  }
  return achados.slice(0, MAX_ARQUIVOS);
}

const completa = (v: ReturnType<typeof extrairVitrine>) => Boolean(v.pacotes?.length && v.voos?.blob);

/**
 * Os arquivos, na ordem da página: o que já está guardado (memória ou pasta,
 * se `usarGuardados`) e o resto baixado, sem passar de MAX_BYTES somados.
 */
async function lerArquivos(
  enderecos: string[],
  opcoes: { prazoS: number; contador: Contador },
  usarGuardados: boolean,
): Promise<{ textos: string[]; guardados: number }> {
  const textos: string[] = [];
  let bytes = 0;
  let guardados = 0;
  for (const endereco of enderecos) {
    let texto = usarGuardados ? (arquivos.get(endereco) ?? (await lerDoArquivo(arquivoLocal(endereco)))) : null;
    if (texto != null) guardados++;
    else {
      const r = await pedirPagina(endereco, {
        fonteId: "cativa",
        prazoS: opcoes.prazoS,
        contador: opcoes.contador,
        agente: AGENTE,
        limiteBytes: MAX_BYTES - bytes,
      });
      texto = r.corpo ?? "";
    }
    bytes += Buffer.byteLength(texto);
    if (bytes > MAX_BYTES) throw new Error(`Os arquivos da página da Cativa passam de ${MAX_BYTES / 1024 / 1024} MB — o site mudou de formato?`);
    textos.push(texto);
  }
  return { textos, guardados };
}

/** Guarda os arquivos de uma leitura que deu certo e esquece os que a página largou (memória e pasta). */
async function guardarArquivos(enderecos: string[], textos: string[]) {
  for (const [i, endereco] of enderecos.entries()) {
    if (arquivos.get(endereco) === textos[i]) continue;
    arquivos.set(endereco, textos[i]);
    await guardarNoArquivo(arquivoLocal(endereco), textos[i]);
  }
  for (const antigo of [...arquivos.keys()]) if (!enderecos.includes(antigo)) arquivos.delete(antigo);
  const queFicam = new Set(enderecos.map((e) => basename(arquivoLocal(e))));
  try {
    for (const nome of await readdir(PASTA_ARQUIVOS)) {
      // Só os nomes que este módulo cria (sha1 em hexadecimal), nada mais.
      if (/^[0-9a-f]{40}\.js(\.\d+\.tmp)?$/.test(nome) && !queFicam.has(nome)) {
        await rm(join(PASTA_ARQUIVOS, nome), { force: true });
      }
    }
  } catch {
    // Pasta sumida ou sem permissão: só sobra arquivo velho no temporário.
  }
}

const arquivoLocal = (endereco: string) =>
  join(PASTA_ARQUIVOS, `${createHash("sha1").update(endereco).digest("hex")}.js`);

/**
 * Quando a página foi publicada: a data da versão que o próprio site escreve
 * (`<meta name="vcd-versao" content="209.67.2026-11-02.…">`) ou o cabeçalho
 * Last-Modified, o que for mais novo (o cabeçalho ficou parado em 01/11).
 */
export function dataDePublicacao(html: string, ultimaMudanca: string | null): Date | null {
  const m = /<meta\s+name=["']vcd-versao["']\s+content=["'][^"']*?(\d{4}-\d{2}-\d{2})/i.exec(html);
  const daVersao = m ? new Date(`${m[1]}T00:00:00-03:00`) : null;
  const doCabecalho = ultimaMudanca ? new Date(ultimaMudanca) : null;
  const validas = [daVersao, doCabecalho].filter((d): d is Date => d != null && !Number.isNaN(d.getTime()));
  return validas.length ? new Date(Math.max(...validas.map((d) => d.getTime()))) : null;
}

// --- arquivos de cache -------------------------------------------------------

async function lerDoArquivo(arquivo: string): Promise<string | null> {
  try {
    return await readFile(arquivo, "utf8");
  } catch {
    return null;
  }
}

async function guardarNoArquivo(arquivo: string, texto: string) {
  try {
    await mkdir(dirname(arquivo), { recursive: true });
    // Grava ao lado e troca o nome: quem lê ao mesmo tempo nunca pega meio arquivo.
    const provisorio = `${arquivo}.${process.pid}.tmp`;
    await writeFile(provisorio, texto);
    await rename(provisorio, arquivo);
  } catch {
    // Sem arquivo, só se baixa de novo depois de religar o motor.
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
