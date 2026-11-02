import type { PrismaClient } from "@/generated/ofertas/client";

/**
 * O banco do pacote do Radar.
 *
 * O pacote (`src/pacote/`) é o que as telas do Radar usam — ler a vitrine, o
 * preço de venda, a configuração, a saúde, gravar pedidos e valores — e vai
 * copiado para o VoePro (`scripts/exportar-pacote.mjs`), onde as telas do Radar
 * passam a morar (etapa L). Por isso ele **não abre conexão sozinho**: quem o
 * usa entrega o cliente do schema `ofertas` uma vez, com `usarBanco`.
 *
 * - No Radar: `src/lib/prisma.ts` (o papel `srr_ofertas`).
 * - No VoePro: o cliente do `ofertas` de lá (o papel `srr_ofertas_tela`, sem
 *   poder de criar, mudar ou apagar tabela).
 *
 * A entrega fica no `globalThis`, não numa variável do módulo: o Next pode
 * carregar este arquivo mais de uma vez no mesmo processo (uma cópia por rota),
 * e todas precisam ver o mesmo cliente.
 *
 * Regras do pacote (conferidas no `npm run check` por
 * `scripts/conferir-pacote.mjs`): só importa de dentro de `src/pacote/` e de
 * `@/generated/ofertas/client`. Nada de `@/lib/`, `@/app/`, `next/*` ou
 * `@/generated/prisma`.
 */

type Fabrica = () => PrismaClient;
const CHAVE = "__srrRadarBanco";
const global = globalThis as unknown as { [CHAVE]?: Fabrica };

/** Entrega ao pacote o cliente do schema `ofertas` (ou quem o cria na primeira consulta). */
export function usarBanco(fabrica: Fabrica): void {
  global[CHAVE] = fabrica;
}

function banco(): PrismaClient {
  const fabrica = global[CHAVE];
  if (!fabrica) {
    throw new Error(
      "O pacote do Radar está sem banco: quem o usa precisa chamar usarBanco() antes (no Radar, src/lib/prisma.ts).",
    );
  }
  return fabrica();
}

/**
 * O cliente, com cara de `prisma` (os arquivos do pacote escrevem
 * `prisma.oferta…` como antes). Só pede o cliente na hora de cada consulta.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_alvo, chave) {
    const c = banco();
    const valor = Reflect.get(c, chave);
    return typeof valor === "function" ? valor.bind(c) : valor;
  },
});
