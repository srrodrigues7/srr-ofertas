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
} as const;

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

export const CHAVES_DA_SAUDE = [
  "saude.amarelo_apos_s",
  "saude.vermelho_apos_s",
] as const satisfies readonly ChaveConfiguracao[];
