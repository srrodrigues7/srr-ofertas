import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Prisma } from "@/generated/ofertas/client";
import { prisma } from "@/lib/prisma";
import { mensagemDe } from "@/pacote/erros";

/**
 * A PONTE (V6): copia as mensagens do grupo de passagens do arquivo do monitor
 * de WhatsApp do Saulo para `ofertas.alerta_mensagem`.
 *
 * Decisão do Saulo (30/10/2026): o monitor NÃO é tocado. A ponte só LÊ dois
 * arquivos que ele já escreve, na pasta `MONITOR_WHATSAPP_PASTA` (.env):
 *
 * - `data/passagens-messages.json` — as mensagens do grupo de passagens (o
 *   monitor grava trocando o arquivo inteiro de uma vez, então a leitura nunca
 *   pega um arquivo pela metade; se pegar um inválido, usa o `.bak` dele);
 * - `data/runtime-status.json` — o estado do monitor (WhatsApp conectado? o
 *   grupo está sendo lido?), para a Saúde.
 *
 * Nada mais da pasta é lido — em especial a sessão do WhatsApp (`.wwebjs_auth`)
 * e as mensagens do grupo de promoções. O autor (telefone) não é copiado.
 *
 * Roda dentro do motor quando o monitor está no mesmo computador; noutro
 * computador, `npm run alertas -- --vigiar` faz o mesmo sozinho.
 */

/** Só as mensagens destes últimos dias vão para o banco (o arquivo cresce sem
 *  parar; o que é mais velho não vira oferta nem conta na Saúde). */
const DIAS_PARA_TRAS = 60;

type MensagemDoMonitor = {
  id: string;
  groupName?: string;
  timestamp: string;
  body?: string;
  type?: string;
  hasMedia?: boolean;
};

export type ResultadoDaPonte =
  | { configurada: false; texto: string }
  | { configurada: true; noArquivo: number; novas: number; texto: string };

export function pastaDoMonitor(): string | null {
  return process.env.MONITOR_WHATSAPP_PASTA?.trim() || null;
}

/** A mesma impressão digital que o monitor usa: mudou o texto, é outra revisão. */
function revisaoDe(m: MensagemDoMonitor): string {
  return createHash("sha256").update(JSON.stringify([m.body ?? "", m.type ?? "chat", Boolean(m.hasMedia)])).digest("hex");
}

/** O mesmo alerta postado de novo: o texto igual, sem contar espaços e quebras. */
export function assinaturaDe(texto: string): string {
  return createHash("sha256").update(texto.replace(/\s+/g, "")).digest("hex");
}

async function lerJson<T>(arquivo: string): Promise<T> {
  try {
    return JSON.parse((await readFile(arquivo, "utf8")).replace(/^﻿/, "")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") throw e;
    // Arquivo inválido (raro: o monitor troca o arquivo de uma vez): o backup dele.
    return JSON.parse((await readFile(`${arquivo}.bak`, "utf8")).replace(/^﻿/, "")) as T;
  }
}

/** O resumo do estado do monitor que interessa à Saúde (sem ids internos). */
function resumoDoMonitor(s: Record<string, unknown>) {
  const grupos = (s.monitoredGroups ?? {}) as Record<string, Record<string, unknown>>;
  const g = grupos.flights ?? {};
  return {
    whatsapp: (s.actualWhatsAppState ?? s.whatsappState ?? null) as string | null,
    grupo: (g.status ?? null) as string | null,
    grupoLidoEm: (g.lastSyncAt ?? null) as string | null,
    ultimaMensagemEm: (g.lastMessageAt ?? null) as string | null,
    erro: typeof s.lastError === "string" && s.lastError ? s.lastError.slice(0, 200) : null,
  };
}

export async function passarPonte(): Promise<ResultadoDaPonte> {
  const pasta = pastaDoMonitor();
  if (!pasta) return { configurada: false, texto: "" };
  const maquina = process.env.MOTOR_MAQUINA?.trim() || os.hostname();

  try {
    const arquivo = path.join(pasta, "data", "passagens-messages.json");
    const mensagens = await lerJson<MensagemDoMonitor[]>(arquivo);
    if (!Array.isArray(mensagens)) throw new Error("o arquivo de mensagens do monitor não é uma lista");

    let monitorEm: Date | null = null;
    let monitor: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
    try {
      const s = await lerJson<Record<string, unknown>>(path.join(pasta, "data", "runtime-status.json"));
      monitorEm = typeof s.updatedAt === "string" ? new Date(s.updatedAt) : null;
      monitor = resumoDoMonitor(s);
    } catch {
      // Sem o estado, a ponte segue: a Saúde mede pelo que chega.
    }

    const desde = Date.now() - DIAS_PARA_TRAS * 86_400_000;
    const recentes = mensagens
      .filter((m) => m && Date.parse(m.timestamp) >= desde && (m.body ?? "").trim())
      // O monitor às vezes guarda uma mensagem sem o id do WhatsApp (visto em
      // 29/10/2026): ganha um id estável pela hora e pelo texto, para não se perder.
      .map((m) => (typeof m.id === "string" && m.id ? m : { ...m, id: `sem-id:${m.timestamp}:${assinaturaDe(m.body ?? "").slice(0, 16)}` }));
    const jaTem = new Map(
      (
        await prisma.alertaMensagem.findMany({
          where: { id: { in: recentes.map((m) => m.id) } },
          select: { id: true, revisao: true },
        })
      ).map((r) => [r.id, r.revisao]),
    );
    const novas = recentes.filter((m) => jaTem.get(m.id) !== revisaoDe(m));
    for (let i = 0; i < novas.length; i += 100) {
      const lote = novas.slice(i, i + 100).map(
        (m) => Prisma.sql`(
          ${m.id}, ${m.groupName ?? ""}, ${m.body ?? ""}, ${Boolean(m.hasMedia)},
          ${new Date(m.timestamp)}, ${revisaoDe(m)}, ${assinaturaDe(m.body ?? "")})`,
      );
      // Mensagem editada (revisão nova): volta a "falta ler".
      await prisma.$executeRaw`
        INSERT INTO "ofertas"."alerta_mensagem" (id, grupo, texto, tem_midia, enviada_em, revisao, assinatura)
        VALUES ${Prisma.join(lote)}
        ON CONFLICT (id) DO UPDATE SET
          texto = EXCLUDED.texto, tem_midia = EXCLUDED.tem_midia, revisao = EXCLUDED.revisao,
          assinatura = EXCLUDED.assinatura, recebida_em = now(), lida_em = NULL`;
    }

    await prisma.alertaPonte.upsert({
      where: { id: "ponte" },
      create: { id: "ponte", maquina, lidaEm: new Date(), noArquivo: mensagens.length, novas: novas.length, monitorEm, monitor, erro: null },
      update: { maquina, lidaEm: new Date(), noArquivo: mensagens.length, novas: novas.length, monitorEm, monitor, erro: null },
    });
    return {
      configurada: true,
      noArquivo: mensagens.length,
      novas: novas.length,
      texto: novas.length ? `Ponte: ${novas.length} mensagem(ns) nova(s) do grupo de passagens.` : "",
    };
  } catch (e) {
    const erro = `não consegui ler o arquivo do monitor: ${mensagemDe(e)}`.slice(0, 500);
    await prisma.alertaPonte.upsert({
      where: { id: "ponte" },
      create: { id: "ponte", maquina, erro },
      update: { maquina, erro },
    });
    return { configurada: true, noArquivo: 0, novas: 0, texto: `Ponte: ${erro}` };
  }
}
