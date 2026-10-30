import { prisma } from "@/lib/prisma";
import { lerConfiguracao } from "@/lib/configuracao";
import { mensagemDe } from "@/lib/erros";
import { dormir, doBanco, fimDoMes, hoje, inicioDoMes, somarDias } from "@/lib/datas";
import { registrarConferencia } from "@/lib/coleta/gravar";
import { executar, type Log } from "@/lib/coleta/nucleo";
import { VARIAVEIS_DO_EMAIL } from "./codigo-email";
import { PortalCativa, SenhaRecusada, VARIAVEIS_DA_CATIVA, marcaDaCredencial, type BloqueioNoPortal } from "./portal-cativa";

/**
 * O REVALIDADOR automático (V1b): confere no portal da fonte o preço e a vaga
 * de uma oferta já achada. Regra do Saulo: esgotou sai da vitrine; preço mudou
 * atualiza e marca; não deu fica sem selo (e não pode ser aprovada).
 *
 * O que ele confere:
 * - o que alguém pediu no botão "Conferir agora" (a fila `conferencia_pedido`);
 * - sozinho, as `revalidador.mais_baratas_por_destino` mais baratas de cada
 *   destino (até a nota da V2 existir; depois, as de nota mais alta).
 *
 * Uma ida ao portal confere várias ofertas de uma vez: todos os hotéis do
 * mesmo pacote e data, ou todos os bloqueios de uma rota no período. Cada ida
 * fica registrada em `coleta` (tipo "conferencia") — é o que conta para o teto
 * diário. Hoje uma fonte tem portal: a Cativa.
 *
 * Desenho e alternativas: docs/fontes/revalidador-cativa.md.
 */

const CATIVA = "cativa";
const CHAVES = [
  "revalidador.ligado",
  "revalidador.mais_baratas_por_destino",
  "revalidador.reconferir_horas",
  "revalidador.pausa_s",
  "revalidador.teto_dia",
  "revalidador.hora_inicio",
  "revalidador.hora_fim",
  "revalidador.prazo_s",
  "revalidador.codigo_espera_s",
  "ofertas.validade_horas",
] as const;
/** Depois de uma queda do login, tenta de novo só depois disto. */
const ESPERA_APOS_QUEDA_MIN = 30;

type Cfg = Awaited<ReturnType<typeof lerConfiguracao<(typeof CHAVES)[number]>>>;
type Pedido = { id: bigint; ofertaId: bigint; motivo: string };
type OfertaConferir = Awaited<ReturnType<typeof lerOfertas>>[number];

/** Há alguém esperando um "Conferir agora"? (o motor acorda mais cedo) */
export async function haConferenciaNaFila(): Promise<boolean> {
  return (await prisma.conferenciaPedido.count({ where: { status: "na_fila", motivo: "botao" } })) > 0;
}

export async function revalidar(opcoes: { ate: number; log: Log }): Promise<string> {
  const { log } = opcoes;
  const cfg = await lerConfiguracao(CHAVES);
  await prisma.$executeRaw`
    UPDATE "ofertas"."conferencia_pedido" SET status = 'erro', terminou_em = now(),
           resumo = 'Interrompida: o motor caiu ou foi desligado no meio da conferência.'
     WHERE status = 'conferindo' AND comecou_em < now() - interval '15 minutes'`;

  // Pode entrar no portal?
  const impedimento = await impedimentoDoAcesso(cfg);
  if (impedimento) {
    const recusados = await recusarPedidosDoBotao(impedimento);
    return recusados ? `Revalidador: ${recusados} pedido(s) não atendido(s) — ${impedimento}.` : "";
  }

  if (dentroDoHorario(cfg)) await enfileirarAutomaticas(cfg);
  const pedidos = await prisma.conferenciaPedido.findMany({
    where: { status: "na_fila", oferta: { fonteId: CATIVA }, ...(dentroDoHorario(cfg) ? {} : { motivo: "botao" }) },
    orderBy: [{ pedidoEm: "asc" }],
    select: { id: true, ofertaId: true, motivo: true },
  });
  if (!pedidos.length) return "";
  pedidos.sort((a, b) => Number(b.motivo === "botao") - Number(a.motivo === "botao"));

  const usadas = await consultasDeHoje();
  if (usadas >= cfg["revalidador.teto_dia"]) {
    const n = await recusarPedidosDoBotao(`o teto de ${cfg["revalidador.teto_dia"]} consultas por dia no portal foi atingido`);
    return `Revalidador: teto do dia atingido (${usadas} consultas)${n ? `; ${n} pedido(s) do botão recusado(s)` : ""}.`;
  }

  const ofertas = await lerOfertas(pedidos.map((p) => p.ofertaId));
  const grupos = agrupar(pedidos, ofertas);
  if (!grupos.length) return "";

  const portal = new PortalCativa({ codigoEsperaS: cfg["revalidador.codigo_espera_s"], log: log.info });
  let feitas = 0;
  let conferidas = 0;
  try {
    await portal.abrir();
    try {
      await portal.garantirLogin();
    } catch (e) {
      await quedaDoLogin(e, grupos.flatMap((g) => g.pedidos));
      return `Revalidador: ${mensagemDe(e)}`;
    }
    await marcarAcesso("ok", "Login ok.", { login: true });

    for (const g of grupos) {
      if (Date.now() + 60_000 > opcoes.ate) break;
      if (usadas + feitas >= cfg["revalidador.teto_dia"]) break;
      if (feitas > 0) await dormir(cfg["revalidador.pausa_s"] * 1000);
      await prisma.conferenciaPedido.updateMany({
        where: { id: { in: g.pedidos.map((p) => p.id) } },
        data: { status: "conferindo", comecouEm: new Date() },
      });
      let resumo = "";
      const status = await executar(
        {
          fonteId: CATIVA,
          tipo: "conferencia",
          escopo: g.escopo,
          prioridade: 1,
          custoS: 60,
          rodar: async ({ contador }) => {
            contador.requisicoes++;
            const n = await comPrazo(conferirGrupo(portal, g), cfg["revalidador.prazo_s"]);
            resumo = n.resumo;
            return { itens: n.conferidas, historico: 0, resumo: n.resumo };
          },
        },
        "agora",
        log,
      );
      feitas++;
      if (status === "erro" || status === "bloqueado") {
        const ultima = await prisma.coleta.findFirst({ where: { fonteId: CATIVA, escopo: g.escopo }, orderBy: { id: "desc" } });
        const motivo = `não deu para conferir no portal: ${ultima?.erro?.slice(0, 160) ?? "erro"}`;
        for (const o of g.ofertas) await registrarConferencia(o.id, { resultado: "nao_deu", motivo });
        await fecharPedidos(g.pedidos, "erro", motivo);
        // Navegador num estado ruim: recomeça do zero na próxima ida.
        await portal.fechar();
        await portal.abrir();
        await portal.garantirLogin();
      } else {
        conferidas += g.ofertas.length;
        await fecharPedidos(g.pedidos, "feito", resumo);
      }
    }
    await marcarAcesso("ok", `Login ok. ${feitas} consulta(s) nesta passada.`, { conferencia: feitas > 0 });
  } catch (e) {
    log.aviso(`Revalidador: ${mensagemDe(e)}`);
    await marcarAcesso("caiu", mensagemDe(e).slice(0, 300));
  } finally {
    await portal.fechar();
  }
  const restam = await prisma.conferenciaPedido.count({ where: { status: "na_fila", oferta: { fonteId: CATIVA } } });
  return `Revalidador: ${feitas} consulta(s) no portal, ${conferidas} oferta(s) conferida(s)${restam ? `, ${restam} na fila` : ""}.`;
}

// --- o que impede de entrar --------------------------------------------------

async function impedimentoDoAcesso(cfg: Cfg): Promise<string | null> {
  if (cfg["revalidador.ligado"] !== 1) {
    await marcarAcesso("desligado", "Revalidador desligado na configuração (revalidador.ligado = 0).");
    return "o revalidador está desligado";
  }
  const faltam = [...VARIAVEIS_DA_CATIVA, ...VARIAVEIS_DO_EMAIL].filter((v) => !process.env[v]);
  if (faltam.length) {
    await marcarAcesso("desligado", `Falta no .env do motor: ${faltam.join(", ")}.`);
    return `falta configurar o login do robô (${faltam.join(", ")})`;
  }
  const acesso = await prisma.fonteAcesso.findUnique({ where: { fonteId: CATIVA } });
  const marca = marcaDaCredencial();
  if (acesso?.credencialRecusada && acesso.credencialRecusada === marca) {
    return "o portal recusou a senha do robô; troque CATIVA_SENHA no .env";
  }
  if (acesso?.estado === "caiu" && acesso.mudouEm.getTime() > Date.now() - ESPERA_APOS_QUEDA_MIN * 60_000) {
    return `o login caiu há pouco (${acesso.mensagem ?? ""}); nova tentativa em até ${ESPERA_APOS_QUEDA_MIN} min`;
  }
  return null;
}

async function quedaDoLogin(e: unknown, pedidos: Pedido[]) {
  const recusou = e instanceof SenhaRecusada;
  await marcarAcesso(recusou ? "senha_recusada" : "caiu", mensagemDe(e).slice(0, 300), {
    credencialRecusada: recusou ? marcaDaCredencial() : null,
  });
  // Os automáticos voltam para a fila; o do botão recebe a resposta agora.
  const doBotao = pedidos.filter((p) => p.motivo === "botao");
  for (const p of doBotao) await registrarConferencia(p.ofertaId, { resultado: "nao_deu", motivo: "o login do robô no portal falhou (veja a Saúde)" });
  await fecharPedidos(doBotao, "erro", mensagemDe(e).slice(0, 300));
}

async function recusarPedidosDoBotao(motivo: string): Promise<number> {
  const pedidos = await prisma.conferenciaPedido.findMany({ where: { status: "na_fila", motivo: "botao", oferta: { fonteId: CATIVA } } });
  for (const p of pedidos) await registrarConferencia(p.ofertaId, { resultado: "nao_deu", motivo });
  await fecharPedidos(pedidos, "erro", motivo);
  // Os automáticos não fazem sentido parados na fila: saem.
  await prisma.conferenciaPedido.deleteMany({ where: { status: "na_fila", motivo: "automatico", oferta: { fonteId: CATIVA } } });
  return pedidos.length;
}

async function marcarAcesso(
  estado: string,
  mensagem: string,
  extra: { login?: boolean; conferencia?: boolean; credencialRecusada?: string | null } = {},
) {
  const atual = await prisma.fonteAcesso.findUnique({ where: { fonteId: CATIVA } });
  const dados = {
    estado,
    mensagem,
    ...(atual?.estado !== estado ? { mudouEm: new Date() } : {}),
    ...(extra.login ? { ultimoLoginEm: new Date() } : {}),
    ...(extra.conferencia ? { ultimaConferenciaEm: new Date() } : {}),
    ...(extra.credencialRecusada !== undefined ? { credencialRecusada: extra.credencialRecusada } : {}),
    ...(estado === "ok" ? { credencialRecusada: null } : {}),
  };
  await prisma.fonteAcesso.upsert({ where: { fonteId: CATIVA }, create: { fonteId: CATIVA, ...dados }, update: dados });
}

async function fecharPedidos(pedidos: { id: bigint }[], status: "feito" | "erro", resumo: string) {
  if (!pedidos.length) return;
  await prisma.conferenciaPedido.updateMany({
    where: { id: { in: pedidos.map((p) => p.id) } },
    data: { status, terminouEm: new Date(), resumo: resumo.slice(0, 500) },
  });
}

// --- quando e o quê ------------------------------------------------------------

function dentroDoHorario(cfg: Cfg): boolean {
  const hora = Number(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }));
  return hora >= cfg["revalidador.hora_inicio"] && hora < cfg["revalidador.hora_fim"];
}

async function consultasDeHoje(): Promise<number> {
  const [r] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM "ofertas"."coleta"
     WHERE fonte_id = ${CATIVA} AND tipo = 'conferencia'
       AND comecou_em >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')`;
  return r?.n ?? 0;
}

/**
 * As N mais baratas de cada destino (por aba e origem), que não foram
 * conferidas nem pedidas há menos de `revalidador.reconferir_horas`.
 */
async function enfileirarAutomaticas(cfg: Cfg): Promise<number> {
  const n = cfg["revalidador.mais_baratas_por_destino"];
  if (n <= 0) return 0;
  const horas = cfg["revalidador.reconferir_horas"];
  const validade = cfg["ofertas.validade_horas"];
  return prisma.$executeRaw`
    INSERT INTO "ofertas"."conferencia_pedido" (oferta_id, motivo)
    SELECT id, 'automatico' FROM (
      SELECT o.id, o.conferida_em,
             row_number() OVER (
               PARTITION BY o.tipo, o.origem, CASE WHEN o.tipo = 'pacote' THEN coalesce(o.destino_cidade, o.destino) ELSE o.destino END
               ORDER BY o.preco_brl) AS rn
        FROM "ofertas"."oferta" o
       WHERE o.ativa AND o.fonte_id = ${CATIVA} AND o.preco_brl IS NOT NULL
         AND o.vista_em >= now() - (${validade}::int * interval '1 hour')
         AND o.ida > (now() AT TIME ZONE 'America/Sao_Paulo')::date
    ) x
    WHERE rn <= ${n}
      AND (conferida_em IS NULL OR conferida_em < now() - (${horas}::int * interval '1 hour'))
      AND NOT EXISTS (
        SELECT 1 FROM "ofertas"."conferencia_pedido" p
         WHERE p.oferta_id = x.id
           AND (p.status IN ('na_fila', 'conferindo') OR p.pedido_em > now() - (${horas}::int * interval '1 hour')))
    ON CONFLICT DO NOTHING`;
}

async function lerOfertas(ids: bigint[]) {
  return prisma.oferta.findMany({
    where: { id: { in: ids } },
    select: {
      id: true, tipo: true, ativa: true, origem: true, destino: true, ida: true, volta: true,
      precoBrl: true, taxasBrl: true, localizador: true,
    },
  });
}

type Grupo = {
  escopo: string;
  tipo: "pacote" | "bloqueio";
  pedidos: Pedido[];
  ofertas: OfertaConferir[];
  /** pacote: o que buscar no portal; bloqueio: a rota e o período. */
  busca: { origem: string; destino: string; ida: string; volta: string; pacote?: string };
};

/** Junta os pedidos que se conferem com UMA ida ao portal. */
function agrupar(pedidos: Pedido[], ofertas: OfertaConferir[]): Grupo[] {
  const porId = new Map(ofertas.map((o) => [o.id.toString(), o]));
  const grupos = new Map<string, Grupo>();
  for (const p of pedidos) {
    const o = porId.get(p.ofertaId.toString());
    if (!o || !o.ativa || !o.ida || !o.volta) continue;
    const loc = (o.localizador ?? {}) as Record<string, string | null>;
    const ida = doBanco(o.ida);
    const volta = doBanco(o.volta);
    let chave: string;
    let g: Omit<Grupo, "pedidos" | "ofertas">;
    if (o.tipo === "pacote") {
      chave = `pac:${o.origem}:${loc.destinoTexto}:${ida}:${volta}:${loc.pacote}`; // todos os hotéis juntos
      g = { escopo: chave, tipo: "pacote", busca: { origem: o.origem, destino: String(loc.destinoTexto ?? ""), ida, volta, pacote: String(loc.pacote ?? "") } };
    } else {
      // Bloqueios: a rota inteira no mês (a tela do portal busca por período).
      const amanha = somarDias(hoje(), 1);
      const de = inicioDoMes(ida) < amanha ? amanha : inicioDoMes(ida);
      chave = `blq:${o.origem}:${o.destino}:${ida.slice(0, 7)}`;
      g = { escopo: chave, tipo: "bloqueio", busca: { origem: o.origem, destino: o.destino, ida: de, volta: fimDoMes(ida) } };
    }
    const atual = grupos.get(chave) ?? { ...g, pedidos: [], ofertas: [] };
    atual.pedidos.push(p);
    if (!atual.ofertas.some((x) => x.id === o.id)) atual.ofertas.push(o);
    grupos.set(chave, atual);
  }
  // As do botão primeiro (os pedidos já vêm nessa ordem).
  return [...grupos.values()];
}

// --- a conferência ----------------------------------------------------------------

async function conferirGrupo(portal: PortalCativa, g: Grupo): Promise<{ conferidas: number; resumo: string }> {
  if (g.tipo === "pacote") {
    // Hotéis diferentes do mesmo pacote e data: UMA busca, cada hotel se lê.
    const hotelDe = (o: OfertaConferir) => String(((o.localizador ?? {}) as Record<string, unknown>).hotel ?? "");
    const resultados = await portal.conferirPacote({ ...g.busca, pacote: g.busca.pacote ?? "" }, [...new Set(g.ofertas.map(hotelDe))]);
    const partes: string[] = [];
    for (const o of g.ofertas) {
      const hotel = hotelDe(o);
      const r = resultados.get(hotel) ?? { resultado: "nao_deu" as const, motivo: "hotel sem leitura" };
      await registrarConferencia(o.id, { resultado: r.resultado, valor: r.valor ?? null, motivo: r.motivo ?? null });
      partes.push(`${hotel}: ${r.resultado}${r.valor ? ` R$ ${r.valor}` : ""}${r.motivo ? ` (${r.motivo})` : ""}`);
    }
    return { conferidas: g.ofertas.length, resumo: `${g.busca.origem}→${g.busca.destino} ${g.busca.ida}: ${partes.join("; ")}` };
  }

  const linhas = await portal.bloqueiosDaRota(g.busca.origem, g.busca.destino, g.busca.ida, g.busca.volta);
  let ok = 0;
  let esgotou = 0;
  for (const o of g.ofertas) {
    const r = conferirBloqueio(o, linhas);
    await registrarConferencia(o.id, { resultado: r.resultado, valor: r.valor, motivo: r.motivo });
    if (r.linha) {
      await prisma.oferta.update({
        where: { id: o.id },
        data: { assentos: r.linha.disponiveis, ...(r.linha.deadline ? { emitirAte: r.linha.deadline } : {}) },
      });
    }
    if (r.resultado === "esgotou") esgotou++;
    else ok++;
  }
  return {
    conferidas: g.ofertas.length,
    resumo: `${g.busca.origem}→${g.busca.destino} ${g.busca.ida.slice(0, 7)}: ${linhas.length} bloqueio(s) no portal; ${ok} conferido(s), ${esgotou} esgotado(s)`,
  };
}

/**
 * O bloqueio da vitrine é "ida e volta nestas datas" (o voo não faz parte da
 * identidade): vale o mais barato com lugar, nas mesmas datas. A tela do
 * portal lista inclusive os esgotados (0 lugares) — sumir de lá é ter saído.
 */
export function conferirBloqueio(
  o: Pick<OfertaConferir, "ida" | "volta" | "taxasBrl">,
  linhas: BloqueioNoPortal[],
): { resultado: "ok" | "esgotou"; valor: number | null; motivo: string | null; linha: BloqueioNoPortal | null } {
  const ida = o.ida ? doBanco(o.ida) : null;
  const volta = o.volta ? doBanco(o.volta) : null;
  const mesmas = linhas.filter((l) => l.ida === ida && l.volta === volta);
  const comLugar = mesmas.filter((l) => l.disponiveis > 0).sort((a, b) => a.tarifa - b.tarifa);
  if (!comLugar.length) {
    return {
      resultado: "esgotou",
      valor: null,
      motivo: mesmas.length ? "sem lugares no portal" : "o bloqueio não está mais no portal",
      linha: mesmas[0] ?? null,
    };
  }
  const melhor = comLugar[0];
  const taxa = o.taxasBrl?.toNumber() ?? 0;
  return { resultado: "ok", valor: Math.round((melhor.tarifa + taxa) * 100) / 100, motivo: null, linha: melhor };
}

async function comPrazo<T>(p: Promise<T>, prazoS: number): Promise<T> {
  let relogio: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, rejeitar) => {
        relogio = setTimeout(() => rejeitar(new Error(`A conferência passou de ${prazoS} s.`)), prazoS * 1000);
      }),
    ]);
  } finally {
    clearTimeout(relogio);
  }
}
