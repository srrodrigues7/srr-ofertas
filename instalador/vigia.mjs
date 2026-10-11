/**
 * SRR Ofertas — o vigia do motor.
 *
 * Mora em C:\SRR-Ofertas\vigia.mjs, no computador dedicado. O Windows o liga
 * quando o computador inicia (Agendador de Tarefas → iniciar.cmd), antes de
 * qualquer pessoa entrar. Ele:
 *
 * 1. **liga o motor** da versão atual e **religa** se ele cair (esperando um
 *    pouco mais a cada queda seguida, para não martelar);
 * 2. **para de insistir** quando o motor diz que falta configuração (código
 *    78): tenta de novo a cada 5 minutos e deixa o motivo no log;
 * 3. **atualiza sozinho**: de tempos em tempos olha o ramo do GitHub
 *    (SRR_RAMO, normalmente `main`, onde só entra o que o Saulo aprovou). Se
 *    houver versão nova, prepara-a numa pasta AO LADO da atual — baixa,
 *    instala, aplica as migrações, confere — e só então troca;
 * 4. **volta sozinho** para a versão anterior se a nova cair 3 vezes nos
 *    primeiros 5 minutos, e não tenta mais aquela versão.
 *
 * Tudo que ele roda tem prazo (lição 9 do Radar da HUB 92): passou do prazo,
 * é encerrado e o recurso volta.
 *
 * Não usa nenhuma biblioteca de fora: só o Node. Assim ele continua de pé
 * mesmo quando a instalação de uma versão nova dá errado.
 *
 * Mudou este arquivo? O vigia instalado não se troca sozinho (de propósito:
 * um vigia quebrado não teria quem o socorresse). Rode o instalador de novo.
 *
 * Uso:  node vigia.mjs                     (fica rodando — é o que o Windows faz)
 *       node vigia.mjs --preparar-primeira (instalador: prepara a 1ª versão e sai)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = path.dirname(fileURLToPath(import.meta.url));
const ARQ_ENV = path.join(BASE, ".env");
const PASTA_LOGS = path.join(BASE, "logs");
const REPO = path.join(BASE, "repo");
const VERSOES = path.join(BASE, "versoes");
const ARQ_ESTADO = path.join(BASE, "estado.json");

/** Porta local usada como trava: só um vigia por computador. */
const PORTA_TRAVA = 47811;
const SAIDA_CONFIGURACAO = 78;
const SAIDA_JA_RODANDO = 2;

const PROVA_MS = 5 * 60_000; // depois de atualizar, 5 min de observação
const QUEDAS_PARA_VOLTAR = 3;
const ESTAVEL_MS = 10 * 60_000; // 10 min sem cair: a versão é dada como boa
const ESPERA_CONFIG_MS = 5 * 60_000;
const NOVA_TENTATIVA_PREPARO_MS = 60 * 60_000;
const ESPERAS_QUEDA_MS = [5_000, 15_000, 60_000, 5 * 60_000];

const PRAZO = {
  git: 3 * 60_000,
  npm: 20 * 60_000,
  migrar: 5 * 60_000,
  conferir: 3 * 60_000,
  pararMotor: 20_000,
};

const SO_PREPARAR = process.argv.includes("--preparar-primeira");

// --- log: um arquivo por dia, 14 dias -----------------------------------------

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
let diaDoLog = "";

function log(nivel, msg) {
  const agora = new Date();
  const linha = `${fmtHora.format(agora)} ${nivel.padEnd(5)} ${msg}\n`;
  process.stdout.write(linha);
  try {
    fs.mkdirSync(PASTA_LOGS, { recursive: true });
    const dia = fmtDia.format(agora);
    if (dia !== diaDoLog) {
      diaDoLog = dia;
      const limite = Date.now() - 14 * 86_400_000;
      for (const nome of fs.readdirSync(PASTA_LOGS)) {
        const cheio = path.join(PASTA_LOGS, nome);
        if (nome.endsWith(".log") && fs.statSync(cheio).mtimeMs < limite) fs.rmSync(cheio, { force: true });
      }
    }
    const arquivo = path.join(PASTA_LOGS, `vigia-${dia}.log`);
    const tamanho = fs.existsSync(arquivo) ? fs.statSync(arquivo).size : 0;
    if (tamanho < 20 * 1024 * 1024) fs.appendFileSync(arquivo, linha);
  } catch {
    // o log nunca derruba o vigia
  }
}
const info = (m) => log("INFO", m);
const aviso = (m) => log("AVISO", m);
const erro = (m) => log("ERRO", m);

// --- estado em disco ------------------------------------------------------------

/** { atual, anterior, recusadas: { sha: { tipo, motivo, em } }, ... } */
function lerEstado() {
  try {
    return { recusadas: {}, ...JSON.parse(fs.readFileSync(ARQ_ESTADO, "utf8")) };
  } catch {
    return { atual: null, anterior: null, recusadas: {} };
  }
}
let estado = lerEstado();
function salvarEstado() {
  const tmp = `${ARQ_ESTADO}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(estado, null, 2));
  fs.renameSync(tmp, ARQ_ESTADO);
}

const curto = (sha) => (sha ? sha.slice(0, 7) : "nenhuma");
const pastaDa = (sha) => path.join(VERSOES, sha.slice(0, 12));
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// --- rodar um comando com prazo ------------------------------------------------

/** Roda e devolve { codigo, saida }. Passou do prazo: encerra a árvore inteira. */
function rodar(exe, args, { cwd = BASE, prazoMs, env = process.env } = {}) {
  return new Promise((resolve) => {
    let saida = "";
    const filho = spawn(exe, args, { cwd, env, windowsHide: true });
    const juntar = (b) => {
      saida = (saida + b.toString()).slice(-8000);
    };
    filho.stdout.on("data", juntar);
    filho.stderr.on("data", juntar);
    const relogio = setTimeout(() => {
      saida += `\n[passou do prazo de ${Math.round(prazoMs / 1000)} s e foi encerrado]`;
      matarArvore(filho.pid);
    }, prazoMs);
    filho.on("error", (e) => {
      clearTimeout(relogio);
      resolve({ codigo: -1, saida: `${saida}\n${e.message}` });
    });
    filho.on("close", (codigo) => {
      clearTimeout(relogio);
      resolve({ codigo: codigo ?? -1, saida });
    });
  });
}

function matarArvore(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true });
  } else {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // já tinha saído
    }
  }
}

const NPM_CLI = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");

async function git(args, prazoMs = PRAZO.git) {
  const r = await rodar(process.env.SRR_GIT || "git", ["-C", REPO, ...args], { prazoMs });
  if (r.codigo !== 0) throw new Error(`git ${args[0]} falhou: ${r.saida.trim().slice(-600)}`);
  return r.saida.trim();
}

// --- configuração do vigia -----------------------------------------------------

/** Lê o .env e confere o que o vigia precisa. Devolve a mensagem do que falta, ou null. */
function carregarAmbiente() {
  try {
    process.loadEnvFile(ARQ_ENV);
  } catch {
    return `não achei ${ARQ_ENV}`;
  }
  const faltam = ["DATABASE_URL", "SRR_RAMO", "ATUALIZAR_A_CADA_MIN"].filter((n) => !process.env[n]?.trim());
  if (faltam.length) return `falta no .env: ${faltam.join(", ")}`;
  const min = Number(process.env.ATUALIZAR_A_CADA_MIN);
  if (!Number.isInteger(min) || min < 1 || min > 1440) return "ATUALIZAR_A_CADA_MIN precisa ser um número de 1 a 1440";
  if (!fs.existsSync(path.join(REPO, ".git"))) return `não achei o código baixado em ${REPO} (rode o instalador)`;
  return null;
}

// --- preparar uma versão ao lado da atual ----------------------------------------

async function shaDoRamo() {
  const ramo = process.env.SRR_RAMO;
  await git(["fetch", "--prune", "origin", `+refs/heads/${ramo}:refs/remotes/origin/${ramo}`]);
  return git(["rev-parse", `refs/remotes/origin/${ramo}`]);
}

async function removerPasta(sha) {
  const dir = pastaDa(sha);
  await rodar(process.env.SRR_GIT || "git", ["-C", REPO, "worktree", "remove", "--force", dir], {
    prazoMs: PRAZO.git,
  });
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
  await rodar(process.env.SRR_GIT || "git", ["-C", REPO, "worktree", "prune"], { prazoMs: PRAZO.git });
}

/** Baixa, instala, migra e confere. Só devolve se a versão estiver pronta para ligar. */
async function prepararVersao(sha) {
  const dir = pastaDa(sha);
  info(`Preparando a versão ${curto(sha)} em ${dir}...`);
  if (fs.existsSync(dir)) await removerPasta(sha);
  await git(["worktree", "add", "--detach", "--force", dir, sha]);

  const etapas = [
    ["instalar as dependências", process.execPath, [NPM_CLI, "ci", "--no-audit", "--no-fund"], PRAZO.npm],
    ["aplicar as migrações do banco", process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], PRAZO.migrar],
    ["conferir .env, banco e configuração", process.execPath, ["--import", "tsx", "src/motor/motor.ts", "--conferir"], PRAZO.conferir],
  ];
  for (const [nome, exe, args, prazoMs] of etapas) {
    info(`  · ${nome}...`);
    const r = await rodar(exe, args, { cwd: dir, prazoMs, env: { ...process.env, LOG_PASTA: PASTA_LOGS } });
    if (r.codigo !== 0) {
      throw new Error(`não consegui ${nome} (código ${r.codigo}): ${r.saida.trim().slice(-800)}`);
    }
  }
  info(`Versão ${curto(sha)} pronta.`);
}

// --- o motor -----------------------------------------------------------------------

let motor = null; // o processo filho
let pedindoParada = false;
let aoParar = null;
let quedas = []; // horários das últimas quedas
let religar = null; // timer de religar
let trocouEm = 0;
let quedasNaProva = 0;

function ligarMotor(avisoParaRegistrar = "") {
  if (motor || !estado.atual) return;
  clearTimeout(religar);
  religar = null;
  const dir = pastaDa(estado.atual);
  const env = {
    ...process.env,
    MOTOR_VERSAO: curto(estado.atual),
    LOG_PASTA: PASTA_LOGS,
    MOTOR_AVISO: avisoParaRegistrar,
  };
  info(`Ligando o motor (versão ${curto(estado.atual)}).`);
  motor = spawn(process.execPath, ["--import", "tsx", "src/motor/motor.ts"], {
    cwd: dir,
    env,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    windowsHide: true,
  });
  estado.motorPid = motor.pid;
  salvarEstado();
  // O motor escreve o próprio log; aqui só esvaziamos o cano e guardamos o que
  // sair como erro (o rastro de uma queda, por exemplo).
  motor.stdout.resume();
  motor.stderr.on("data", (b) => {
    for (const l of b.toString().split(/\r?\n/)) if (l.trim()) aviso(`motor: ${l.trim()}`);
  });
  motor.on("error", (e) => {
    erro(`Não consegui ligar o motor: ${e.message}`);
    // Se nem chegou a nascer, o "exit" não vem: tratamos como queda aqui.
    if (motor && !motor.pid) aoSairMotor(-1);
  });
  motor.on("exit", (codigo) => aoSairMotor(codigo));
}

function aoSairMotor(codigo) {
  motor = null;
  estado.motorPid = null;
  salvarEstado();

  if (pedindoParada) {
    aoParar?.();
    return;
  }

  const emProva = trocouEm && Date.now() - trocouEm < PROVA_MS && estado.anterior;
  if (codigo === SAIDA_CONFIGURACAO && !emProva) {
    aviso("O motor parou por falta de configuração (o motivo está no log do motor). Tento de novo em 5 minutos.");
    religar = setTimeout(() => ligarMotor(), ESPERA_CONFIG_MS);
    return;
  }

  if (emProva) {
    quedasNaProva += 1;
    aviso(`A versão nova caiu (código ${codigo}) — ${quedasNaProva} de ${QUEDAS_PARA_VOLTAR} quedas permitidas na observação.`);
    if (quedasNaProva >= QUEDAS_PARA_VOLTAR) {
      voltarParaAnterior(codigo);
      return;
    }
  }

  const agora = Date.now();
  quedas = [...quedas.filter((t) => agora - t < 10 * 60_000), agora];
  const espera = ESPERAS_QUEDA_MS[Math.min(quedas.length - 1, ESPERAS_QUEDA_MS.length - 1)];
  aviso(`O motor caiu (código ${codigo}). Religo em ${Math.round(espera / 1000)} segundos.`);
  religar = setTimeout(() => ligarMotor(), espera);
}

function voltarParaAnterior(codigo) {
  const quebrada = estado.atual;
  const anterior = estado.anterior;
  const msg = `A versão ${curto(quebrada)} caiu ${quedasNaProva} vezes logo ao ligar (último código ${codigo}); voltei para a ${curto(anterior)} e não vou tentar a ${curto(quebrada)} de novo.`;
  erro(msg);
  estado.recusadas[quebrada] = { tipo: "quebrou", motivo: msg, em: new Date().toISOString() };
  estado.atual = anterior;
  estado.anterior = null;
  trocouEm = 0;
  quedasNaProva = 0;
  salvarEstado();
  ligarMotor(msg);
}

/** Pede para o motor parar com calma; se não parar no prazo, encerra. */
function pararMotor() {
  if (!motor) return Promise.resolve();
  pedindoParada = true;
  clearTimeout(religar);
  return new Promise((resolve) => {
    const prazo = setTimeout(() => {
      aviso("O motor não parou no prazo; encerrando à força.");
      matarArvore(motor?.pid);
    }, PRAZO.pararMotor);
    aoParar = () => {
      clearTimeout(prazo);
      pedindoParada = false;
      aoParar = null;
      resolve();
    };
    try {
      motor.send({ tipo: "parar" });
    } catch {
      matarArvore(motor.pid);
    }
  });
}

// --- atualização ---------------------------------------------------------------------

let atualizando = false;

async function verificarAtualizacao() {
  if (atualizando) return;
  atualizando = true;
  try {
    let sha;
    try {
      sha = await shaDoRamo();
    } catch (e) {
      aviso(`Não consegui olhar se há versão nova (sem internet?): ${e.message}`);
      return;
    }
    estado.ultimaVerificacao = new Date().toISOString();
    salvarEstado();
    if (sha === estado.atual) return;

    const recusa = estado.recusadas[sha];
    if (recusa?.tipo === "quebrou") return;
    if (recusa?.tipo === "preparo" && Date.now() - Date.parse(recusa.em) < NOVA_TENTATIVA_PREPARO_MS) return;

    info(`Versão nova no ramo ${process.env.SRR_RAMO}: ${curto(sha)} (atual: ${curto(estado.atual)}).`);
    try {
      await prepararVersao(sha);
    } catch (e) {
      erro(`A versão ${curto(sha)} não ficou pronta; sigo com a ${curto(estado.atual)}. ${e.message}`);
      estado.recusadas[sha] = { tipo: "preparo", motivo: e.message.slice(0, 1500), em: new Date().toISOString() };
      salvarEstado();
      await removerPasta(sha).catch(() => {});
      return;
    }

    const de = estado.atual;
    await pararMotor();
    estado.anterior = de;
    estado.atual = sha;
    estado.ultimaAtualizacao = new Date().toISOString();
    delete estado.recusadas[sha];
    salvarEstado();
    trocouEm = Date.now();
    quedasNaProva = 0;
    quedas = [];
    ligarMotor(`Atualizou da versão ${curto(de)} para a ${curto(sha)}.`);
    setTimeout(darComoEstavel, ESTAVEL_MS);
  } finally {
    atualizando = false;
  }
}

/** Passada a observação sem voltar: guarda só a atual e a anterior. */
async function darComoEstavel() {
  if (!trocouEm || Date.now() - trocouEm < ESTAVEL_MS) return;
  trocouEm = 0;
  info(`A versão ${curto(estado.atual)} está estável.`);
  const manter = new Set([estado.atual, estado.anterior].filter(Boolean).map((s) => s.slice(0, 12)));
  for (const nome of fs.existsSync(VERSOES) ? fs.readdirSync(VERSOES) : []) {
    if (!manter.has(nome)) {
      info(`Apagando a versão velha ${nome.slice(0, 7)}.`);
      await removerPasta(nome).catch((e) => aviso(`Não consegui apagar ${nome}: ${e.message}`));
    }
  }
}

/** O vigia instalado é diferente do vigia do código atual? Avisa (não se troca sozinho). */
function vigiaDesatualizado() {
  try {
    const doCodigo = fs.readFileSync(path.join(pastaDa(estado.atual), "instalador", "vigia.mjs"), "utf8");
    const instalado = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
    return doCodigo.replace(/\r\n/g, "\n") !== instalado.replace(/\r\n/g, "\n");
  } catch {
    return false;
  }
}

// --- começo --------------------------------------------------------------------------

function pegarTravaDoComputador() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", () => resolve(false));
    s.listen(PORTA_TRAVA, "127.0.0.1", () => resolve(true));
    // O servidor fica aberto enquanto o vigia viver; o Windows solta a porta
    // sozinho se o processo morrer.
  });
}

async function principal() {
  if (!(await pegarTravaDoComputador())) {
    info("Já existe um vigia rodando neste computador. Este sai sem fazer nada.");
    process.exit(SAIDA_JA_RODANDO);
  }

  // Sem configuração, espera e tenta de novo — não sai, para o Windows não
  // ficar religando um vigia que vai falhar igual.
  for (;;) {
    const falta = carregarAmbiente();
    if (!falta) break;
    erro(`O vigia não pode começar: ${falta}.`);
    if (SO_PREPARAR) process.exit(1);
    await dormir(ESPERA_CONFIG_MS);
  }

  info(`Vigia de pé (processo ${process.pid}). Ramo: ${process.env.SRR_RAMO}. Pasta: ${BASE}.`);
  estado.vigiaPid = process.pid;
  salvarEstado();

  // Sem versão pronta (primeira vez, ou a pasta sumiu): prepara a do ramo.
  while (!estado.atual || !fs.existsSync(path.join(pastaDa(estado.atual), "node_modules"))) {
    try {
      const sha = await shaDoRamo();
      await prepararVersao(sha);
      estado.atual = sha;
      estado.anterior = null;
      estado.ultimaAtualizacao = new Date().toISOString();
      salvarEstado();
    } catch (e) {
      erro(`Não consegui preparar a primeira versão: ${e.message}`);
      if (SO_PREPARAR) process.exit(1);
      await dormir(ESPERA_CONFIG_MS);
    }
  }

  if (SO_PREPARAR) {
    info(`Primeira versão pronta: ${curto(estado.atual)}.`);
    process.exit(0);
  }

  const avisoInicial = vigiaDesatualizado()
    ? "O vigia instalado é mais velho que o do código. Rode o instalador de novo quando puder."
    : "";
  if (avisoInicial) aviso(avisoInicial);
  ligarMotor(avisoInicial);

  const cadaMin = Number(process.env.ATUALIZAR_A_CADA_MIN);
  setTimeout(verificarAtualizacao, 60_000);
  setInterval(verificarAtualizacao, cadaMin * 60_000);

  const sair = async (porque) => {
    info(`Vigia saindo: ${porque}.`);
    await pararMotor();
    process.exit(0);
  };
  process.on("SIGINT", () => sair("Ctrl+C"));
  process.on("SIGTERM", () => sair("pedido do sistema"));
  process.on("SIGBREAK", () => sair("pedido do Windows"));
}

principal().catch((e) => {
  erro(`O vigia caiu: ${e?.stack ?? e}`);
  matarArvore(motor?.pid);
  process.exit(1);
});
