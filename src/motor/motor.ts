/**
 * O motor do SRR Ofertas.
 *
 * Roda no computador dedicado, de pé o tempo todo, e faz uma "passada" a cada
 * intervalo (`motor.intervalo_s`). Nesta etapa a passada só prova que roda: o
 * banco responde e o registro fica gravado. As etapas seguintes penduram aqui
 * a coleta, o preço normal, a nota.
 *
 * Três regras guiam o desenho:
 *
 * 1. **Só um trabalha.** Antes de cada passada o motor precisa estar com a
 *    trava (src/lib/motor/trava.ts). Um segundo motor ligado fica esperando e
 *    assume sozinho se o primeiro morrer.
 * 2. **Falha fechada.** Sem DATABASE_URL, ou com a configuração incompleta, ele
 *    não sobe: diz o que falta e sai com o código 78, que o vigia reconhece.
 * 3. **Falha passageira não derruba.** Banco fora do ar ou Wi-Fi caído não são
 *    erro de configuração: o motor registra, espera e tenta de novo. A tela de
 *    Saúde mostra o buraco.
 *
 * Quem liga, religa e atualiza este processo é o vigia (instalador/vigia.mjs).
 *
 * Uso:  npm run motor               (fica rodando)
 *       npm run motor -- --conferir (confere .env, banco e configuração e sai)
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { ErroDeConfiguracao, SAIDA_CONFIGURACAO, exigirAmbiente, mensagemDe } from "@/lib/erros";
import { criarLog } from "@/lib/log";
import type { Instancia } from "@/lib/motor/trava";

try {
  process.loadEnvFile();
} catch {
  // Sem .env na pasta: no computador dedicado as variáveis vêm do vigia.
}

const log = criarLog(process.env.LOG_PASTA || path.join(process.cwd(), "logs"), "motor");
const SO_CONFERIR = process.argv.includes("--conferir");

/** De quanto em quanto tempo o motor diz "estou vivo" e renova a trava. Bem
 *  menor que a validade da trava, para um atraso de rede não a perder. */
const BATIMENTO_MAX_MS = 20_000;
/** A faxina dos registros velhos roda no máximo uma vez por hora. */
const FAXINA_MS = 60 * 60_000;

function descobrirVersao(): string {
  if (process.env.MOTOR_VERSAO) return process.env.MOTOR_VERSAO;
  try {
    const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
    return `${sha}-local`;
  } catch {
    return "desconhecida";
  }
}

const eu: Instancia = {
  id: randomUUID(),
  maquina: process.env.MOTOR_MAQUINA?.trim() || os.hostname(),
  pid: process.pid,
  versao: descobrirVersao(),
};

// --- desligar com educação ---------------------------------------------------

let parando = false;
let acordar: (() => void) | null = null;

function pedirParada(motivo: string) {
  if (parando) return;
  parando = true;
  log.info(`Desligando: ${motivo}.`);
  acordar?.();
}

/** Espera, mas acorda na hora se alguém pedir para parar. */
function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(fim, ms);
    function fim() {
      clearTimeout(t);
      acordar = null;
      resolve();
    }
    acordar = fim;
  });
}

process.on("SIGINT", () => pedirParada("Ctrl+C"));
process.on("SIGTERM", () => pedirParada("pedido do sistema"));
process.on("SIGBREAK", () => pedirParada("pedido do Windows"));
if (process.send) {
  // Ligado pelo vigia: ele pede para parar por mensagem (no Windows não há
  // sinal de "pare com calma"). Se o vigia sumir, o motor não fica órfão.
  process.on("message", (m: unknown) => {
    if ((m as { tipo?: string })?.tipo === "parar") pedirParada("o vigia pediu");
  });
  process.on("disconnect", () => pedirParada("o vigia foi encerrado"));
}

// --- o motor ----------------------------------------------------------------

async function principal(): Promise<number> {
  log.info(`Motor subindo: máquina ${eu.maquina}, versão ${eu.versao}, processo ${eu.pid}.`);

  exigirAmbiente(["DATABASE_URL"]);

  // Só depois de conferir o .env: o módulo do banco recusa subir sem ele.
  const { prisma } = await import("@/lib/prisma");
  const { lerConfiguracao, CHAVES_DO_MOTOR } = await import("@/lib/configuracao");
  const trava = await import("@/lib/motor/trava");

  if (SO_CONFERIR) {
    await prisma.$queryRaw`SELECT 1`;
    await lerConfiguracao(CHAVES_DO_MOTOR);
    log.info("Conferência ok: .env, banco e configuração estão completos.");
    await prisma.$disconnect();
    return 0;
  }

  async function evento(tipo: string, mensagem: string) {
    try {
      await prisma.motorEvento.create({
        data: { maquina: eu.maquina, versao: eu.versao, tipo, mensagem: mensagem.slice(0, 1000) },
      });
    } catch (e) {
      log.aviso(`Não consegui registrar o evento "${tipo}" no banco: ${mensagemDe(e)}`);
    }
  }

  // A primeira leitura da configuração decide se o motor sobe. Banco fora do
  // ar aqui não é motivo para desistir: espera e tenta de novo.
  let cfg = await (async () => {
    for (;;) {
      try {
        return await lerConfiguracao(CHAVES_DO_MOTOR);
      } catch (e) {
        if (e instanceof ErroDeConfiguracao || parando) throw e;
        log.aviso(`Banco inacessível ao subir (${mensagemDe(e)}). Tento de novo em 30 segundos.`);
        await esperar(30_000);
        if (parando) throw new Error("desligado antes de conectar");
      }
    }
  })();

  await prisma.motorInstancia.create({
    data: { id: eu.id, maquina: eu.maquina, pid: eu.pid, versao: eu.versao, estado: "esperando" },
  });
  await evento("subiu", `Motor subiu (processo ${eu.pid}).`);
  if (process.env.MOTOR_AVISO) await evento("aviso_do_vigia", process.env.MOTOR_AVISO);

  // --- batimento: renova a trava e diz "estou vivo", independente da passada.
  let souDono = false;
  let primeiroBatimento = true;
  let batendo = false;
  let erroDeConfiguracao: ErroDeConfiguracao | null = null;

  async function batimento() {
    if (batendo || parando) return;
    batendo = true;
    try {
      const tem = await trava.pegarOuRenovar(eu, cfg["motor.trava_validade_s"]);
      if (tem && !souDono) {
        log.info("Peguei a trava: este motor é quem trabalha agora.");
        await evento("assumiu", "Pegou a trava e passou a trabalhar.");
      } else if (!tem && souDono) {
        log.aviso("Perdi a trava: outro motor assumiu. Passo a esperar.");
        await evento("perdeu", "Perdeu a trava para outro motor e passou a esperar.");
      } else if (!tem && primeiroBatimento) {
        const outro = await trava.quemTrabalha();
        log.info(`Outro motor está trabalhando (máquina ${outro ?? "?"}). Fico esperando a vez.`);
        await evento("esperando", `Outro motor está com a trava (máquina ${outro ?? "?"}).`);
      }
      souDono = tem;
      primeiroBatimento = false;
      await prisma.$executeRaw`
        UPDATE "ofertas"."motor_instancia"
           SET visto_em = now(), estado = ${tem ? "trabalhando" : "esperando"}
         WHERE id = ${eu.id}`;
    } catch (e) {
      // Sem banco não há como saber se a trava continua minha: paro de
      // trabalhar até o próximo batimento confirmar.
      souDono = false;
      log.aviso(`Batimento falhou: ${mensagemDe(e)}`);
    } finally {
      batendo = false;
    }
  }

  const passoBatimento = () =>
    Math.min(BATIMENTO_MAX_MS, Math.floor((cfg["motor.trava_validade_s"] * 1000) / 3));
  let relogio = setInterval(batimento, passoBatimento());
  await batimento();

  // --- passadas -------------------------------------------------------------
  let ultimaFaxina = 0;

  async function passada() {
    const numero = await trava.proximaPassada(eu);
    if (numero === null) {
      souDono = false;
      return;
    }
    const [linha] = await prisma.$queryRaw<{ id: bigint }[]>`
      INSERT INTO "ofertas"."passada" (numero, instancia_id, maquina, versao, status)
      VALUES (${numero}, ${eu.id}, ${eu.maquina}, ${eu.versao}, 'rodando')
      RETURNING id`;
    const inicio = performance.now();
    let status = "ok";
    let resumo: string | null = null;
    let erro: string | null = null;

    try {
      // A prova de vida desta etapa. A O2 troca isto pela coleta.
      const t = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      resumo = `Passada de prova: o banco respondeu em ${Math.round(performance.now() - t)} ms.`;

      if (Date.now() - ultimaFaxina > FAXINA_MS) {
        ultimaFaxina = Date.now();
        const dias = cfg["passadas.guardar_dias"];
        const apagadas = await prisma.$executeRaw`
          DELETE FROM "ofertas"."passada" WHERE comecou_em < now() - (${dias}::int * interval '1 day')`;
        await prisma.$executeRaw`
          DELETE FROM "ofertas"."motor_evento" WHERE em < now() - (${dias}::int * interval '1 day')`;
        await prisma.$executeRaw`
          DELETE FROM "ofertas"."motor_instancia" WHERE visto_em < now() - interval '7 days'`;
        if (apagadas) resumo += ` Faxina: ${apagadas} passada(s) com mais de ${dias} dias apagada(s).`;
      }
    } catch (e) {
      status = "erro";
      erro = mensagemDe(e).slice(0, 1000);
      log.erro(`Passada ${numero} falhou: ${erro}`);
    }

    const duracaoMs = Math.round(performance.now() - inicio);
    await prisma.$executeRaw`
      UPDATE "ofertas"."passada"
         SET terminou_em = now(), duracao_ms = ${duracaoMs}, status = ${status},
             resumo = ${resumo}, erro = ${erro}
       WHERE id = ${linha.id}`;
    if (status === "ok") log.info(`Passada ${numero} ok (${duracaoMs} ms).`);
  }

  while (!parando) {
    try {
      // A configuração é relida a cada volta: mudou no banco, vale na próxima.
      const nova = await lerConfiguracao(CHAVES_DO_MOTOR);
      if (nova["motor.trava_validade_s"] !== cfg["motor.trava_validade_s"]) {
        cfg = nova;
        clearInterval(relogio);
        relogio = setInterval(batimento, passoBatimento());
      }
      cfg = nova;
      if (souDono) await passada();
    } catch (e) {
      if (e instanceof ErroDeConfiguracao) {
        erroDeConfiguracao = e;
        break;
      }
      log.erro(`Volta do motor falhou: ${mensagemDe(e)}`);
    }
    await esperar(cfg["motor.intervalo_s"] * 1000);
  }

  // --- saída ------------------------------------------------------------------
  clearInterval(relogio);
  try {
    await trava.soltar(eu);
    await prisma.$executeRaw`
      UPDATE "ofertas"."motor_instancia" SET visto_em = now(), estado = 'parou' WHERE id = ${eu.id}`;
    if (erroDeConfiguracao) {
      await evento("sem_configuracao", erroDeConfiguracao.message);
    } else {
      await evento("parou", "Motor desligado com calma.");
    }
    await prisma.$disconnect();
  } catch (e) {
    log.aviso(`Não consegui soltar a trava ao sair (${mensagemDe(e)}). Ela vence sozinha.`);
  }
  if (erroDeConfiguracao) throw erroDeConfiguracao;
  log.info("Motor desligado.");
  return 0;
}

principal().then(
  (codigo) => process.exit(codigo),
  (e) => {
    if (e instanceof ErroDeConfiguracao) {
      log.erro(`O motor NÃO subiu. ${e.message}`);
      process.exit(SAIDA_CONFIGURACAO);
    }
    if (parando) {
      log.info("Motor desligado antes de terminar de subir.");
      process.exit(0);
    }
    log.erro(`O motor caiu: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
    process.exit(1);
  },
);
