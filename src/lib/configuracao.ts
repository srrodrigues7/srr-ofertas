import { prisma } from "@/lib/prisma";
import { ErroDeConfiguracao } from "@/lib/erros";

/**
 * A configuração mora na tabela `ofertas.configuracao`, não no código.
 *
 * Este catálogo diz só **quais** chaves existem e o que é um valor válido. Os
 * valores em si nasceram na migração inicial e se editam no banco (e, mais
 * adiante, no painel). Não há valor padrão aqui de propósito: se uma chave
 * sumir ou vier errada, quem lê para e diz qual é — nunca chuta.
 */
const CATALOGO = {
  "motor.intervalo_s": { min: 10, max: 3600 },
  "motor.trava_validade_s": { min: 30, max: 3600 },
  "saude.amarelo_apos_s": { min: 30, max: 86400 },
  "saude.vermelho_apos_s": { min: 60, max: 86400 },
  "passadas.guardar_dias": { min: 1, max: 3650 },
  // V1a — coleta, vitrine e preço
  "coleta.max_segundos_por_passada": { min: 10, max: 900 },
  "coleta.pedidos_a_cada_s": { min: 1, max: 60 },
  "coleta.pausa_apos_bloqueio_min": { min: 1, max: 1440 },
  "historico.guardar_dias": { min: 30, max: 3650 },
  "ofertas.validade_horas": { min: 1, max: 720 },
  "parcelas.destaque": { min: 1, max: 24 },
  "busca.estadia_min_padrao": { min: 1, max: 60 },
  "busca.estadia_max_padrao": { min: 1, max: 90 },
  "smiles.pausa_ms": { min: 500, max: 60000 },
  "smiles.prazo_s": { min: 5, max: 120 },
  "smiles.combinacoes_por_mes": { min: 1, max: 50 },
  "smiles.taxa_estimada_nacional_brl": { min: 0, max: 5000 },
  "smiles.taxa_estimada_internacional_brl": { min: 0, max: 20000 },
  "md.intervalo_horas": { min: 1, max: 168 },
  "md.pausa_ms": { min: 500, max: 60000 },
  "md.prazo_s": { min: 5, max: 120 },
  "md.datas_por_mes": { min: 1, max: 100 },
  "md.estadia_min": { min: 1, max: 60 },
  "md.estadia_max": { min: 1, max: 90 },
  // V1b — Cativa e o revalidador automático
  "cativa.intervalo_horas": { min: 1, max: 48 },
  "cativa.prazo_s": { min: 10, max: 300 },
  "cativa.pagina_parada_dias": { min: 1, max: 30 },
  "revalidador.ligado": { min: 0, max: 1 },
  "revalidador.mais_baratas_por_destino": { min: 0, max: 20 },
  "revalidador.reconferir_horas": { min: 1, max: 72 },
  "revalidador.pausa_s": { min: 5, max: 600 },
  "revalidador.teto_dia": { min: 1, max: 1000 },
  "revalidador.hora_inicio": { min: 0, max: 23 },
  "revalidador.hora_fim": { min: 1, max: 24 },
  "revalidador.prazo_s": { min: 30, max: 600 },
  "revalidador.codigo_espera_s": { min: 30, max: 900 },
} as const;

/** Os limites de cada chave, para a tela de Valores validar antes de gravar. */
export function limitesDe(chave: string): { min: number; max: number } | null {
  return (CATALOGO as Record<string, { min: number; max: number }>)[chave] ?? null;
}

export type ChaveConfiguracao = keyof typeof CATALOGO;
export type Configuracao<K extends ChaveConfiguracao> = Record<K, number>;

/** Lê as chaves pedidas. Junta todos os problemas numa mensagem só. */
export async function lerConfiguracao<K extends ChaveConfiguracao>(
  chaves: readonly K[],
): Promise<Configuracao<K>> {
  const linhas = await prisma.configuracao.findMany({
    where: { chave: { in: [...chaves] } },
    select: { chave: true, valor: true },
  });
  const porChave = new Map(linhas.map((l) => [l.chave, l.valor]));

  const problemas: string[] = [];
  const saida = {} as Configuracao<K>;

  for (const chave of chaves) {
    const { min, max } = CATALOGO[chave];
    if (!porChave.has(chave)) {
      problemas.push(`${chave} não existe`);
      continue;
    }
    const valor = porChave.get(chave);
    if (typeof valor !== "number" || !Number.isInteger(valor) || valor < min || valor > max) {
      problemas.push(`${chave} = ${JSON.stringify(valor)} (precisa ser um número inteiro de ${min} a ${max})`);
      continue;
    }
    saida[chave] = valor;
  }

  if (problemas.length) {
    throw new ErroDeConfiguracao(
      `Configuração incompleta na tabela ofertas.configuracao: ${problemas.join("; ")}.`,
    );
  }
  return saida;
}

export const CHAVES_DO_MOTOR = [
  "motor.intervalo_s",
  "motor.trava_validade_s",
  "passadas.guardar_dias",
] as const satisfies readonly ChaveConfiguracao[];

/** O que a coleta precisa. Faltando uma, a coleta não roda e diz qual falta
 *  (o motor continua de pé; a Saúde mostra). */
export const CHAVES_DA_COLETA = [
  "coleta.max_segundos_por_passada",
  "coleta.pedidos_a_cada_s",
  "coleta.pausa_apos_bloqueio_min",
  "historico.guardar_dias",
  "ofertas.validade_horas",
  "smiles.pausa_ms",
  "smiles.prazo_s",
  "smiles.combinacoes_por_mes",
  "smiles.taxa_estimada_nacional_brl",
  "smiles.taxa_estimada_internacional_brl",
  "md.intervalo_horas",
  "md.pausa_ms",
  "md.prazo_s",
  "md.datas_por_mes",
  "md.estadia_min",
  "md.estadia_max",
] as const satisfies readonly ChaveConfiguracao[];

export type ConfiguracaoDaColeta = Configuracao<(typeof CHAVES_DA_COLETA)[number]>;

/** O que a vitrine precisa para mostrar preço e validade. */
export const CHAVES_DA_VITRINE = [
  "ofertas.validade_horas",
  "parcelas.destaque",
  "smiles.taxa_estimada_nacional_brl",
  "smiles.taxa_estimada_internacional_brl",
] as const satisfies readonly ChaveConfiguracao[];

export const CHAVES_DA_SAUDE = [
  "saude.amarelo_apos_s",
  "saude.vermelho_apos_s",
] as const satisfies readonly ChaveConfiguracao[];
