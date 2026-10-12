/**
 * O molde de oferta, do lado do código: o que TODO conector entrega.
 *
 * Um conector (Smiles, Melhores Destinos, e depois Cativa, Hoteldo,
 * consolidadoras…) fala com a sua fonte do jeito que ela permitir e devolve
 * `OfertaNova` e `PrecoNovo`. Quem grava (gravar.ts) não sabe de onde vieram.
 * A tabela correspondente é `ofertas.oferta` (prisma/schema.prisma), e o molde
 * está documentado em docs/etapas/README.md.
 *
 * Regras do molde:
 * - tudo POR PESSOA (adultos/criancas dizem para quantas pessoas o preço foi
 *   cotado; pacote é "preço fechado por pessoa");
 * - datas são texto ISO ("2027-03-10"); horas de voo são a hora local do
 *   aeroporto ("2027-03-10T19:25:00");
 * - o que a fonte não dá fica `null` — nunca um valor inventado;
 * - `etiquetas` são as características consultáveis (para casar com o gosto de
 *   um cliente no futuro): ver ETIQUETAS abaixo.
 */

export type TipoOferta = "passagem" | "pacote";
/** mes: só o menor preço do mês · dia: datas e preço · voo: voos, horários, taxas exatas. */
export type Detalhe = "mes" | "dia" | "voo";
/** ida_volta: a fonte vende o par · soma_trechos: a fonte cobra por trecho
 *  (Smiles em milhas — a soma É o preço real) · so_ida. Nunca apresentar soma
 *  de pernas de tarifa em dinheiro como ida e volta (lição 8 da HUB 92). */
export type Composicao = "ida_volta" | "soma_trechos" | "so_ida";
export type Classe = "economica" | "premium" | "executiva" | "primeira";
export type Bagagem = "despachada" | "so_mao" | "item_pessoal" | "nao_informada";
export type Regime = "all_inclusive" | "pensao_completa" | "meia_pensao" | "cafe" | "sem_refeicao";

export type OfertaNova = {
  fonteId: string;
  buscaId?: number | null;
  tipo: TipoOferta;
  detalhe: Detalhe;

  origem: string;
  origemCidade?: string | null;
  destino: string;
  destinoCidade?: string | null;
  destinoUf?: string | null;
  destinoPais?: string | null;
  destinoRegiao?: string | null;
  internacional: boolean;

  /** "2027-03". Obrigatório mesmo quando não há data (detalhe "mes"). */
  mes: string;
  ida?: string | null;
  volta?: string | null;
  noites?: number | null;
  composicao: Composicao;

  classe: Classe;
  companhias: string[];
  companhiaNome?: string | null;

  programaId?: string | null;
  milhas?: number | null;
  milhasNormal?: number | null;
  taxasBrl?: number | null;
  taxasEstimadas?: boolean;
  precoBrl?: number | null;
  precoReferenciaBrl?: number | null;
  parcelasFonte?: number | null;

  bagagem: Bagagem;
  bagagemQtd?: number | null;

  idaSaida?: string | null;
  idaChegada?: string | null;
  idaParadas?: number | null;
  idaDuracaoMin?: number | null;
  idaVoos?: string | null;
  voltaSaida?: string | null;
  voltaChegada?: string | null;
  voltaParadas?: number | null;
  voltaDuracaoMin?: number | null;
  voltaVoos?: string | null;
  assentos?: number | null;

  hotelNome?: string | null;
  hotelCategoria?: number | null;
  regime?: Regime | null;
  adultos?: number;
  criancas?: number;
  aceitaCrianca?: boolean | null;
  estilo?: string | null;

  etiquetas: string[];
  fornecedor?: string | null;
  link?: string | null;
  dadosFonte?: unknown;
};

/** Um preço para o histórico (`ofertas.preco_observado`). */
export type PrecoNovo = {
  fonteId: string;
  /** trecho: só ida, um dia · ida_volta: um par de datas · mes: menor do mês. */
  tipo: "trecho" | "ida_volta" | "mes";
  origem: string;
  destino: string;
  classe: Classe;
  mes: string;
  ida?: string | null;
  volta?: string | null;
  unidade: "milhas" | "brl";
  valor: number;
  programaId?: string | null;
  companhia?: string | null;
};

/** O que se sabe de um lugar, contado pela fonte (completa `ofertas.lugar`). */
export type LugarVisto = {
  codigo: string;
  cidade: string;
  uf?: string | null;
  pais?: string | null;
  regiao?: string | null;
};

/**
 * A identidade de uma oferta: vista de novo, a mesma linha é atualizada.
 * Fonte, tipo, rota, classe, datas (ou o mês) e, para pacote, o hotel e o
 * regime. O voo NÃO entra: para um par de datas guardamos o melhor voo, e ele
 * pode mudar sem virar outra oferta.
 */
export function chaveDaOferta(o: OfertaNova): string {
  const quando = o.detalhe === "mes" ? `${o.mes}|mes` : `${o.ida ?? "-"}|${o.volta ?? "-"}`;
  const partes = [o.fonteId, o.tipo, o.origem, o.destino, o.classe, quando];
  if (o.tipo === "pacote") partes.push(o.hotelNome ?? "-", o.regime ?? "-", String(o.adultos ?? 1), String(o.criancas ?? 0));
  return partes.join("|");
}

export function chaveDoPreco(p: PrecoNovo): string {
  return [p.fonteId, p.tipo, p.origem, p.destino, p.classe, p.ida ?? p.mes, p.volta ?? "-", p.unidade].join("|");
}

/**
 * Etiquetas que o sistema entende hoje. Livres para crescer (V1b: regime,
 * praia…); o importante é serem palavras fixas, não frases.
 */
export const ETIQUETAS = {
  direto: "direto",
  bagagem: "bagagem",
  executiva: "executiva",
  milhas: "milhas",
  internacional: "internacional",
} as const;

/** As etiquetas que se deduzem dos próprios campos da oferta. */
export function etiquetasDeduzidas(o: OfertaNova): string[] {
  const e = new Set(o.etiquetas);
  if (o.idaParadas === 0 && (o.composicao === "so_ida" || o.voltaParadas === 0)) e.add(ETIQUETAS.direto);
  if (o.bagagem === "despachada") e.add(ETIQUETAS.bagagem);
  if (o.classe === "executiva" || o.classe === "primeira") e.add(ETIQUETAS.executiva);
  if (o.milhas != null) e.add(ETIQUETAS.milhas);
  if (o.internacional) e.add(ETIQUETAS.internacional);
  if (o.regime) e.add(o.regime);
  if (o.estilo) e.add(o.estilo);
  return [...e].sort();
}
