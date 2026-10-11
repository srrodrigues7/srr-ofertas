import { prisma } from "@/lib/prisma";

/**
 * A trava do motor: só um motor trabalha por vez.
 *
 * É a mesma ideia do `automation_run` do VoePro — uma linha no banco com prazo
 * de validade —, com uma diferença: lá cada rodada pega e solta a trava; aqui o
 * motor que ganhou **fica** com ela e renova a cada batimento. Quem chega
 * depois vê o prazo no futuro e espera. Se o dono morrer sem soltar, o prazo
 * vence e o próximo assume, sem ninguém fazer nada.
 *
 * Todo prazo é medido com `now()` do banco. Dois computadores com relógios
 * diferentes não podem discordar sobre quem manda.
 */

export type Instancia = {
  id: string;
  maquina: string;
  pid: number;
  versao: string;
};

const ID = "motor";

/**
 * Pega a trava, ou renova se já for dono. Devolve se está com ela.
 *
 * O `UPDATE ... WHERE` é a resposta atômica: dois motores tentando ao mesmo
 * tempo caem em série no Postgres, e o segundo já vê o prazo no futuro.
 */
export async function pegarOuRenovar(eu: Instancia, validadeS: number): Promise<boolean> {
  // A linha nasce na migração. Se alguém a apagou, recria vazia — é estrutura
  // da casa, não configuração, então recriar não é adivinhar nada.
  await prisma.$executeRaw`
    INSERT INTO "ofertas"."motor_trava" (id) VALUES (${ID}) ON CONFLICT (id) DO NOTHING`;

  const linhas = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "ofertas"."motor_trava"
       SET dono = ${eu.id},
           maquina = ${eu.maquina},
           versao = ${eu.versao},
           travado_ate = now() + (${validadeS}::int * interval '1 second'),
           batimento_em = now(),
           assumiu_em = CASE WHEN dono IS DISTINCT FROM ${eu.id} THEN now() ELSE assumiu_em END
     WHERE id = ${ID}
       AND (dono = ${eu.id} OR travado_ate IS NULL OR travado_ate < now())
    RETURNING id`;
  return linhas.length > 0;
}

/**
 * Conta a próxima passada — e, de quebra, confere que a trava ainda é minha.
 * Devolve `null` se não for: nesse caso a passada não pode rodar.
 */
export async function proximaPassada(eu: Instancia): Promise<number | null> {
  const linhas = await prisma.$queryRaw<{ passada_n: number }[]>`
    UPDATE "ofertas"."motor_trava"
       SET passada_n = passada_n + 1, batimento_em = now()
     WHERE id = ${ID} AND dono = ${eu.id} AND travado_ate > now()
    RETURNING passada_n`;
  return linhas[0]?.passada_n ?? null;
}

/**
 * Solta a trava ao desligar, para outro motor assumir na hora em vez de
 * esperar o prazo vencer. O batimento fica onde estava: é ele que faz a tela de
 * Saúde ficar amarela e depois vermelha quando ninguém mais trabalha.
 */
export async function soltar(eu: Instancia): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "ofertas"."motor_trava"
       SET dono = NULL, travado_ate = NULL
     WHERE id = ${ID} AND dono = ${eu.id}`;
}

/** Quem está com a trava agora (para o log do motor que espera). */
export async function quemTrabalha(): Promise<string | null> {
  const linhas = await prisma.$queryRaw<{ maquina: string | null }[]>`
    SELECT maquina FROM "ofertas"."motor_trava"
     WHERE id = ${ID} AND travado_ate > now()`;
  return linhas[0]?.maquina ?? null;
}
