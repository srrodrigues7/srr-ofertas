import { prisma } from "@/lib/prisma";
import { mensagemDe } from "@/lib/erros";
import { FonteRecusou, type Contador } from "./http";

/**
 * O núcleo do coletor: "ir à fonte e voltar", registrar e decidir o que está
 * vencido. NÃO sabe o que está sendo coletado — passagem, pacote ou, no
 * futuro, bônus de transferência de milhas (docs/ideias/radar-de-milhas.md).
 * Quem sabe é o módulo de cada assunto (passagens.ts), que monta as tarefas.
 *
 * Toda ida a uma fonte vira uma linha em `ofertas.coleta` (fonte, escopo,
 * quando, quanto tempo, quantas requisições, ok/vazio/erro/bloqueado). Uma
 * tarefa que falha não derruba as outras nem o motor.
 */

export type Log = { info: (m: string) => void; aviso: (m: string) => void; erro: (m: string) => void };

/** O que uma tarefa devolve: quantos itens gravou (ofertas, por exemplo),
 *  quantos registros de histórico e uma frase para a tela de Saúde. */
export type Resultado = { itens: number; historico: number; resumo: string };

export type Tarefa = {
  fonteId: string;
  /** Livre para cada assunto (calendario, detalhe, varredura, datas…). */
  tipo: string;
  /** O que exatamente foi buscado. A última coleta de cada escopo diz se venceu. */
  escopo: string;
  buscaId?: number;
  /** Quanto maior, antes. Em geral, quantos intervalos de atraso (ver `vencimento`). */
  prioridade: number;
  /** Quanto costuma levar (s): não começa se não couber no tempo da passada. */
  custoS: number;
  rodar: (base: { contador: Contador; coletaId: bigint }) => Promise<Resultado>;
  /** Chamado quando a tarefa falha (ex.: fechar um navegador num estado ruim). */
  aoFalhar?: () => Promise<void>;
};

export type Status = "ok" | "vazio" | "erro" | "bloqueado";

export async function executar(t: Tarefa, motivo: "agenda" | "agora", log: Log): Promise<Status> {
  const [linha] = await prisma.$queryRaw<{ id: bigint }[]>`
    INSERT INTO "ofertas"."coleta" (fonte_id, busca_id, tipo, escopo, motivo, status)
    VALUES (${t.fonteId}, ${t.buscaId ?? null}, ${t.tipo}, ${t.escopo}, ${motivo}, 'rodando')
    RETURNING id`;
  const contador: Contador = { requisicoes: 0 };
  const inicio = performance.now();
  let status: Status = "ok";
  let r: Resultado = { itens: 0, historico: 0, resumo: "" };
  let erro: string | null = null;
  try {
    r = await t.rodar({ contador, coletaId: linha.id });
    if (r.itens === 0 && r.historico === 0) status = "vazio";
  } catch (e) {
    status = e instanceof FonteRecusou ? "bloqueado" : "erro";
    erro = mensagemDe(e).slice(0, 1000);
    log.aviso(`Coleta ${t.fonteId} ${t.escopo}: ${erro}`);
    try {
      await t.aoFalhar?.();
    } catch (e2) {
      log.aviso(`Depois da falha, não consegui arrumar a casa: ${mensagemDe(e2)}`);
    }
  }
  await prisma.coleta.update({
    where: { id: linha.id },
    data: {
      terminouEm: new Date(),
      duracaoMs: Math.round(performance.now() - inicio),
      status,
      requisicoes: contador.requisicoes,
      itens: r.itens,
      historico: r.historico,
      resumo: r.resumo.slice(0, 500) || null,
      erro,
    },
  });
  return status;
}

/** Faz as tarefas, a mais atrasada primeiro, até o prazo. Fonte que recusa o
 *  acesso sai do resto da passada. */
export async function rodarAgenda(
  tarefas: Tarefa[],
  ate: number,
  log: Log,
): Promise<{ feitas: number; erros: number; total: number }> {
  tarefas.sort((a, b) => b.prioridade - a.prioridade);
  const recusadas = new Set<string>();
  let feitas = 0;
  let erros = 0;
  for (const t of tarefas) {
    if (recusadas.has(t.fonteId)) continue;
    if (Date.now() + t.custoS * 1000 > ate) continue;
    const status = await executar(t, "agenda", log);
    feitas++;
    if (status === "erro" || status === "bloqueado") erros++;
    if (status === "bloqueado") recusadas.add(t.fonteId);
  }
  return { feitas, erros, total: tarefas.length };
}

/** A última coleta de cada escopo de uma fonte (os últimos 8 dias bastam). */
export async function ultimasColetas(fonteId: string): Promise<Map<string, { em: Date; status: string }>> {
  const linhas = await prisma.$queryRaw<{ escopo: string; comecou_em: Date; status: string }[]>`
    SELECT DISTINCT ON (escopo) escopo, comecou_em, status
      FROM "ofertas"."coleta"
     WHERE fonte_id = ${fonteId} AND comecou_em > now() - interval '8 days'
     ORDER BY escopo, comecou_em DESC`;
  return new Map(linhas.map((l) => [l.escopo, { em: l.comecou_em, status: l.status }]));
}

/**
 * Um escopo venceu? `null` = ainda não. Vencido, devolve a prioridade: 1 na
 * hora em que vence (ou se nunca foi feito), 2 com um intervalo inteiro de
 * atraso, e assim por diante. Medir em intervalos, e não em horas, impede que
 * o que se busca de 24 em 24 h passe na frente do que se busca de 6 em 6 h.
 * Depois de um erro, tenta de novo em até 30 minutos.
 */
export function vencimento(ultima: { em: Date; status: string } | undefined, intervaloMs: number): number | null {
  if (!ultima) return 1;
  const espera = ultima.status === "erro" ? Math.min(intervaloMs, 30 * 60_000) : intervaloMs;
  const passou = Date.now() - (ultima.em.getTime() + espera);
  return passou < 0 ? null : 1 + passou / intervaloMs;
}

/** A fonte recusou o acesso nos últimos `minutos`? Então fica em paz. */
export async function fontePausada(fonteId: string, minutos: number): Promise<boolean> {
  const n = await prisma.coleta.count({
    where: { fonteId, status: "bloqueado", comecouEm: { gt: new Date(Date.now() - minutos * 60_000) } },
  });
  return n > 0;
}

export async function fontesLigadas(): Promise<Set<string>> {
  const fontes = await prisma.fonte.findMany({ where: { ligada: true }, select: { id: true } });
  return new Set(fontes.map((f) => f.id));
}

/** Coletas que ficaram "rodando" porque o motor caiu no meio. */
export async function limparInterrompidas(): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "ofertas"."coleta" SET status = 'erro', terminou_em = now(),
           erro = 'Interrompida: o motor caiu ou foi desligado no meio desta coleta.'
     WHERE status = 'rodando' AND comecou_em < now() - interval '15 minutes'`;
}
