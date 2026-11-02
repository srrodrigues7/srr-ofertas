import { prisma } from "../banco";
import { lerConfiguracao } from "../configuracao";

/**
 * O que a tela de Saúde mostra das operadoras (V1b): a última leitura da
 * vitrine da fonte e o estado do revalidador (login, consultas do dia, fila).
 */

export type SaudeOperadora = {
  fonteId: string;
  nome: string;
  leitura: { em: Date; status: string; resumo: string | null; erro: string | null } | null;
  acesso: {
    estado: string;
    mensagem: string | null;
    mudouEm: Date;
    ultimoLoginEm: Date | null;
    ultimaConferenciaEm: Date | null;
  } | null;
  consultasHoje: number;
  teto: number;
  naFila: number;
  ligado: boolean;
  /** verde · amarelo · vermelho, para a etiqueta. */
  cor: "verde" | "amarelo" | "vermelho";
};

export async function lerSaudeDasOperadoras(): Promise<SaudeOperadora[]> {
  const cfg = await lerConfiguracao(["revalidador.teto_dia", "revalidador.ligado"]);
  const fontes = await prisma.fonte.findMany({ where: { tipo: "operadora" }, orderBy: { id: "asc" } });
  const saida: SaudeOperadora[] = [];
  for (const f of fontes) {
    const [leitura, acesso, naFila, [hoje]] = await Promise.all([
      prisma.coleta.findFirst({ where: { fonteId: f.id, escopo: "vitrine" }, orderBy: { id: "desc" } }),
      prisma.fonteAcesso.findUnique({ where: { fonteId: f.id } }),
      prisma.conferenciaPedido.count({ where: { status: { in: ["na_fila", "conferindo"] }, oferta: { fonteId: f.id } } }),
      prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM "ofertas"."coleta"
         WHERE fonte_id = ${f.id} AND tipo = 'conferencia'
           AND comecou_em >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')`,
    ]);
    const leituraRuim = !leitura || leitura.status === "erro" || leitura.status === "bloqueado" || (leitura.resumo ?? "").startsWith("⚠");
    const acessoRuim = acesso && (acesso.estado === "caiu" || acesso.estado === "senha_recusada");
    saida.push({
      fonteId: f.id,
      nome: f.nome,
      leitura: leitura ? { em: leitura.comecouEm, status: leitura.status, resumo: leitura.resumo, erro: leitura.erro } : null,
      acesso: acesso
        ? {
            estado: acesso.estado,
            mensagem: acesso.mensagem,
            mudouEm: acesso.mudouEm,
            ultimoLoginEm: acesso.ultimoLoginEm,
            ultimaConferenciaEm: acesso.ultimaConferenciaEm,
          }
        : null,
      consultasHoje: hoje?.n ?? 0,
      teto: cfg["revalidador.teto_dia"],
      naFila,
      ligado: cfg["revalidador.ligado"] === 1,
      cor: acessoRuim || (leitura && leitura.status !== "ok" && leitura.status !== "vazio") ? "vermelho" : leituraRuim || acesso?.estado === "desligado" ? "amarelo" : "verde",
    });
  }
  return saida;
}
