import { prisma } from "./banco";
import { lerConfiguracao } from "./configuracao";

/**
 * As consultas que as telas do Radar fazem além da vitrine e da saúde: a tela
 * de Pedidos de busca, a de Valores e a fila que a vitrine mostra ao lado de
 * cada oferta. As telas não falam com o banco direto: no VoePro, o cliente do
 * `ofertas` só existe dentro do pacote (etapa L).
 */

/** Pedidos de busca: as buscas, os lugares, quantas ofertas cada uma tem e o último "Buscar agora". */
export async function lerPedidosDeBusca() {
  const [buscas, lugares, contagens, ultimosAgora, cfg] = await Promise.all([
    prisma.busca.findMany({ orderBy: [{ classe: "asc" }, { origem: "asc" }, { destino: "asc" }] }),
    prisma.lugar.findMany({ select: { codigo: true, cidade: true, pais: true } }),
    prisma.oferta.groupBy({ by: ["buscaId"], where: { ativa: true, buscaId: { not: null } }, _count: true }),
    prisma.buscaAgora.findMany({ orderBy: { pedidoEm: "desc" }, take: 200 }),
    lerConfiguracao(["busca.estadia_min_padrao", "busca.estadia_max_padrao"]),
  ]);
  return { buscas, lugares, contagens, ultimosAgora, cfg };
}

/** Valores: tudo o que a tela mostra e deixa mudar (menos quem entra no painel). */
export async function lerTelaDeValores() {
  const [programas, margens, parcelas, faixas, fontes, config, alertaOrigens, alertaProgramas] = await Promise.all([
    prisma.programa.findMany({ orderBy: { nome: "asc" } }),
    prisma.margem.findMany(),
    prisma.parcelaTaxa.findMany({ orderBy: { parcelas: "asc" } }),
    prisma.faixaBusca.findMany({ orderBy: { deMes: "asc" } }),
    prisma.fonte.findMany({ orderBy: { nome: "asc" } }),
    prisma.configuracao.findMany({ orderBy: { chave: "asc" } }),
    prisma.alertaOrigem.findMany({ orderBy: { codigo: "asc" } }),
    prisma.alertaPrograma.findMany({ orderBy: [{ vezes: "desc" }, { exemplo: "asc" }] }),
  ]);
  return { programas, margens, parcelas, faixas, fontes, config, alertaOrigens, alertaProgramas };
}

/**
 * A fila ao lado da vitrine: que buscas estão sendo feitas agora, que ofertas
 * estão sendo conferidas, e quais fontes têm revalidador (onde o botão
 * "Conferir agora" faz sentido).
 */
export async function lerFilasDaVitrine() {
  const [fila, conf, acessos] = await Promise.all([
    prisma.buscaAgora.findMany({ where: { status: { in: ["na_fila", "buscando"] } } }),
    prisma.conferenciaPedido.findMany({ where: { status: { in: ["na_fila", "conferindo"] } } }),
    prisma.fonteAcesso.findMany({ select: { fonteId: true } }),
  ]);
  return {
    pendentes: new Map(fila.map((p) => [p.buscaId, p.status])),
    conferindo: new Map(conf.map((c) => [c.ofertaId.toString(), c.status])),
    revalidaveis: new Set(acessos.map((a) => a.fonteId)),
  };
}
