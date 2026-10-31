import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { ErroDeConfiguracao } from "@/lib/erros";

/**
 * O porteiro do painel é o Auth do Supabase — o mesmo do MilesPro, no projeto
 * de produção: a pessoa entra no Radar com o e-mail e a senha que já usa lá.
 *
 * Duas variáveis dizem onde o porteiro mora (NEXT_PUBLIC_SUPABASE_URL) e qual
 * é a chave pública dele (NEXT_PUBLIC_SUPABASE_ANON_KEY). Sem elas o painel
 * não abre nada (falha fechada): ver `chavesDoPorteiro` e o `proxy.ts`.
 *
 * A chave pública não é segredo — ela só permite tentar entrar, nunca ler
 * nada sem senha. Mesmo assim, quem a coloca no .env e na Vercel é o Saulo.
 */

export const VARIAVEIS_DO_PORTEIRO = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export function chavesDoPorteiro(): { url: string; chave: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return url && chave ? { url, chave } : null;
}

function exigirChaves() {
  const chaves = chavesDoPorteiro();
  if (!chaves) {
    throw new ErroDeConfiguracao(
      `Falta ${VARIAVEIS_DO_PORTEIRO.join(" e ")} no .env (ou nas variáveis da Vercel). ` +
        "Sem o porteiro, o painel não abre. Veja o .env.example.",
    );
  }
  return chaves;
}

/** O cliente para telas e ações de servidor: lê e grava a sessão nos cookies do pedido. */
export async function clienteSupabase() {
  const chaves = exigirChaves();
  const jar = await cookies();
  return createServerClient(chaves.url, chaves.chave, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Numa tela (Server Component) não dá para gravar cookie; o proxy
          // já renovou a sessão antes de chegar aqui. Nas ações, grava.
        }
      },
    },
  });
}

/** O cliente para o proxy: lê os cookies do pedido e devolve os renovados na resposta. */
export function clienteNoProxy(pedido: NextRequest, respostaInicial: NextResponse) {
  const chaves = exigirChaves();
  const resposta = respostaInicial;
  const supabase = createServerClient(chaves.url, chaves.chave, {
    cookies: {
      getAll: () => pedido.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => pedido.cookies.set(name, value));
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });
  return { supabase, resposta: () => resposta };
}
