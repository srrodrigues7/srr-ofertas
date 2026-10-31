import { NextResponse, type NextRequest } from "next/server";
import { chavesDoPorteiro, clienteNoProxy } from "@/lib/acesso/supabase";

/**
 * A porta da frente: roda antes de qualquer tela ou ação.
 *
 * - Sem sessão, tudo volta para /entrar (as telas por redirecionamento; as
 *   ações de servidor, que chegam por POST, também — e cada ação confere de
 *   novo por conta própria, em `src/lib/acesso/acesso.ts`).
 * - Sem as variáveis do porteiro, nada abre além de /entrar, que explica o
 *   que falta (falha fechada).
 * - Aqui só se confere a sessão (assinatura do token, sem banco). A lista de
 *   liberados é conferida nas telas e nas ações.
 *
 * Nesta versão do Next o arquivo chama-se `proxy.ts` (era `middleware.ts`).
 */
export async function proxy(pedido: NextRequest) {
  const { pathname } = pedido.nextUrl;
  const naEntrada = pathname === "/entrar";

  if (!chavesDoPorteiro()) {
    return naEntrada ? NextResponse.next() : paraEntrada(pedido);
  }

  const { supabase, resposta } = clienteNoProxy(pedido, NextResponse.next({ request: pedido }));
  const { data } = await supabase.auth.getClaims();
  const comSessao = Boolean(data?.claims);

  if (!comSessao && !naEntrada) return paraEntrada(pedido);
  return resposta();
}

function paraEntrada(pedido: NextRequest) {
  const destino = new URL("/entrar", pedido.url);
  const de = pedido.nextUrl.pathname + pedido.nextUrl.search;
  if (pedido.method === "GET" && de !== "/") destino.searchParams.set("de", de);
  // 303: quem chegou por POST (uma ação sem sessão) é mandado buscar a tela
  // de entrada com GET, em vez de repetir o POST lá.
  return NextResponse.redirect(destino, 303);
}

export const config = {
  // Tudo, menos os arquivos estáticos do Next, a logo e o robots.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|logo-srr.png).*)"],
};
