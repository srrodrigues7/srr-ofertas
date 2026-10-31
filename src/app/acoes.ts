"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { limitesDe } from "@/lib/configuracao";
import { exigirAcesso } from "@/lib/acesso/acesso";

/**
 * O que o painel grava. Toda ação começa por exigirAcesso() (L0): uma ação de
 * servidor é um endereço público, e a porta tem de estar em cada uma.
 * Toda entrada é conferida antes de gravar.
 */

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
function numero(f: FormData, k: string): number | null {
  const v = texto(f, k).replace(/\./g, "").replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
const codigo = (v: string) => (/^[A-Z]{3}$/.test(v.toUpperCase()) ? v.toUpperCase() : null);

/** "Buscar agora": entra na fila; o motor pega em segundos. Clicar de novo não duplica. */
export async function buscarAgora(buscaId: number) {
  await exigirAcesso();
  await prisma.$executeRaw`
    INSERT INTO "ofertas"."busca_agora" (busca_id) VALUES (${buscaId})
    ON CONFLICT DO NOTHING`;
  refresh();
}

/** "Conferir agora" (V1b): o robô confere a oferta no portal da fonte. Entra na
 *  fila; o motor atende. Clicar de novo não duplica (índice único parcial). */
export async function conferirAgora(ofertaId: string) {
  await exigirAcesso();
  if (!/^\d{1,19}$/.test(ofertaId)) throw new Error("Oferta inválida.");
  await prisma.$executeRaw`
    INSERT INTO "ofertas"."conferencia_pedido" (oferta_id, motivo) VALUES (${BigInt(ofertaId)}, 'botao')
    ON CONFLICT DO NOTHING`;
  refresh();
}

export async function salvarBusca(f: FormData) {
  await exigirAcesso();
  const origem = codigo(texto(f, "origem"));
  const destino = codigo(texto(f, "destino"));
  const estadiaMin = numero(f, "estadiaMin");
  const estadiaMax = numero(f, "estadiaMax");
  const classe = texto(f, "classe") === "executiva" ? "executiva" : "economica";
  if (!origem || !destino || origem === destino) throw new Error("Origem e destino: códigos de 3 letras, diferentes.");
  if (estadiaMin == null || estadiaMax == null || estadiaMin < 1 || estadiaMax < estadiaMin || estadiaMax > 90) {
    throw new Error("Estadia: mínimo de 1 dia, e o máximo não pode ser menor que o mínimo.");
  }
  const cidade = texto(f, "cidade");
  if (cidade) {
    await prisma.lugar.upsert({ where: { codigo: destino }, create: { codigo: destino, cidade }, update: {} });
  }
  await prisma.busca.create({
    data: { origem, destino, estadiaMin, estadiaMax, classe, idaVolta: texto(f, "soIda") !== "on" },
  });
  refresh();
}

export async function alternarBusca(id: number, ligada: boolean) {
  await exigirAcesso();
  await prisma.busca.update({ where: { id }, data: { ligada } });
  refresh();
}

export async function apagarBusca(id: number) {
  await exigirAcesso();
  await prisma.busca.delete({ where: { id } });
  refresh();
}

export async function salvarPrograma(f: FormData) {
  await exigirAcesso();
  const id = texto(f, "id");
  const preco = numero(f, "precoMilheiro");
  if (preco != null && (preco <= 0 || preco > 500)) throw new Error("Milheiro: entre R$ 0,01 e R$ 500.");
  await prisma.programa.update({ where: { id }, data: { precoMilheiro: preco, usaClube: texto(f, "usaClube") === "on" } });
  refresh();
}

export async function salvarMargem(f: FormData) {
  await exigirAcesso();
  const tipo = texto(f, "tipo");
  const percentual = numero(f, "percentual");
  const minimo = numero(f, "minimo");
  if (percentual == null || percentual < 0 || percentual > 100 || minimo == null || minimo < 0) {
    throw new Error("Margem: percentual de 0 a 100 e mínimo a partir de R$ 0.");
  }
  await prisma.margem.upsert({
    where: { tipo },
    create: { tipo, percentual, minimoBrl: minimo },
    update: { percentual, minimoBrl: minimo },
  });
  refresh();
}

export async function salvarParcela(f: FormData) {
  await exigirAcesso();
  const parcelas = numero(f, "parcelas");
  const taxa = numero(f, "taxa");
  if (parcelas == null || !Number.isInteger(parcelas) || parcelas < 1 || parcelas > 24) throw new Error("Parcelas: de 1 a 24.");
  if (taxa == null) {
    await prisma.parcelaTaxa.deleteMany({ where: { parcelas } });
  } else {
    if (taxa < 0 || taxa > 50) throw new Error("Taxa: de 0% a 50%.");
    await prisma.parcelaTaxa.upsert({ where: { parcelas }, create: { parcelas, taxa }, update: { taxa } });
  }
  refresh();
}

export async function salvarFaixa(f: FormData) {
  await exigirAcesso();
  const id = numero(f, "id");
  const deMes = numero(f, "deMes");
  const ateMes = numero(f, "ateMes");
  const intervaloHoras = numero(f, "intervaloHoras");
  if (deMes == null || ateMes == null || intervaloHoras == null || deMes < 0 || ateMes < deMes || ateMes > 23 || intervaloHoras < 1) {
    throw new Error("Faixa: meses de 0 a 23 (o fim não antes do começo) e intervalo de pelo menos 1 hora.");
  }
  if (id) await prisma.faixaBusca.update({ where: { id }, data: { deMes, ateMes, intervaloHoras } });
  else await prisma.faixaBusca.create({ data: { deMes, ateMes, intervaloHoras } });
  refresh();
}

export async function apagarFaixa(id: number) {
  await exigirAcesso();
  if ((await prisma.faixaBusca.count()) <= 1) throw new Error("Precisa sobrar ao menos uma faixa.");
  await prisma.faixaBusca.delete({ where: { id } });
  refresh();
}

export async function alternarFonte(id: string, ligada: boolean) {
  await exigirAcesso();
  await prisma.fonte.update({ where: { id }, data: { ligada } });
  refresh();
}

/** As chaves numéricas da tabela de configuração, com os limites do catálogo. */
export async function salvarConfiguracao(f: FormData) {
  await exigirAcesso();
  const chave = texto(f, "chave");
  const limites = limitesDe(chave);
  const valor = numero(f, "valor");
  if (!limites) throw new Error(`Chave desconhecida: ${chave}`);
  if (valor == null || !Number.isInteger(valor) || valor < limites.min || valor > limites.max) {
    throw new Error(`${chave}: um número inteiro de ${limites.min} a ${limites.max}.`);
  }
  await prisma.configuracao.update({ where: { chave }, data: { valor } });
  refresh();
}

// --- V6: alertas do WhatsApp ---------------------------------------------------

/** "Conferi" — a equipe conferiu a oferta de alerta no site do programa (Azul,
 *  LATAM, Smiles executiva, ou a taxa que o alerta não deu). Fica o nome e a hora. */
export async function conferirAlerta(ofertaId: string, f: FormData) {
  await exigirAcesso();
  if (!/^\d{1,19}$/.test(ofertaId)) throw new Error("Oferta inválida.");
  const { conferirAMao } = await import("@/lib/alertas/conferencia");
  const milhas = numero(f, "milhas");
  await conferirAMao(BigInt(ofertaId), {
    quem: texto(f, "quem"),
    esgotou: texto(f, "acao") === "esgotou",
    milhas: milhas != null ? Math.round(milhas) : null,
    taxasBrl: numero(f, "taxas"),
  });
  refresh();
}

/** Valores: o nome de programa que aparece nos alertas → um programa do radar
 *  (ou nenhum = fora da vitrine). Os alertas são lidos de novo com a regra nova. */
export async function salvarAlertaPrograma(nome: string, f: FormData) {
  await exigirAcesso();
  const programaId = texto(f, "programa") || null;
  if (programaId && !(await prisma.programa.findUnique({ where: { id: programaId } }))) {
    throw new Error("Programa desconhecido.");
  }
  await prisma.alertaPrograma.update({ where: { nome }, data: { programaId } });
  await lerAlertasDeNovo();
}

/** Valores: de onde um alerta pode ir para a vitrine. */
export async function salvarAlertaOrigem(f: FormData) {
  await exigirAcesso();
  const c = codigo(texto(f, "codigo"));
  if (!c) throw new Error("Origem: código de 3 letras.");
  const soInternacional = texto(f, "soInternacional") === "on";
  await prisma.alertaOrigem.upsert({ where: { codigo: c }, create: { codigo: c, soInternacional }, update: { soInternacional } });
  await lerAlertasDeNovo();
}

export async function tirarAlertaOrigem(codigoOrigem: string) {
  await exigirAcesso();
  await prisma.alertaOrigem.delete({ where: { codigo: codigoOrigem } });
  await lerAlertasDeNovo();
}

/** A regra nova vale na hora: os alertas recentes são lidos de novo. */
async function lerAlertasDeNovo() {
  const { relerRecentes } = await import("@/lib/alertas/alertas");
  await relerRecentes();
  refresh();
}

// --- L0: quem entra no painel -------------------------------------------------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valores: libera uma conta do MilesPro no Radar (ou religa uma desligada). */
export async function liberarAcesso(f: FormData) {
  const eu = await exigirAcesso();
  const email = texto(f, "email").toLowerCase();
  if (!EMAIL.test(email)) throw new Error("E-mail inválido.");
  await prisma.acesso.upsert({
    where: { email },
    create: { email, liberadoPor: eu.email },
    update: { ativo: true, liberadoPor: eu.email },
  });
  refresh();
}

/** Valores: liga ou desliga uma conta. Ninguém desliga a própria — senão fica do lado de fora. */
export async function alternarAcesso(email: string, ativo: boolean) {
  const eu = await exigirAcesso();
  if (email === eu.email) throw new Error("Você não pode desligar o seu próprio acesso.");
  await prisma.acesso.update({ where: { email }, data: { ativo } });
  refresh();
}

export async function tirarAcesso(email: string) {
  const eu = await exigirAcesso();
  if (email === eu.email) throw new Error("Você não pode tirar o seu próprio acesso.");
  await prisma.acesso.delete({ where: { email } });
  refresh();
}
