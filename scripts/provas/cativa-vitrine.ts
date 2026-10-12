/*
 * Prova de captura — Cativa pelo site aberto "Viajando com Desconto".
 *
 * O site (https://viajandocomdesconto.com) é uma página estática só, que já
 * traz dentro dela, em JSON, todos os pacotes da Cativa (aéreo + hotel) e
 * todos os bloqueios aéreos dela. Não tem login, nem CAPTCHA, nem robots.txt.
 * Então a captura é: baixar a página (5 MB), tirar os dois blocos de dados e
 * traduzir para os campos de oferta. Detalhes em docs/fontes/cativa.md.
 *
 * Não grava nada no banco. Roda direto no Node 24 (que entende TypeScript):
 *
 *   node scripts/provas/cativa-vitrine.ts
 *   node scripts/provas/cativa-vitrine.ts --origem BSB --regiao nordeste --tipo pacotes --limite 20
 *   node scripts/provas/cativa-vitrine.ts --tipo pacotes --so-ai      (só all inclusive)
 *   node scripts/provas/cativa-vitrine.ts --regiao todas --json > saida.json
 *
 * Ritmo educado: guarda a página numa pasta temporária e, por 30 minutos, nem
 * pergunta de novo ao site. Depois disso pergunta "mudou?" (If-None-Match /
 * If-Modified-Since) e só baixa os 5 MB se tiver versão nova.
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ENDERECO = "https://viajandocomdesconto.com/";
const AGENTE = "SRRViagens-RadarOfertas/0.1 (prova de captura; agencia parceira Cativa)";
const PRAZO_MS = 30_000;
const CACHE_MIN = 30;
const PASTA_CACHE = join(tmpdir(), "srr-ofertas-provas");

// Aeroportos do Nordeste, para o filtro --regiao nordeste.
const NORDESTE = new Set([
  "REC", "FOR", "NAT", "SSA", "MCZ", "AJU", "JPA", "BPS", "IOS", "SLZ", "THE",
  "JDO", "FEN", "JJD", "PNZ", "UNA", "VDC", "PHB", "CAU",
]);
// Destinos de pacote que não trazem o aeroporto no nome.
const NORDESTE_NOMES = [
  "porto de galinhas", "maragogi", "mata de sao joao", "praia do forte",
  "jericoacoara", "pipa", "sao miguel do gostoso", "morro de sao paulo",
  "itacare", "arraial d", "trancoso", "canoa quebrada", "cumbuco", "ilheus",
  "comandatuba", "noronha", "barra de sao miguel", "milagres", "imbassai",
  "costa do sauipe", "carneiros", "aracaju", "maceio", "natal", "fortaleza",
  "salvador", "recife", "joao pessoa", "porto seguro", "sao luis",
  "lencois maranhenses", "barreirinhas", "teresina", "galinhos",
];

// ---------------------------------------------------------------- tipos

type HotelBruto = {
  nome: string; preco: string; taxas: string; regime: string;
  promo: string; parcela: string;
};
type OrigemBruta = {
  iata: string; cidade: string; uf: string; data: string;
  data_ini: string; data_fim: string; de: string; por: string;
  inclui: string[]; hoteis: HotelBruto[]; link: string; divulgacao: string;
  taxas: string; min_parcela: string; outras: string;
};
type PacoteBruto = {
  nome: string; destino: string; slug: string; categoria: string;
  origens: OrigemBruta[];
};
type PayloadVoos = { blob: string; mapa: Record<string, [string, string]>; ger: string; usd: number };

export type OfertaPacote = {
  fonte: "cativa";
  caminho: "viajandocomdesconto";
  tipo: "pacote";
  origem: string;
  destino: string;
  destinoIata: string | null;
  pacote: string;
  hotel: string;
  regime: string;
  allInclusive: boolean;
  ida: string | null;
  volta: string | null;
  noites: number | null;
  outrasDatas: string[];
  /** Pacote completo com aéreo, por pessoa, em quarto duplo (é o preço de venda). */
  precoPorPessoa: number | null;
  /** Taxa por pessoa que o site soma ao preço ("+ taxa R$ 199"). */
  taxaPorPessoa: number | null;
  parcelas: { vezes: number; valor: number } | null;
  /** Só o aéreo do pacote, por pessoa: "de" e "por". */
  aereoDe: number | null;
  aereoPor: number | null;
  promo: string;
  inclui: string[];
  cotadoEm: string;
  linkOrcamento: string;
};

export type OfertaBloqueio = {
  fonte: "cativa";
  caminho: "viajandocomdesconto";
  tipo: "passagem";
  subtipo: "bloqueio";
  origem: string;
  destino: string;
  destinoCidade: string;
  /** O destino de praia/turismo que o site associa ao aeroporto (ex.: REC → Porto de Galinhas). */
  destinoTuristico: string;
  ida: string;
  volta: string;
  noites: number;
  assentosRestantes: number;
  /** Ida e volta, por pessoa, sem a taxa. */
  precoPorPessoa: number;
  taxaPorPessoa: number;
  companhia: string;
  horarios: { idaSai: string; idaChega: string; voltaSai: string; voltaChega: string } | null;
  nacional: boolean;
  /** Último dia para emitir esta tarifa. */
  prazoEmissao: string | null;
  geradoEm: string;
};

// ---------------------------------------------------------------- argumentos

function argumentos() {
  const a = process.argv.slice(2);
  const valor = (nome: string, padrao: string) => {
    const i = a.indexOf(`--${nome}`);
    return i >= 0 && a[i + 1] ? a[i + 1] : padrao;
  };
  return {
    origem: valor("origem", "BSB").toUpperCase(),
    regiao: valor("regiao", "nordeste"),
    tipo: valor("tipo", "tudo"),
    limite: Number(valor("limite", "15")),
    json: a.includes("--json"),
    soAllInclusive: a.includes("--so-ai"),
  };
}

// ---------------------------------------------------------------- baixar com cache

async function baixarPagina(): Promise<{ html: string; ultimaMudanca: string; daRede: boolean }> {
  await mkdir(PASTA_CACHE, { recursive: true });
  const arqHtml = join(PASTA_CACHE, "viajandocomdesconto.html");
  const arqMeta = join(PASTA_CACHE, "viajandocomdesconto.json");

  let meta: { etag?: string; lastModified?: string } = {};
  let temCache = false;
  try {
    meta = JSON.parse(await readFile(arqMeta, "utf8"));
    const idadeMin = (Date.now() - (await stat(arqHtml)).mtimeMs) / 60_000;
    temCache = true;
    if (idadeMin < CACHE_MIN) {
      return { html: await readFile(arqHtml, "utf8"), ultimaMudanca: meta.lastModified ?? "?", daRede: false };
    }
  } catch {
    // sem cache ainda
  }

  const cabecalhos: Record<string, string> = { "User-Agent": AGENTE };
  if (temCache && meta.etag) cabecalhos["If-None-Match"] = meta.etag;
  if (temCache && meta.lastModified) cabecalhos["If-Modified-Since"] = meta.lastModified;

  const resp = await fetch(ENDERECO, { headers: cabecalhos, signal: AbortSignal.timeout(PRAZO_MS) });
  if (resp.status === 304) {
    // Não mudou: só renova a idade do cache.
    const html = await readFile(arqHtml, "utf8");
    await writeFile(arqHtml, html);
    return { html, ultimaMudanca: meta.lastModified ?? "?", daRede: true };
  }
  if (!resp.ok) throw new Error(`O site respondeu ${resp.status} ${resp.statusText}`);

  const html = await resp.text();
  const novo = { etag: resp.headers.get("etag") ?? undefined, lastModified: resp.headers.get("last-modified") ?? undefined };
  await writeFile(arqHtml, html);
  await writeFile(arqMeta, JSON.stringify(novo));
  return { html, ultimaMudanca: novo.lastModified ?? "?", daRede: true };
}

// ---------------------------------------------------------------- tirar o JSON de dentro do HTML

/** Acha `marcador` e devolve o JSON ([...] ou {...}) que vem logo depois, contando chaves. */
function jsonDepoisDe(html: string, marcador: string, aPartirDe = 0): { valor: unknown; fim: number } | null {
  // O mesmo texto também aparece dentro do código do próprio site (o editor
  // dele procura por "const PACOTES = ["); essas ocorrências não são dados e
  // são puladas.
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
  let k = comeco;
  let prof = 0;
  let emTexto = false;
  for (; k < html.length; k++) {
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

/** O marcador dos pacotes aparece mais de uma vez; fica com a lista maior. */
function extrairPacotes(html: string): PacoteBruto[] {
  let melhor: PacoteBruto[] = [];
  let pos = 0;
  for (;;) {
    const achado = jsonDepoisDe(html, "const PACOTES =", pos);
    if (!achado) break;
    if (Array.isArray(achado.valor) && achado.valor.length > melhor.length) melhor = achado.valor as PacoteBruto[];
    pos = achado.fim;
  }
  if (!melhor.length) throw new Error("Não achei os pacotes na página — o site mudou de formato?");
  return melhor;
}

function extrairVoos(html: string): PayloadVoos {
  const achado = jsonDepoisDe(html, "window.__PVOO_PAYLOAD =");
  if (!achado) throw new Error("Não achei os bloqueios aéreos na página — o site mudou de formato?");
  return achado.valor as PayloadVoos;
}

// ---------------------------------------------------------------- tradução

const semAcento = (s: string) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function reais(s: string | undefined): number | null {
  const m = String(s ?? "").match(/([\d.]+,\d{2}|[\d.]+)/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "").replace(",", "."));
}

function parcela(s: string | undefined): { vezes: number; valor: number } | null {
  const m = String(s ?? "").match(/(\d+)\s*x\s*de\s*R\$\s*([\d.,]+)/i);
  if (!m) return null;
  return { vezes: Number(m[1]), valor: reais(m[2]) ?? 0 };
}

/** "17/11/2026" → "2026-11-17". */
function isoDe(dmy: string): string | null {
  const m = dmy.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (!m) return null;
  const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${ano}-${m[2]}-${m[1]}`;
}

/** "261202" → "2026-12-02". */
const isoCurto = (s: string) => (s && s.length === 6 ? `20${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}` : null);
const hora = (s: string) => (s && s.length === 4 ? `${s.slice(0, 2)}:${s.slice(2)}` : "");
const noitesEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

function iataDoDestino(destino: string, mapa: PayloadVoos["mapa"]): string | null {
  const m = destino.match(/\(([A-Z]{3})\)/);
  if (m) return m[1];
  const alvo = semAcento(destino);
  for (const [iata, [cidadeOrigem, cidadeDestino]] of Object.entries(mapa)) {
    if (semAcento(cidadeDestino) === alvo || semAcento(cidadeOrigem) === alvo) return iata;
  }
  return null;
}

function ehNordeste(destino: string, iata: string | null): boolean {
  if (iata && NORDESTE.has(iata)) return true;
  const d = semAcento(destino);
  return NORDESTE_NOMES.some((n) => d.includes(n));
}

function traduzirPacotes(brutos: PacoteBruto[], mapa: PayloadVoos["mapa"], hoje: string): { ofertas: OfertaPacote[]; vencidas: number } {
  const ofertas: OfertaPacote[] = [];
  let vencidas = 0;
  for (const p of brutos) {
    for (const o of p.origens ?? []) {
      const [ini, fim] = String(o.data ?? "").split(/\s+a\s+/);
      const ida = ini ? isoDe(ini) : null;
      const volta = fim ? isoDe(fim) : null;
      if (ida && ida < hoje) { vencidas++; continue; }
      for (const h of o.hoteis ?? []) {
        ofertas.push({
          fonte: "cativa",
          caminho: "viajandocomdesconto",
          tipo: "pacote",
          origem: o.iata,
          destino: p.destino,
          destinoIata: iataDoDestino(p.destino, mapa),
          pacote: p.nome,
          hotel: h.nome.replace(/\s{2,}.*/, "").trim(),
          regime: h.regime || "(não informado)",
          allInclusive: /all inclusive/i.test(h.regime) || /all inclusive/i.test(h.nome),
          ida,
          volta,
          noites: ida && volta ? noitesEntre(ida, volta) : null,
          outrasDatas: String(o.outras ?? "").split(/[;,]/).map((s) => s.trim()).filter(Boolean),
          precoPorPessoa: reais(h.preco),
          taxaPorPessoa: reais(h.taxas),
          parcelas: parcela(h.parcela),
          aereoDe: reais(o.de),
          aereoPor: reais(o.por),
          promo: h.promo ?? "",
          inclui: o.inclui ?? [],
          cotadoEm: o.divulgacao ?? "",
          linkOrcamento: o.link ?? "",
        });
      }
    }
  }
  return { ofertas, vencidas };
}

function traduzirBloqueios(p: PayloadVoos, hoje: string): { ofertas: OfertaBloqueio[]; vencidas: number } {
  const ofertas: OfertaBloqueio[] = [];
  let vencidas = 0;
  for (const linha of p.blob.split("\n")) {
    if (!linha) continue;
    // 16 campos: origem|destino|ida|volta|noites|assentos|tarifa|tarifaEmDolar|prazo|
    //            idaSai|idaChega|voltaSai|voltaChega|taxa|nacional|companhia
    const c = linha.split("|");
    const prazo = isoCurto(c[8]);
    if (prazo && prazo < hoje) { vencidas++; continue; }
    const ida = isoCurto(c[2]);
    const volta = isoCurto(c[3]);
    if (!ida || !volta) continue;
    const tarifa = Number(c[6]);
    const emDolar = c[7] === "1";
    const temHorario = Boolean(c[9] && c[10]);
    ofertas.push({
      fonte: "cativa",
      caminho: "viajandocomdesconto",
      tipo: "passagem",
      subtipo: "bloqueio",
      origem: c[0],
      destino: c[1],
      destinoCidade: p.mapa[c[1]]?.[0] ?? c[1],
      destinoTuristico: p.mapa[c[1]]?.[1] ?? "",
      ida,
      volta,
      noites: Number(c[4]),
      assentosRestantes: Number(c[5]),
      precoPorPessoa: Math.round(emDolar ? tarifa * p.usd : tarifa),
      taxaPorPessoa: c[13] ? Number(c[13]) : 0,
      companhia: c[15] || "(não informada)",
      horarios: temHorario ? { idaSai: hora(c[9]), idaChega: hora(c[10]), voltaSai: hora(c[11]), voltaChega: hora(c[12]) } : null,
      nacional: c[14] === "1",
      prazoEmissao: prazo,
      geradoEm: p.ger,
    });
  }
  return { ofertas, vencidas };
}

// ---------------------------------------------------------------- saída

const brl = (v: number | null) => (v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }));
const dataBr = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

async function principal() {
  const arg = argumentos();
  const hoje = new Date().toISOString().slice(0, 10);
  const inicio = Date.now();
  const { html, ultimaMudanca, daRede } = await baixarPagina();

  const brutos = extrairPacotes(html);
  const voos = extrairVoos(html);
  const pac = traduzirPacotes(brutos, voos.mapa, hoje);
  const blq = traduzirBloqueios(voos, hoje);

  const naRegiao = (destino: string, iata: string | null) => arg.regiao === "todas" || ehNordeste(destino, iata);
  const pacotes = pac.ofertas
    .filter((o) => o.origem === arg.origem && naRegiao(o.destino, o.destinoIata) && (!arg.soAllInclusive || o.allInclusive))
    .sort((a, b) => (a.precoPorPessoa ?? 9e9) - (b.precoPorPessoa ?? 9e9));
  const bloqueios = blq.ofertas
    .filter((o) => o.origem === arg.origem && naRegiao(o.destinoTuristico, o.destino))
    .sort((a, b) => a.precoPorPessoa - b.precoPorPessoa);

  if (arg.json) {
    console.log(JSON.stringify({ pacotes, bloqueios }, null, 2));
    return;
  }

  console.log(`\nCativa · viajandocomdesconto.com · ${daRede ? "consultado agora" : "do cache (menos de 30 min)"} em ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
  console.log(`Página publicada em: ${ultimaMudanca} · bloqueios gerados em: ${voos.ger}`);
  console.log(`No site todo: ${brutos.length} pacotes, ${pac.ofertas.length} combinações pacote × hotel vigentes (${pac.vencidas} saídas já passadas, descartadas); ${blq.ofertas.length} bloqueios vigentes (${blq.vencidas} com prazo de emissão vencido, descartados).`);
  console.log(`Filtro: saindo de ${arg.origem}, região ${arg.regiao}.`);

  if (arg.tipo !== "bloqueios") {
    const ai = pacotes.filter((o) => o.allInclusive).length;
    console.log(`\n== PACOTES (aéreo + hotel): ${pacotes.length}, dos quais ${ai} all inclusive — mais baratos primeiro ==`);
    console.log("Preço = pacote completo com aéreo, POR PESSOA, quarto duplo, + taxa. Parcelas sem juros (Visa/Master).\n");
    for (const o of pacotes.slice(0, arg.limite)) {
      const parc = o.parcelas ? `${o.parcelas.vezes}x ${brl(o.parcelas.valor)}` : "—";
      console.log(
        `${o.allInclusive ? "★ AI " : "     "}${brl(o.precoPorPessoa).padStart(9)} + ${brl(o.taxaPorPessoa)} taxa  (${parc})  ` +
          `${dataBr(o.ida)}→${dataBr(o.volta)} ${o.noites ?? "?"}n  ${o.destino} · ${o.hotel} · ${o.regime}` +
          `${o.outrasDatas.length ? `  [outras saídas: ${o.outrasDatas.join(", ")}]` : ""}  cotado ${o.cotadoEm || "?"}`,
      );
    }
  }

  if (arg.tipo !== "pacotes") {
    console.log(`\n== BLOQUEIOS AÉREOS (só passagem, ida e volta): ${bloqueios.length} — mais baratos primeiro ==`);
    console.log("Preço = ida e volta POR PESSOA, + taxa. Prazo = último dia para emitir.\n");
    for (const o of bloqueios.slice(0, arg.limite)) {
      const h = o.horarios ? `${o.horarios.idaSai}-${o.horarios.idaChega} / ${o.horarios.voltaSai}-${o.horarios.voltaChega}` : "sem horário";
      console.log(
        `${brl(o.precoPorPessoa).padStart(9)} + ${brl(o.taxaPorPessoa)}  ${o.origem}→${o.destino} (${o.destinoCidade}${o.destinoTuristico && o.destinoTuristico !== o.destinoCidade ? ` · ${o.destinoTuristico}` : ""})  ` +
          `${dataBr(o.ida)}→${dataBr(o.volta)} ${o.noites}n  ${o.companhia}  ${h}  ` +
          `${o.assentosRestantes} lugar(es)  emitir até ${dataBr(o.prazoEmissao)}`,
      );
    }
  }
  console.log("");
}

principal().catch((e) => {
  console.error(`\nFalhou: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
