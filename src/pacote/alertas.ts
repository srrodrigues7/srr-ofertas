/**
 * O que as telas precisam saber dos alertas do WhatsApp (V6): a fonte e o que
 * o motor guarda em `dados_fonte.alerta`. O leitor e as regras dos alertas
 * ficam no motor (`src/lib/alertas/`), que importa estes dois daqui.
 */

export const FONTE_ALERTA = "alerta_cpm";

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
