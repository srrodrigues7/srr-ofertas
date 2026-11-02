import { mensagemDe } from "@/pacote/erros";

/**
 * Pedidos às fontes, sempre com prazo (lição 9: nada fica pendurado).
 *
 * Não disfarçamos nada: sem cabeçalho de navegador falso, sem contornar
 * proteção. Se a fonte recusar (403, 406, 429), é `FonteRecusou` — o motor
 * registra como "bloqueado" e deixa a fonte em paz por um tempo.
 */

export class FonteRecusou extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "FonteRecusou";
  }
}

/** Contador de requisições de uma coleta (vai para `ofertas.coleta`). */
export type Contador = { requisicoes: number };

/**
 * Para testar "uma fonte fora do ar": RADAR_SIMULAR_FALHA=smiles (ou
 * melhores_destinos, ou as duas separadas por vírgula) no .env. Só para teste.
 */
export function falhaSimulada(fonteId: string): void {
  const lista = (process.env.RADAR_SIMULAR_FALHA ?? "").split(",").map((s) => s.trim());
  if (lista.includes(fonteId)) {
    throw new Error(`Falha simulada (RADAR_SIMULAR_FALHA=${fonteId}): a fonte "não respondeu".`);
  }
}

export async function pedirJson<T>(
  url: string,
  opcoes: { fonteId: string; prazoS: number; contador: Contador; cabecalhos?: Record<string, string> },
): Promise<T> {
  falhaSimulada(opcoes.fonteId);
  opcoes.contador.requisicoes++;
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      headers: { Accept: "application/json", ...opcoes.cabecalhos },
      signal: AbortSignal.timeout(opcoes.prazoS * 1000),
    });
  } catch (e) {
    const nome = e instanceof Error ? e.name : "";
    if (nome === "TimeoutError" || nome === "AbortError") {
      throw new Error(`Sem resposta em ${opcoes.prazoS} s: ${encurtar(url)}`);
    }
    throw new Error(`Não consegui falar com ${encurtar(url)}: ${mensagemDe(e)}`);
  }
  if (resposta.status === 403 || resposta.status === 406 || resposta.status === 429) {
    throw new FonteRecusou(resposta.status, `A fonte recusou o acesso (HTTP ${resposta.status}): ${encurtar(url)}`);
  }
  if (!resposta.ok) {
    throw new Error(`HTTP ${resposta.status} em ${encurtar(url)}`);
  }
  return (await resposta.json()) as T;
}

/**
 * Uma página inteira (HTML), perguntando antes "mudou?": com `etag` /
 * `ultimaMudanca` da leitura anterior, a fonte responde 304 sem o corpo quando
 * nada mudou (`corpo = null`). Mesmas regras de `pedirJson`.
 */
export async function pedirPagina(
  url: string,
  opcoes: {
    fonteId: string;
    prazoS: number;
    contador: Contador;
    etag?: string | null;
    ultimaMudanca?: string | null;
    agente: string;
  },
): Promise<{ corpo: string | null; etag: string | null; ultimaMudanca: string | null }> {
  falhaSimulada(opcoes.fonteId);
  opcoes.contador.requisicoes++;
  const cabecalhos: Record<string, string> = { "User-Agent": opcoes.agente };
  if (opcoes.etag) cabecalhos["If-None-Match"] = opcoes.etag;
  if (opcoes.ultimaMudanca) cabecalhos["If-Modified-Since"] = opcoes.ultimaMudanca;
  let resposta: Response;
  try {
    resposta = await fetch(url, { headers: cabecalhos, signal: AbortSignal.timeout(opcoes.prazoS * 1000) });
  } catch (e) {
    const nome = e instanceof Error ? e.name : "";
    if (nome === "TimeoutError" || nome === "AbortError") throw new Error(`Sem resposta em ${opcoes.prazoS} s: ${encurtar(url)}`);
    throw new Error(`Não consegui falar com ${encurtar(url)}: ${mensagemDe(e)}`);
  }
  if (resposta.status === 403 || resposta.status === 406 || resposta.status === 429) {
    throw new FonteRecusou(resposta.status, `A fonte recusou o acesso (HTTP ${resposta.status}): ${encurtar(url)}`);
  }
  const etag = resposta.headers.get("etag");
  const ultimaMudanca = resposta.headers.get("last-modified");
  if (resposta.status === 304) {
    return { corpo: null, etag: etag ?? opcoes.etag ?? null, ultimaMudanca: ultimaMudanca ?? opcoes.ultimaMudanca ?? null };
  }
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${encurtar(url)}`);
  return { corpo: await resposta.text(), etag, ultimaMudanca };
}

/** URL sem a parte de parâmetros longa, para mensagens de erro legíveis. */
export function encurtar(url: string): string {
  return url.length > 140 ? `${url.slice(0, 140)}…` : url;
}
