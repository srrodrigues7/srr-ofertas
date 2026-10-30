/**
 * O LEITOR dos alertas do grupo "Alerta Passagens CPM" (V6): texto → dados.
 *
 * Função pura, sem banco: entende o formato (quase sempre o mesmo) e devolve o
 * que o alerta diz. Quem decide se vira oferta (origem, programa, classe,
 * validade) é `alertas.ts`. O que não encaixa volta como "não entendido", com
 * o motivo — nunca adivinhado.
 *
 * O formato, levantado nos 416 alertas de 07 a 29/10/2026:
 *
 *   EXECUTIVA LATAM 🔵
 *   Origem: GRU - São Paulo
 *   Destino: SCL - Santiago
 *   Programa de Fidelidade: LATAM Pass            ("A ou B", "A, B ou C")
 *   Companhia aérea: LATAM
 *   Classe: Executiva 💺
 *   🏷️ Preço:
 *   Ida: a partir de 41.200 milhas + taxas        (faixa "12.100 - 24.600",
 *   Volta: 41.200 milhas + R$ 814 em taxas         pontos/Avios, taxa em R$,
 *                                                  US$/CA$/€ ou ausente, vários
 *                                                  programas: "… pela Smiles ou
 *                                                  … pelo Aeroplan")
 *   … Preço de ida: 1.112,40 + taxas              (o preço de venda DELES:
 *                                                  só referência, nunca usado)
 *   🛫 Datas de ida:
 *   Outubro/26: 21, 22
 *   🛬 Datas de volta:                             (lista separada: não são pares)
 *   Outubro/26: 31
 */

export type Classe = "economica" | "premium" | "executiva" | "primeira";
export type Unidade = "milhas" | "pontos" | "avios";

/** Um preço de um trecho, num programa. */
export type Trecho = {
  /** O programa como veio escrito ("pela Smiles" → "Smiles"); null = o do cabeçalho. */
  programa: string | null;
  /** A menor da faixa (a regra do Saulo) e a maior, quando há faixa. */
  quantidade: number;
  quantidadeAte: number;
  unidade: Unidade;
  /** Taxa em reais (a menor da faixa). Null = não informada ou em outra moeda. */
  taxaBrl: number | null;
  /** A taxa como veio, quando não é em reais ("US$ 45", "CA$ 120"). */
  taxaOutraMoeda: string | null;
  texto: string;
};

export type AlertaLido = {
  classe: Classe;
  classeTexto: string;
  origem: string;
  origemCidade: string | null;
  destino: string;
  destinoCidade: string | null;
  /** O cabeçalho "Programa de Fidelidade", separado ("Smiles", "Azul Pelo Mundo"). */
  programas: string[];
  companhia: string | null;
  ida: Trecho[];
  volta: Trecho[];
  /** "Ida e volta: …" (raro): o preço já é dos dois trechos. */
  idaEVolta: Trecho[];
  /** Todas as datas do alerta (ISO), em ordem. Volta é uma lista à parte. */
  datasIda: string[];
  datasVolta: string[];
  /** O preço de venda que o GRUPO anuncia (R$, sem taxas): só referência
   *  interna da equipe. Nunca vai para o cliente nem entra no nosso preço. */
  cpmIdaBrl: number | null;
  cpmVoltaBrl: number | null;
};

export type Leitura = { ok: true; alerta: AlertaLido } | { ok: false; motivo: string };

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

/** Minúsculo, sem acento e sem espaços repetidos: a forma de comparar nomes. */
export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Tira os caracteres invisíveis de formatação que o WhatsApp põe no meio do texto. */
function limpar(texto: string): string {
  return texto.replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, "").replace(/\r/g, "");
}

/** "41.200" → 41200 (milhas: o ponto separa milhar). */
function inteiro(s: string): number {
  return Number(s.replace(/\./g, ""));
}

/** "1.234,56" / "814" / "76,77" → número (reais, à brasileira). */
function reais(s: string): number {
  return Number(s.replace(/\./g, "").replace(",", "."));
}

function classeDe(texto: string): Classe | null {
  const n = normalizar(texto);
  if (n.startsWith("economica premium") || n.startsWith("premium")) return "premium";
  if (n.startsWith("economica")) return "economica";
  if (n.startsWith("executiva")) return "executiva";
  if (n.startsWith("primeira")) return "primeira";
  return null;
}

/** "Finnair Plus, Privilege Club ou Smiles" → ["Finnair Plus", "Privilege Club", "Smiles"].
 *  "MileagePlus (ida) ou Azul Pelo Mundo (volta)" → sem os parênteses. */
export function separarProgramas(texto: string): string[] {
  return texto
    .split(/\s*,\s*|\s+ou\s+/i)
    .map((p) => p.replace(/\([^)]*\)/g, "").trim())
    .filter(Boolean);
}

/** Um segmento de preço: "82.300 - 83.100 milhas + R$ 108,61 - R$ 200 em taxas pela Smiles". */
function lerSegmento(texto: string): Trecho | null {
  const q = texto.match(/([\d.]+)(?:\s*-\s*([\d.]+))?\s*(milhas|pontos|avios)/i);
  if (!q) return null;
  const quantidade = inteiro(q[1]);
  const quantidadeAte = q[2] ? inteiro(q[2]) : quantidade;
  if (!(quantidade > 0) || quantidadeAte < quantidade) return null;
  const unidade = q[3].toLowerCase() as Unidade;

  let taxaBrl: number | null = null;
  let taxaOutraMoeda: string | null = null;
  const t = texto.slice((q.index ?? 0) + q[0].length).match(/\+\s*(R\$|CA\$|US\$|U\$|\$|€|£)\s*([\d.,]+)/);
  if (t) {
    if (t[1] === "R$") taxaBrl = reais(t[2]);
    else taxaOutraMoeda = `${t[1]} ${t[2]}`;
  }

  const p = texto.match(/\bpel[oa]\s+(.+?)\s*$/i);
  const programa = p ? p[1].replace(/\([^)]*\)/g, "").trim() || null : null;
  return { programa, quantidade, quantidadeAte, unidade, taxaBrl, taxaOutraMoeda, texto: texto.trim() };
}

/** Uma linha "Ida: …" pode ter vários programas separados por " ou ". */
function lerTrechos(texto: string): Trecho[] | null {
  const segmentos = texto.split(/\s+ou\s+(?=(?:a partir de\s+)?[\d.]+)/i);
  const trechos: Trecho[] = [];
  for (const s of segmentos) {
    const t = lerSegmento(s);
    if (!t) return null;
    trechos.push(t);
  }
  return trechos;
}

/** "Janeiro/27: 14, 25, 26" → ["2027-01-14", …]. Às vezes vários meses vêm na
 *  mesma linha ("Maio/27: 22, 29 Junho/27: 05"): lê todos. Dia que não existe
 *  no mês invalida a lista inteira (algo está errado). */
function lerDatas(bloco: string): string[] | null {
  const datas: string[] = [];
  for (const m of bloco.matchAll(/([A-Za-zÀ-ÿ]+)\s*\/\s*(\d{4}|\d{2})\s*:\s*([\d,\s]+)/g)) {
    const mes = MESES[normalizar(m[1])];
    if (!mes) return null;
    const ano = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
    for (const d of m[3].split(/[,\s]+/).filter(Boolean)) {
      const dia = Number(d);
      const iso = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const data = new Date(`${iso}T00:00:00Z`);
      if (!(dia >= 1) || data.getUTCMonth() + 1 !== mes) return null;
      datas.push(iso);
    }
  }
  return [...new Set(datas)].sort();
}

export function lerAlerta(original: string): Leitura {
  const texto = limpar(original);

  const classeTexto = texto.match(/Classe:\s*([^\n💺]+)/)?.[1]?.trim() ?? texto.split("\n")[0].trim();
  const classe = classeDe(classeTexto);
  if (!classe) return { ok: false, motivo: `classe não reconhecida ("${classeTexto.slice(0, 40)}")` };

  const origem = texto.match(/Origem:\s*([A-Z]{3})\b(?:\s*-\s*([^\n]+))?/);
  const destino = texto.match(/Destino:\s*([A-Z]{3})\b(?:\s*-\s*([^\n]+))?/);
  if (!origem || !destino) return { ok: false, motivo: "sem origem ou destino em código de aeroporto" };
  if (origem[1] === destino[1]) return { ok: false, motivo: "origem igual ao destino" };

  const programaTexto = texto.match(/Programa de Fidelidade:\s*([^\n]+)/)?.[1]?.trim();
  if (!programaTexto) return { ok: false, motivo: "sem programa de fidelidade" };
  const programas = separarProgramas(programaTexto);

  const companhia = texto.match(/Companhia aérea:\s*(.+?)(?:\s+Classe:.*)?$/m)?.[1]?.trim() ?? null;

  // O bloco do preço DO PROGRAMA: do "Preço:" até a oferta em dinheiro do
  // grupo ("Não tem milhas…", "Para adquirir…") ou até as datas.
  const inicioPreco = texto.search(/Preço:/);
  if (inicioPreco < 0) return { ok: false, motivo: "sem o bloco de preço" };
  const resto = texto.slice(inicioPreco);
  const fimPreco = resto.search(/Não tem milhas|Para adquirir|Datas de ida|Datas de volta/);
  const blocoPreco = fimPreco >= 0 ? resto.slice(0, fimPreco) : resto;

  const ida: Trecho[] = [];
  const volta: Trecho[] = [];
  const idaEVolta: Trecho[] = [];
  for (const m of blocoPreco.matchAll(/(?:^|[\s:])(Ida e volta|Ida|Volta):\s*([^\n]+)/g)) {
    const trechos = lerTrechos(m[2]);
    if (!trechos) return { ok: false, motivo: `preço "${m[1]}" fora do formato ("${m[2].trim().slice(0, 60)}")` };
    (m[1] === "Ida e volta" ? idaEVolta : m[1] === "Ida" ? ida : volta).push(...trechos);
  }
  if (!ida.length && !idaEVolta.length) return { ok: false, motivo: "sem o preço da ida" };

  const iDatasIda = texto.search(/Datas de ida:/);
  const iDatasVolta = texto.search(/Datas de volta:/);
  if (iDatasIda < 0) return { ok: false, motivo: "sem as datas de ida (mensagem cortada?)" };
  const fimDatas = (de: number) => {
    const depois = texto.slice(de);
    const fim = depois.search(/\n\s*@|\nObs:/);
    return fim >= 0 ? de + fim : texto.length;
  };
  const blocoIda = texto.slice(iDatasIda, iDatasVolta > iDatasIda ? iDatasVolta : fimDatas(iDatasIda));
  const datasIda = lerDatas(blocoIda);
  if (!datasIda) return { ok: false, motivo: "datas de ida fora do formato" };
  if (!datasIda.length) return { ok: false, motivo: "nenhuma data de ida" };
  let datasVolta: string[] = [];
  if (iDatasVolta >= 0) {
    const lidas = lerDatas(texto.slice(iDatasVolta, fimDatas(iDatasVolta)));
    if (!lidas) return { ok: false, motivo: "datas de volta fora do formato" };
    datasVolta = lidas;
  }
  if ((volta.length || idaEVolta.length) && !datasVolta.length) {
    return { ok: false, motivo: "tem preço de volta mas nenhuma data de volta (mensagem cortada?)" };
  }

  const cpm = (rotulo: string) => {
    const m = texto.match(new RegExp(`Preço de ${rotulo}:\\s*([\\d.,]+)`));
    return m ? reais(m[1]) : null;
  };

  return {
    ok: true,
    alerta: {
      classe,
      classeTexto,
      origem: origem[1],
      origemCidade: origem[2]?.trim() || null,
      destino: destino[1],
      destinoCidade: destino[2]?.trim() || null,
      programas,
      companhia,
      ida,
      volta,
      idaEVolta,
      datasIda,
      datasVolta,
      cpmIdaBrl: cpm("ida"),
      cpmVoltaBrl: cpm("volta"),
    },
  };
}

/**
 * O preço de um programa no alerta: os trechos que valem para ele. Um trecho
 * sem "pelo X" vale para o programa do cabeçalho — se o cabeçalho tem vários e
 * a linha um só preço, o preço vale para todos ("Finnair Plus ou Privilege
 * Club" com "13.000 Avios"). Vários preços sem dizer de quem: não dá para saber.
 */
export function trechoDoPrograma(trechos: Trecho[], programa: string, programas: string[]): Trecho | null | "ambiguo" {
  const alvo = normalizar(programa);
  const nomeados = trechos.filter((t) => t.programa);
  if (nomeados.length) {
    const achado = trechos.find((t) => t.programa && casaPrograma(t.programa, alvo));
    if (achado) return achado;
    // "… pela Finnair ou … pelo Privilege Club" e o cabeçalho diz "Finnair Plus":
    // sem o nome na linha, o programa não tem preço aqui.
    const semNome = trechos.filter((t) => !t.programa);
    return semNome.length === 1 && programas.length === 1 ? semNome[0] : null;
  }
  if (trechos.length === 1) return trechos[0];
  if (!trechos.length) return null;
  return "ambiguo";
}

/** "Finnair" casa com "Finnair Plus"; "Smiles" com "Smiles". */
function casaPrograma(escrito: string, alvo: string): boolean {
  const e = normalizar(escrito);
  return e === alvo || alvo.startsWith(`${e} `) || e.startsWith(`${alvo} `);
}
