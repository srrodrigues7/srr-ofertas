import { pedirReleituraDosAlertas } from "@/pacote/gravacoes";
import { Prisma } from "@/generated/ofertas/client";
import { prisma } from "@/lib/prisma";
import { lerConfiguracao } from "@/pacote/configuracao";
import { hoje } from "@/pacote/datas";
import { mensagemDe } from "@/pacote/erros";
import { gravarOfertas } from "@/lib/coleta/gravar";
import { chaveDaOferta } from "@/lib/coleta/molde";
import type { Log } from "@/lib/coleta/nucleo";
import { lerAlerta, normalizar } from "./leitor";
import { passarPonte } from "./ponte";
import { decidir, FONTE_ALERTA, type Contexto, type Decisao } from "./regras";
import { conferirAlertas } from "./conferencia";

/**
 * Os alertas do WhatsApp no motor (V6). A cada passada:
 *
 * 1. a ponte traz as mensagens novas do arquivo do monitor (se ele estiver
 *    neste computador);
 * 2. o leitor entende cada mensagem que falta ler, as regras decidem, e as
 *    ofertas vão para o molde por `gravarOfertas` (o único caminho);
 * 3. as ofertas de alerta mais velhas que `alertas.validade_horas` saem;
 * 4. as de Smiles econômica são conferidas no calendário aberto da Smiles.
 *
 * Cada mensagem guarda o resultado (oferta, vencido, fora de origem, fora de
 * programa, fora de classe, sem datas, não entendido) e o motivo: é o que a
 * Saúde conta e o que se confere depois.
 */

/** Mensagens lidas por vez (cabe folgado numa passada). */
const LOTE = 200;

export async function processarAlertas(opcoes: { ate: number; log: Log }): Promise<string> {
  const partes: string[] = [];
  const ponte = await passarPonte();
  if (ponte.texto) partes.push(ponte.texto);
  // Fonte desligada em Valores: a ponte segue guardando, mas nada vira oferta.
  const fonte = await prisma.fonte.findUnique({ where: { id: FONTE_ALERTA }, select: { ligada: true } });
  if (fonte?.ligada) {
    const lidas = await lerPendentes();
    if (lidas.texto) partes.push(lidas.texto);
  }
  const saiu = await faxinaDosAlertas();
  if (saiu) partes.push(`${saiu} oferta(s) de alerta venceram`);
  try {
    const conferidas = await conferirAlertas(opcoes);
    if (conferidas) partes.push(conferidas);
  } catch (e) {
    opcoes.log.aviso(`Alertas: a conferência falhou: ${mensagemDe(e)}`);
  }
  return partes.length ? `Alertas: ${partes.join("; ")}.` : "";
}

/** O que o leitor precisa saber do banco (lido uma vez por lote). */
async function contexto(): Promise<Omit<Contexto, "mensagemId" | "enviadaEm" | "vencido">> {
  const [origens, programas, nomes, lugares] = await Promise.all([
    prisma.alertaOrigem.findMany(),
    prisma.alertaPrograma.findMany({ select: { nome: true, programaId: true } }),
    prisma.programa.findMany({ select: { id: true, nome: true } }),
    prisma.lugar.findMany({ select: { codigo: true, pais: true } }),
  ]);
  return {
    origens: new Map(origens.map((o) => [o.codigo, o.soInternacional])),
    programas: new Map(programas.map((p) => [p.nome, p.programaId])),
    nomesDosProgramas: new Map(nomes.map((p) => [p.id, p.nome])),
    brasil: new Set(lugares.filter((l) => l.pais === "Brasil").map((l) => l.codigo)),
    exterior: new Set(lugares.filter((l) => l.pais !== "Brasil").map((l) => l.codigo)),
    hoje: hoje(),
  };
}

/** Lê as mensagens que faltam ler (as mais antigas primeiro). */
export async function lerPendentes(): Promise<{ lidas: number; ofertas: number; texto: string }> {
  const { "alertas.validade_horas": validade } = await lerConfiguracao(["alertas.validade_horas"]);
  const pendentes = await prisma.alertaMensagem.findMany({
    where: { lidaEm: null },
    orderBy: { enviadaEm: "asc" },
    take: LOTE,
  });
  if (!pendentes.length) return { lidas: 0, ofertas: 0, texto: "" };
  const base = await contexto();
  const limite = Date.now() - validade * 3_600_000;
  const contagem: Record<string, number> = {};
  let ofertas = 0;

  for (const m of pendentes) {
    const leitura = lerAlerta(m.texto);
    let decisao: Decisao;
    if (!leitura.ok) {
      decisao = { resultado: "nao_entendido", motivo: leitura.motivo, ofertas: [], programasNovos: [] };
    } else {
      decisao = decidir(leitura.alerta, {
        ...base,
        mensagemId: m.id,
        enviadaEm: m.enviadaEm,
        vencido: m.enviadaEm.getTime() < limite,
      });
      // Conta só na primeira leitura (reler depois de mudar uma regra não soma de novo).
      await registrarProgramas(leitura.alerta.programas, base.programas, m.resultado == null);
    }

    // O mesmo texto já tinha chegado antes? Grava assim mesmo: renova o prazo.
    const repetida =
      (await prisma.alertaMensagem.count({
        where: { assinatura: m.assinatura, id: { not: m.id }, lidaEm: { not: null }, enviadaEm: { lte: m.enviadaEm } },
      })) > 0;
    let gravadas = 0;
    if (decisao.ofertas.length) gravadas = await gravarDoAlerta(decisao, m.enviadaEm, validade);
    ofertas += gravadas;
    contagem[decisao.resultado] = (contagem[decisao.resultado] ?? 0) + 1;

    await prisma.alertaMensagem.update({
      where: { id: m.id },
      data: {
        lidaEm: new Date(),
        resultado: decisao.resultado,
        motivo: decisao.motivo?.slice(0, 500) ?? null,
        repetida,
        ofertas: gravadas,
        entendido: leitura.ok ? (resumoDoAlerta(leitura.alerta) as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  }

  const texto =
    `${pendentes.length} alerta(s) lido(s) (` +
    Object.entries(contagem)
      .map(([r, n]) => `${n} ${ROTULOS[r] ?? r}`)
      .join(", ") +
    `), ${ofertas} oferta(s) gravada(s)`;
  return { lidas: pendentes.length, ofertas, texto };
}

/**
 * Grava as ofertas e acerta o "visto em" para a hora em que o GRUPO postou: a
 * validade conta do alerta, não de quando o radar leu (motor desligado umas
 * horas não pode esticar o prazo). Um alerta repetido mais novo renova.
 */
async function gravarDoAlerta(decisao: Decisao, enviadaEm: Date, validadeHoras: number): Promise<number> {
  const chaves = decisao.ofertas.map(chaveDaOferta);
  // Só conta o que ainda estava dentro da validade (ativa, ou recém-tirada
  // por uma releitura); oferta velha não empresta prazo nem taxa.
  const recente = new Date(Date.now() - validadeHoras * 3_600_000);
  const antes = new Map(
    (
      await prisma.oferta.findMany({
        where: { chave: { in: chaves }, vistaEm: { gte: recente } },
        select: { chave: true, vistaEm: true, taxasBrl: true },
      })
    ).map((o) => [o.chave, o]),
  );
  const novas = new Map(decisao.ofertas.map((o) => [chaveDaOferta(o), o]));
  const gravadas = await gravarOfertas(decisao.ofertas, null);
  for (const chave of gravadas) {
    const anterior = antes.get(chave);
    const vistaEm = anterior && anterior.vistaEm > enviadaEm ? anterior.vistaEm : enviadaEm;
    // A taxa que a equipe conferiu ("Conferi") não se perde quando o mesmo
    // alerta, sem taxa em reais, é postado de novo.
    const manterTaxa = anterior?.taxasBrl != null && novas.get(chave)?.taxasBrl == null;
    await prisma.oferta.update({
      where: { chave },
      data: { vistaEm, ...(manterTaxa ? { taxasBrl: anterior.taxasBrl } : {}) },
    });
  }
  return gravadas.length;
}

export const ROTULOS: Record<string, string> = {
  oferta: "viraram oferta",
  vencido: "vencidos",
  fora_origem: "fora de origem",
  fora_programa: "fora de programa",
  fora_classe: "fora de classe",
  sem_datas: "sem datas",
  nao_entendido: "não entendidos",
};

/** Conta cada programa que aparece nos alertas; um nome novo entra sem
 *  programa (fora da vitrine) e aparece em Valores para o Saulo decidir. */
async function registrarProgramas(nomes: string[], conhecidos: Map<string, string | null>, contar: boolean): Promise<void> {
  for (const exemplo of nomes) {
    const nome = normalizar(exemplo);
    if (!contar && conhecidos.has(nome)) continue;
    await prisma.alertaPrograma.upsert({
      where: { nome },
      create: { nome, exemplo, vezes: contar ? 1 : 0, vistoEm: new Date() },
      update: contar ? { vezes: { increment: 1 }, vistoEm: new Date() } : {},
    });
    if (!conhecidos.has(nome)) conhecidos.set(nome, null);
  }
}

/** Reconta, do zero, em quantos alertas guardados cada programa apareceu. */
export async function recontarProgramas(): Promise<void> {
  const mensagens = await prisma.alertaMensagem.findMany({ select: { entendido: true } });
  const vezes = new Map<string, number>();
  for (const m of mensagens) {
    const programas = (m.entendido as { programas?: string[] } | null)?.programas ?? [];
    for (const p of new Set(programas.map(normalizar))) vezes.set(p, (vezes.get(p) ?? 0) + 1);
  }
  for (const p of await prisma.alertaPrograma.findMany({ select: { nome: true, vezes: true } })) {
    const n = vezes.get(p.nome) ?? 0;
    if (n !== p.vezes) await prisma.alertaPrograma.update({ where: { nome: p.nome }, data: { vezes: n } });
  }
}

/** O que o leitor entendeu, para conferir depois (sem o texto deles). */
function resumoDoAlerta(a: Extract<ReturnType<typeof lerAlerta>, { ok: true }>["alerta"]) {
  return {
    rota: `${a.origem}→${a.destino}`,
    classe: a.classe,
    programas: a.programas,
    companhia: a.companhia,
    ida: a.ida.map((t) => ({ programa: t.programa, milhas: t.quantidade, ate: t.quantidadeAte, taxaBrl: t.taxaBrl, outraMoeda: t.taxaOutraMoeda })),
    volta: a.volta.map((t) => ({ programa: t.programa, milhas: t.quantidade, ate: t.quantidadeAte, taxaBrl: t.taxaBrl, outraMoeda: t.taxaOutraMoeda })),
    idaEVolta: a.idaEVolta.map((t) => ({ programa: t.programa, milhas: t.quantidade, taxaBrl: t.taxaBrl })),
    datasIda: a.datasIda.length,
    datasVolta: a.datasVolta.length,
    primeiraIda: a.datasIda[0] ?? null,
    ultimaIda: a.datasIda.at(-1) ?? null,
  };
}

/** Oferta de alerta vence em `alertas.validade_horas` (disponibilidade em
 *  milhas some rápido); o mesmo alerta postado de novo renova o prazo. */
export async function faxinaDosAlertas(): Promise<number> {
  const { "alertas.validade_horas": horas } = await lerConfiguracao(["alertas.validade_horas"]);
  return prisma.$executeRaw`
    UPDATE "ofertas"."oferta" SET ativa = false
     WHERE ativa AND fonte_id = ${FONTE_ALERTA} AND vista_em < now() - (${horas}::int * interval '1 hour')`;
}

/** Lê de novo todas as mensagens guardadas (para o relatório): marca como
 *  "falta ler"; o motor (ou `npm run alertas`) lê. */
export async function marcarTodasParaLerDeNovo(): Promise<number> {
  return prisma.$executeRaw`UPDATE "ofertas"."alerta_mensagem" SET lida_em = NULL`;
}

/**
 * Uma regra mudou em Valores (origem ou programa): a vitrine passa a valer a
 * regra nova NA HORA. Tira as ofertas de alerta e lê de novo os alertas que
 * ainda podem virar oferta (dentro da validade) e os de hoje (a Saúde conta).
 * Os que voltam a valer voltam com a conferência que tinham.
 */
export async function relerRecentes(): Promise<number> {
  // A mesma marcação que a tela de Valores usa (pacote); aqui o motor já relê na hora.
  await pedirReleituraDosAlertas();
  let lidas = 0;
  for (;;) {
    const r = await lerPendentes();
    if (!r.lidas) break;
    lidas += r.lidas;
  }
  return lidas;
}
