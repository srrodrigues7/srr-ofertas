import { appendFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

/**
 * Log em arquivo, um por dia, que não enche o disco.
 *
 * - um arquivo por dia: `motor-2026-10-11.log`;
 * - guarda 14 dias e apaga os mais velhos;
 * - cada dia tem teto de 20 MB: se algo entrar em laço escrevendo sem parar,
 *   o log do dia para de crescer e diz que parou.
 *
 * O dia é o de Brasília, como tudo que a equipe lê.
 */

const DIAS_GUARDADOS = 14;
const TETO_POR_DIA = 20 * 1024 * 1024;

export type Log = {
  info: (msg: string) => void;
  aviso: (msg: string) => void;
  erro: (msg: string) => void;
};

const fmtDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const fmtHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function criarLog(pasta: string, prefixo: string): Log {
  mkdirSync(pasta, { recursive: true });
  // Cano da tela quebrado (o vigia morreu) chega como erro assíncrono; sem
  // estes ouvintes ele derrubaria o processo antes de soltar a trava.
  process.stdout.on("error", () => {});
  process.stderr.on("error", () => {});
  let diaAtual = "";
  let arquivo = "";
  let estourou = false;

  function limparVelhos() {
    const limite = Date.now() - DIAS_GUARDADOS * 86_400_000;
    for (const nome of readdirSync(pasta)) {
      if (!nome.startsWith(`${prefixo}-`) || !nome.endsWith(".log")) continue;
      const cheio = path.join(pasta, nome);
      try {
        if (statSync(cheio).mtimeMs < limite) unlinkSync(cheio);
      } catch {
        // arquivo em uso ou já apagado: tenta de novo amanhã
      }
    }
  }

  function escrever(nivel: string, msg: string) {
    const agora = new Date();
    const dia = fmtDia.format(agora);
    if (dia !== diaAtual) {
      diaAtual = dia;
      arquivo = path.join(pasta, `${prefixo}-${dia}.log`);
      estourou = false;
      limparVelhos();
    }
    const linha = `${fmtHora.format(agora)} ${nivel.padEnd(5)} ${msg}\n`;
    gravarNoArquivo(agora, linha);
    // Na tela, para quem estiver rodando à mão. Vem DEPOIS do arquivo e nunca
    // derruba nada: quando o vigia morre, a "tela" do motor deixa de existir.
    try {
      (nivel === "ERRO" ? process.stderr : process.stdout).write(linha);
    } catch {
      // sem tela: o arquivo já tem a linha
    }
  }

  function gravarNoArquivo(agora: Date, linha: string) {
    if (estourou) return;
    try {
      let tamanho = 0;
      try {
        tamanho = statSync(arquivo).size;
      } catch {
        // arquivo ainda não existe
      }
      if (tamanho > TETO_POR_DIA) {
        estourou = true;
        appendFileSync(arquivo, `${fmtHora.format(agora)} AVISO o log de hoje passou de 20 MB e parou de crescer até amanhã.\n`);
        return;
      }
      appendFileSync(arquivo, linha);
    } catch {
      // Disco cheio ou sem permissão: o log não pode derrubar o motor.
    }
  }

  return {
    info: (m) => escrever("INFO", m),
    aviso: (m) => escrever("AVISO", m),
    erro: (m) => escrever("ERRO", m),
  };
}
