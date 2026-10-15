"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { limitesDe } from "@/lib/configuracao";

/**
 * O que o painel grava. Sem login por enquanto (decisão da O0: só roda no
 * computador do Saulo); antes de publicar, a etapa L põe a proteção aqui.
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
  await prisma.$executeRaw`
    INSERT INTO "ofertas"."busca_agora" (busca_id) VALUES (${buscaId})
    ON CONFLICT DO NOTHING`;
  refresh();
}

/** "Conferir agora" (V1b): o robô confere a oferta no portal da fonte. Entra na
 *  fila; o motor atende. Clicar de novo não duplica (índice único parcial). */
export async function conferirAgora(ofertaId: string) {
  if (!/^\d{1,19}$/.test(ofertaId)) throw new Error("Oferta inválida.");
  await prisma.$executeRaw`
    INSERT INTO "ofertas"."conferencia_pedido" (oferta_id, motivo) VALUES (${BigInt(ofertaId)}, 'botao')
    ON CONFLICT DO NOTHING`;
  refresh();
}

export async function salvarBusca(f: FormData) {
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
  await prisma.busca.update({ where: { id }, data: { ligada } });
  refresh();
}

export async function apagarBusca(id: number) {
  await prisma.busca.delete({ where: { id } });
  refresh();
}

export async function salvarPrograma(f: FormData) {
  const id = texto(f, "id");
  const preco = numero(f, "precoMilheiro");
  if (preco != null && (preco <= 0 || preco > 500)) throw new Error("Milheiro: entre R$ 0,01 e R$ 500.");
  await prisma.programa.update({ where: { id }, data: { precoMilheiro: preco, usaClube: texto(f, "usaClube") === "on" } });
  refresh();
}

export async function salvarMargem(f: FormData) {
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
  if ((await prisma.faixaBusca.count()) <= 1) throw new Error("Precisa sobrar ao menos uma faixa.");
  await prisma.faixaBusca.delete({ where: { id } });
  refresh();
}

export async function alternarFonte(id: string, ligada: boolean) {
  await prisma.fonte.update({ where: { id }, data: { ligada } });
  refresh();
}

/** As chaves numéricas da tabela de configuração, com os limites do catálogo. */
export async function salvarConfiguracao(f: FormData) {
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
