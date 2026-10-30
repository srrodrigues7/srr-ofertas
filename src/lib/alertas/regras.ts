import { codigoDaCompanhia } from "@/lib/companhias";
import { mesDe } from "@/lib/datas";
import { ETIQUETAS, type Composicao, type OfertaNova } from "@/lib/coleta/molde";
import { linkSmiles } from "@/lib/coleta/fontes/smiles";
import { normalizar, trechoDoPrograma, type AlertaLido, type Trecho } from "./leitor";

/**
 * As REGRAS que decidem o que um alerta vira (V6). Puras, sem banco: quem lê
 * o banco e grava é `alertas.ts`. Decisões do Saulo (29–30/10/2026):
 *
 * - origem: as de `alerta_origem` (BSB sempre; GRU/GIG só internacional);
 * - programa: só os que `alerta_programa` liga a um programa do radar (hoje
 *   Smiles, Azul Fidelidade, Azul Pelo Mundo e LATAM Pass);
 * - classe: econômica e executiva (as classes do radar);
 * - uma oferta por MÊS de ida, com todas as datas de ida daquele mês e todas
 *   as voltas depois delas, para o cliente escolher; preço = ida + volta (a
 *   menor da faixa de cada uma), por pessoa;
 * - a taxa só entra quando o alerta a dá em reais; senão o preço sai "+ taxas"
 *   e a equipe confere;
 * - o preço em reais que o grupo anuncia é só referência interna.
 */

export const FONTE_ALERTA = "alerta_cpm";

export type Resultado =
  | "oferta"
  | "vencido"
  | "fora_origem"
  | "fora_programa"
  | "fora_classe"
  | "sem_datas"
  | "nao_entendido";

export type Contexto = {
  /** origem → só internacional? */
  origens: Map<string, boolean>;
  /** nome do programa normalizado → id do programa (null = fora). */
  programas: Map<string, string | null>;
  /** id do programa → nome, para a tela ("Smiles"). */
  nomesDosProgramas: Map<string, string>;
  /** Aeroportos do Brasil (para saber o que é nacional). */
  brasil: Set<string>;
  hoje: string;
  mensagemId: string;
  enviadaEm: Date;
  /** Passou da validade: entende tudo, mas não grava oferta. */
  vencido: boolean;
};

/** O que vai em `dados_fonte.alerta` — a visão da equipe (nada disto vai ao cliente). */
export type DadosDoAlerta = {
  mensagemId: string;
  enviadaEm: string;
  programaNoAlerta: string;
  datasIda: string[];
  datasVolta: string[];
  idaTexto: string;
  voltaTexto: string | null;
  /** O preço de venda que o GRUPO anuncia, em R$ sem taxas. Só referência. */
  cpmBrl: number | null;
  /** A taxa como veio quando não é em reais (a equipe confere). */
  taxaOutraMoeda: string | null;
  /** Depois da conferência no calendário da Smiles: as milhas (Clube, só ida)
   *  de cada data que sobrou — para o card dizer "N datas a este preço". */
  milhasPorDiaIda?: Record<string, number>;
  milhasPorDiaVolta?: Record<string, number>;
};

export type Decisao = {
  resultado: Resultado;
  motivo: string | null;
  ofertas: OfertaNova[];
  /** Os nomes de programa que o alerta usou e ainda não estão no cadastro. */
  programasNovos: string[];
};

const CLASSES_DA_VITRINE = new Set(["economica", "executiva"]);

export function decidir(a: AlertaLido, c: Contexto): Decisao {
  const programasNovos = a.programas.filter((p) => !c.programas.has(normalizar(p)));
  const fora = (resultado: Resultado, motivo: string): Decisao => ({ resultado, motivo, ofertas: [], programasNovos });

  const internacional = !c.brasil.has(a.destino) || !c.brasil.has(a.origem);
  const soInternacional = c.origens.get(a.origem);
  if (soInternacional === undefined) return fora("fora_origem", `sai de ${a.origem}`);
  if (soInternacional && !internacional) return fora("fora_origem", `${a.origem}→${a.destino} é nacional (de ${a.origem}, só internacional)`);

  const aceitos = a.programas
    .map((nome) => ({ nome, id: c.programas.get(normalizar(nome)) ?? null }))
    .filter((p): p is { nome: string; id: string } => p.id != null);
  if (!aceitos.length) return fora("fora_programa", a.programas.join(", "));

  if (!CLASSES_DA_VITRINE.has(a.classe)) return fora("fora_classe", a.classeTexto);

  const datasIda = a.datasIda.filter((d) => d >= c.hoje);
  if (!datasIda.length) return fora("sem_datas", "todas as datas de ida já passaram");

  const ofertas: OfertaNova[] = [];
  const problemas: string[] = [];
  const vistos = new Set<string>();
  for (const p of aceitos) {
    if (vistos.has(p.id)) continue; // "Azul Fidelidade" e "TudoAzul" no mesmo alerta
    vistos.add(p.id);
    const preco = precoDoPrograma(a, p.nome);
    if (typeof preco === "string") {
      problemas.push(`${p.nome}: ${preco}`);
      continue;
    }
    ofertas.push(...ofertasDoPrograma(a, p.id, p.nome, preco, datasIda, internacional, c));
  }
  if (!ofertas.length) {
    if (problemas.length) return { resultado: "nao_entendido", motivo: problemas.join("; "), ofertas: [], programasNovos };
    return fora("sem_datas", "nenhuma volta depois das datas de ida");
  }
  if (c.vencido) return { resultado: "vencido", motivo: "alerta mais velho que a validade", ofertas: [], programasNovos };
  return { resultado: "oferta", motivo: problemas.length ? problemas.join("; ") : null, ofertas, programasNovos };
}

type PrecoDoPrograma = { composicao: Composicao; ida: Trecho; volta: Trecho | null };

/** Os trechos que valem para um programa, ou o motivo de não dar. */
function precoDoPrograma(a: AlertaLido, nome: string): PrecoDoPrograma | string {
  if (a.idaEVolta.length) {
    const t = trechoDoPrograma(a.idaEVolta, nome, a.programas);
    if (t === "ambiguo") return "vários preços de ida e volta sem dizer de qual programa";
    if (!t) return "sem preço de ida e volta";
    return { composicao: "ida_volta", ida: t, volta: null };
  }
  const ida = trechoDoPrograma(a.ida, nome, a.programas);
  if (ida === "ambiguo") return "vários preços de ida sem dizer de qual programa";
  if (!ida) return "sem preço de ida";
  if (!a.datasVolta.length) return { composicao: "so_ida", ida, volta: null };
  const volta = trechoDoPrograma(a.volta, nome, a.programas);
  if (volta === "ambiguo") return "vários preços de volta sem dizer de qual programa";
  // A volta existe, mas não por este programa ("Volta: … pela Finnair ou …
  // pelo Privilege Club" e a ida também pela Smiles): pela Smiles, só a ida.
  if (!volta) return { composicao: "so_ida", ida, volta: null };
  return { composicao: "soma_trechos", ida, volta };
}

function ofertasDoPrograma(
  a: AlertaLido,
  programaId: string,
  programaNome: string,
  preco: PrecoDoPrograma,
  datasIda: string[],
  internacional: boolean,
  c: Contexto,
): OfertaNova[] {
  const idaEVolta = preco.composicao !== "so_ida";
  const milhas = preco.ida.quantidade + (preco.volta?.quantidade ?? 0);
  const taxas =
    preco.composicao === "soma_trechos"
      ? preco.ida.taxaBrl != null && preco.volta?.taxaBrl != null
        ? Math.round((preco.ida.taxaBrl + preco.volta.taxaBrl) * 100) / 100
        : null
      : preco.ida.taxaBrl;
  const outraMoeda = [preco.ida.taxaOutraMoeda, preco.volta?.taxaOutraMoeda].filter(Boolean).join(" + ") || null;
  const cpm =
    preco.composicao === "so_ida"
      ? a.cpmIdaBrl
      : a.cpmIdaBrl != null && a.cpmVoltaBrl != null
        ? a.cpmIdaBrl + a.cpmVoltaBrl
        : null;
  const companhias = companhiasDe(a.companhia);
  const nomeNoRadar = c.nomesDosProgramas.get(programaId) ?? programaNome;

  const porMes = new Map<string, string[]>();
  for (const d of datasIda) {
    const m = mesDe(d);
    if (!porMes.has(m)) porMes.set(m, []);
    porMes.get(m)!.push(d);
  }

  const ofertas: OfertaNova[] = [];
  for (const [mes, idas] of porMes) {
    // As voltas que servem para alguma ida do mês: depois da primeira ida.
    const voltas = idaEVolta ? a.datasVolta.filter((v) => v > idas[0]) : [];
    if (idaEVolta && !voltas.length) continue;
    const dados: DadosDoAlerta = {
      mensagemId: c.mensagemId,
      enviadaEm: c.enviadaEm.toISOString(),
      programaNoAlerta: programaNome,
      datasIda: idas,
      datasVolta: voltas,
      idaTexto: preco.ida.texto,
      voltaTexto: preco.volta?.texto ?? null,
      cpmBrl: cpm,
      taxaOutraMoeda: outraMoeda,
    };
    ofertas.push({
      fonteId: FONTE_ALERTA,
      tipo: "passagem",
      // Uma oferta por mês, com as datas em `dados_fonte.alerta`: o cliente escolhe.
      detalhe: "mes",
      origem: a.origem,
      origemCidade: a.origemCidade,
      destino: a.destino,
      destinoCidade: a.destinoCidade,
      internacional,
      mes,
      composicao: preco.composicao,
      classe: a.classe,
      companhias,
      companhiaNome: a.companhia,
      programaId,
      // O alerta não separa Clube de normal: o número dele vale para as duas
      // (o programa sem Clube — Azul, LATAM — usa a normal no custo).
      milhas,
      milhasNormal: milhas,
      taxasBrl: taxas,
      taxasEstimadas: false,
      bagagem: "nao_informada",
      localizador: { programa: programaId, origem: a.origem, destino: a.destino, classe: a.classe, datasIda: idas, datasVolta: voltas },
      etiquetas: [ETIQUETAS.alerta],
      fornecedor: nomeNoRadar,
      link:
        programaId === "smiles"
          ? linkSmiles(a.origem, a.destino, idas[0], voltas[0] ?? null, a.classe === "executiva")
          : null,
      dadosFonte: { alerta: dados },
      variante: `${programaId}|${normalizar(a.companhia ?? "-")}`,
    });
  }
  return ofertas;
}

/** "Copa Airlines ou Copa Airlines + Azul" → ["CM", "AD"]; nome desconhecido fica de fora. */
function companhiasDe(texto: string | null): string[] {
  if (!texto) return [];
  const codigos = new Set<string>();
  for (const parte of texto.split(/\s+ou\s+|\s*\+\s*|\s*,\s*/i)) {
    const nome = parte.trim();
    const codigo =
      codigoDaCompanhia(nome) ?? codigoDaCompanhia(nome.replace(/\s+(airlines|airline|airways|air lines|linhas aéreas)$/i, ""));
    if (codigo) codigos.add(codigo);
  }
  return [...codigos];
}
