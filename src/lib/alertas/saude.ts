import { prisma } from "@/lib/prisma";
import { lerConfiguracao, CHAVES_DOS_ALERTAS } from "@/lib/configuracao";
import { FONTE_ALERTA } from "./regras";

/**
 * O que a tela de Saúde mostra dos alertas do WhatsApp (V6): os números de
 * hoje e os avisos de PRODUÇÃO (lição 6 da HUB 92: vigiar se chega alerta, não
 * só se o processo está vivo).
 */

export type SaudeDosAlertas = {
  /** Hoje (Brasília), por resultado: oferta, fora_origem, fora_programa… */
  hoje: Record<string, number>;
  recebidosHoje: number;
  repetidosHoje: number;
  /** Ofertas de alerta na vitrine, e quantas ainda esperam conferência. */
  naVitrine: number;
  semConferencia: number;
  ultimoAlertaEm: Date | null;
  ponte: { lidaEm: Date | null; maquina: string | null; erro: string | null } | null;
  monitor: { em: Date | null; whatsapp: string | null; grupo: string | null } | null;
  avisos: string[];
  cor: "verde" | "amarelo" | "vermelho";
};

const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const partesBrasilia = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23", weekday: "short" });

export async function lerSaudeDosAlertas(): Promise<SaudeDosAlertas> {
  const cfg = await lerConfiguracao(CHAVES_DOS_ALERTAS);
  const [porResultado, [contagem], naVitrine, semConferencia, ultimo, ponte] = await Promise.all([
    prisma.$queryRaw<{ resultado: string | null; n: number }[]>`
      SELECT resultado, count(*)::int AS n FROM "ofertas"."alerta_mensagem"
       WHERE enviada_em >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')
       GROUP BY resultado`,
    prisma.$queryRaw<{ recebidos: number; repetidos: number }[]>`
      SELECT count(*)::int AS recebidos, count(*) FILTER (WHERE repetida)::int AS repetidos
        FROM "ofertas"."alerta_mensagem"
       WHERE enviada_em >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')`,
    prisma.oferta.count({ where: { fonteId: FONTE_ALERTA, ativa: true } }),
    prisma.oferta.count({ where: { fonteId: FONTE_ALERTA, ativa: true, conferidaEm: null } }),
    prisma.alertaMensagem.findFirst({ orderBy: { enviadaEm: "desc" }, select: { enviadaEm: true } }),
    prisma.alertaPonte.findUnique({ where: { id: "ponte" } }),
  ]);

  const hoje: Record<string, number> = {};
  for (const r of porResultado) hoje[r.resultado ?? "falta_ler"] = r.n;

  const avisos: string[] = [];
  let cor: SaudeDosAlertas["cor"] = "verde";
  const agora = Date.now();
  const pioraPara = (c: "amarelo" | "vermelho") => {
    if (c === "vermelho" || cor === "verde") cor = c;
  };

  // A ponte está lendo o arquivo do monitor?
  if (!ponte?.lidaEm) {
    avisos.push(
      ponte?.erro ??
        "a ponte nunca leu o arquivo do monitor: ponha MONITOR_WHATSAPP_PASTA no .env do computador do monitor e ligue o motor (ou npm run alertas -- --vigiar)",
    );
    pioraPara("vermelho");
  } else {
    if (ponte.erro) {
      avisos.push(ponte.erro);
      pioraPara("vermelho");
    }
    const parada = (agora - ponte.lidaEm.getTime()) / 60_000;
    if (parada > cfg["alertas.ponte_parada_min"]) {
      avisos.push(`a ponte não lê o arquivo do monitor desde ${fmtHora.format(ponte.lidaEm)} (motor ou ponte desligados?)`);
      pioraPara("vermelho");
    }
  }

  // O próprio monitor: está atualizando o estado dele? O WhatsApp está conectado?
  const m = (ponte?.monitor ?? null) as { whatsapp?: string | null; grupo?: string | null } | null;
  if (ponte?.monitorEm && (agora - ponte.monitorEm.getTime()) / 60_000 > cfg["alertas.ponte_parada_min"]) {
    avisos.push(`o monitor de WhatsApp não dá sinal desde ${fmtHora.format(ponte.monitorEm)} (o computador dele está ligado?)`);
    pioraPara("vermelho");
  }
  if (m?.whatsapp && m.whatsapp !== "CONNECTED") {
    avisos.push(`o WhatsApp do monitor está "${m.whatsapp}" (pode precisar do QR code: /status no Telegram do monitor)`);
    pioraPara("vermelho");
  }

  // Silêncio: no horário em que o grupo costuma postar, nenhum alerta novo.
  const p = Object.fromEntries(partesBrasilia.formatToParts(new Date()).map((x) => [x.type, x.value]));
  const hora = Number(p.hour);
  const diaUtil = !["Sat", "Sun"].includes(p.weekday);
  const noHorario =
    hora >= cfg["alertas.silencio_hora_inicio"] &&
    hora < cfg["alertas.silencio_hora_fim"] &&
    (cfg["alertas.silencio_dias_uteis"] === 0 || diaUtil);
  if (noHorario && ultimo && (agora - ultimo.enviadaEm.getTime()) / 3_600_000 > cfg["alertas.silencio_horas"]) {
    avisos.push(`nenhum alerta novo desde ${fmtHora.format(ultimo.enviadaEm)} — o grupo costuma postar neste horário`);
    pioraPara("amarelo");
  }

  return {
    hoje,
    recebidosHoje: contagem?.recebidos ?? 0,
    repetidosHoje: contagem?.repetidos ?? 0,
    naVitrine,
    semConferencia,
    ultimoAlertaEm: ultimo?.enviadaEm ?? null,
    ponte: ponte ? { lidaEm: ponte.lidaEm, maquina: ponte.maquina, erro: ponte.erro } : null,
    monitor: ponte ? { em: ponte.monitorEm, whatsapp: m?.whatsapp ?? null, grupo: m?.grupo ?? null } : null,
    avisos,
    cor,
  };
}
