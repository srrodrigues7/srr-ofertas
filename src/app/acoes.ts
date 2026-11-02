"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/acesso/acesso";
import * as gravar from "@/pacote/gravacoes";

/**
 * O que o painel grava. Toda ação começa por exigirAcesso() (L0): uma ação de
 * servidor é um endereço público, e a porta tem de estar em cada uma.
 *
 * A validação e a gravação moram no pacote (`src/pacote/gravacoes.ts`), o
 * mesmo que vai para o VoePro (etapa L): aqui fica só a porta e o "atualiza a
 * tela". A lista de quem entra no painel (fim do arquivo) é só deste painel e
 * se aposenta quando o Radar estiver no VoePro.
 */

/** "Buscar agora": entra na fila; o motor pega em segundos. Clicar de novo não duplica. */
export async function buscarAgora(buscaId: number) {
  await exigirAcesso();
  await gravar.pedirBuscaAgora(buscaId);
  refresh();
}

/** "Conferir agora" (V1b): o robô confere a oferta no portal da fonte. Entra na fila; o motor atende. */
export async function conferirAgora(ofertaId: string) {
  await exigirAcesso();
  await gravar.pedirConferencia(ofertaId);
  refresh();
}

export async function salvarBusca(f: FormData) {
  await exigirAcesso();
  await gravar.salvarBusca(f);
  refresh();
}

export async function alternarBusca(id: number, ligada: boolean) {
  await exigirAcesso();
  await gravar.alternarBusca(id, ligada);
  refresh();
}

export async function apagarBusca(id: number) {
  await exigirAcesso();
  await gravar.apagarBusca(id);
  refresh();
}

export async function salvarPrograma(f: FormData) {
  await exigirAcesso();
  await gravar.salvarPrograma(f);
  refresh();
}

export async function salvarMargem(f: FormData) {
  await exigirAcesso();
  await gravar.salvarMargem(f);
  refresh();
}

export async function salvarParcela(f: FormData) {
  await exigirAcesso();
  await gravar.salvarParcela(f);
  refresh();
}

export async function salvarFaixa(f: FormData) {
  await exigirAcesso();
  await gravar.salvarFaixa(f);
  refresh();
}

export async function apagarFaixa(id: number) {
  await exigirAcesso();
  await gravar.apagarFaixa(id);
  refresh();
}

export async function alternarFonte(id: string, ligada: boolean) {
  await exigirAcesso();
  await gravar.alternarFonte(id, ligada);
  refresh();
}

/** As chaves numéricas da tabela de configuração, com os limites do catálogo. */
export async function salvarConfiguracao(f: FormData) {
  await exigirAcesso();
  await gravar.salvarConfiguracao(f);
  refresh();
}

// --- V6: alertas do WhatsApp ---------------------------------------------------

/** "Conferi" — a equipe conferiu a oferta de alerta no site do programa. Fica o nome e a hora. */
export async function conferirAlerta(ofertaId: string, f: FormData) {
  await exigirAcesso();
  await gravar.conferirAlerta(ofertaId, f);
  refresh();
}

/** Valores: nome de programa nos alertas → programa do radar. O motor relê os
 *  alertas recentes com a regra nova na passada seguinte. */
export async function salvarAlertaPrograma(nome: string, f: FormData) {
  await exigirAcesso();
  await gravar.salvarAlertaPrograma(nome, f);
  refresh();
}

/** Valores: de onde um alerta pode ir para a vitrine. */
export async function salvarAlertaOrigem(f: FormData) {
  await exigirAcesso();
  await gravar.salvarAlertaOrigem(f);
  refresh();
}

export async function tirarAlertaOrigem(codigoOrigem: string) {
  await exigirAcesso();
  await gravar.tirarAlertaOrigem(codigoOrigem);
  refresh();
}

// --- L0: quem entra no painel (só deste painel; se aposenta na etapa L) ---------

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
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
