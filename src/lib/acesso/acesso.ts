import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { chavesDoPorteiro, clienteSupabase } from "./supabase";

/**
 * Quem está do lado de dentro.
 *
 * Entrar tem duas etapas, e as duas precisam passar:
 * 1. a conta existe e a senha está certa — isso é o Auth do Supabase (a
 *    mesma conta do MilesPro);
 * 2. a conta está na lista de liberados do Radar (`ofertas.acesso`), ligada.
 *
 * O `proxy.ts` confere só a primeira, em todo pedido (rápido, sem banco). As
 * telas e as ações conferem as duas, aqui: toda ação de servidor é um endereço
 * público, então a porta tem de estar em cada uma, não só na frente.
 */

export type QuemEntrou = { email: string };

export async function quemEntrou(): Promise<QuemEntrou | null> {
  if (!chavesDoPorteiro()) return null;
  const email = await emailDaSessao();
  if (!email) return null;
  const acesso = await prisma.acesso.findUnique({ where: { email } });
  return acesso?.ativo ? { email } : null;
}

/** O e-mail da conta que está com sessão aberta — liberada ou não. */
export async function emailDaSessao(): Promise<string | null> {
  if (!chavesDoPorteiro()) return null;
  const supabase = await clienteSupabase();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  return typeof email === "string" && email ? email.trim().toLowerCase() : null;
}

/** Nas ações de servidor: sem acesso, a ação para antes de tocar no banco. */
export async function exigirAcesso(): Promise<QuemEntrou> {
  const quem = await quemEntrou();
  if (!quem) throw new Error("Entre no painel para continuar.");
  return quem;
}

/** Nas telas: sem acesso, vai para a tela de entrada. */
export async function exigirAcessoNaTela(): Promise<QuemEntrou> {
  const quem = await quemEntrou();
  if (!quem) redirect("/entrar");
  return quem;
}

/** Só caminhos de dentro do painel servem como destino depois de entrar. */
export function destinoSeguro(de: string | null | undefined): string {
  if (!de || !de.startsWith("/") || de.startsWith("//") || de.startsWith("/entrar")) return "/";
  return de;
}
