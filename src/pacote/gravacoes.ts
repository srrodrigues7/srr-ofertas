import { prisma } from "./banco";
import { lerConfiguracao, limitesDe } from "./configuracao";
import { FONTE_ALERTA } from "./alertas";
import { conferirAMao } from "./conferencia";

/**
 * O que as telas do Radar gravam: pedidos para o motor ("Buscar agora",
 * "Conferir agora"), os pedidos de busca e os Valores. Toda entrada é conferida
 * aqui, antes de gravar, para as mesmas regras valerem no Radar e no VoePro.
 *
 * **Sem login aqui.** Quem chama confere antes, na primeira linha da ação:
 * no Radar, `exigirAcesso()`; no VoePro, `exigirAcao("RADAR")` ou
 * `exigirAcao("RADAR_VALORES")`. E quem chama atualiza a tela depois.
 *
 * Nenhuma função daqui roda código do motor: o que precisa do motor vira um
 * pedido que ele atende na passada seguinte.
 */

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
function numero(f: FormData, k: string): number | null {
  const v = texto(f, k).replace(/\./g, "").replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
const codigo = (v: string) => (/^[A-Z]{3}$/.test(v.toUpperCase()) ? v.toUpperCase() : null);

// --- pedidos para o motor -----------------------------------------------------

/** "Buscar agora": entra na fila; o motor pega em segundos. Clicar de novo não duplica. */
export async function pedirBuscaAgora(buscaId: number): Promise<void> {
  if (!Number.isInteger(buscaId) || buscaId < 1) throw new Error("Pedido de busca inválido.");
  await prisma.$executeRaw`
    INSERT INTO "ofertas"."busca_agora" (busca_id) VALUES (${buscaId})
    ON CONFLICT DO NOTHING`;
}

/** "Conferir agora" (V1b): o robô confere a oferta no portal da fonte. Entra na
 *  fila; o motor atende. Clicar de novo não duplica (índice único parcial). */
export async function pedirConferencia(ofertaId: string): Promise<void> {
  if (!/^\d{1,19}$/.test(ofertaId)) throw new Error("Oferta inválida.");
  await prisma.$executeRaw`
    INSERT INTO "ofertas"."conferencia_pedido" (oferta_id, motivo) VALUES (${BigInt(ofertaId)}, 'botao')
    ON CONFLICT DO NOTHING`;
}

// --- pedidos de busca ---------------------------------------------------------

export async function salvarBusca(f: FormData): Promise<void> {
  const origem = codigo(texto(f, "origem"));
  const destino = codigo(texto(f, "destino"));
  const estadiaMin = numero(f, "estadiaMin");
  const estadiaMax = numero(f, "estadiaMax");
  const classe = texto(f, "classe") === "executiva" ? "executiva" : "economica";
  if (!origem || !destino || origem === destino) throw new Error("Origem e destino: códigos de 3 letras, diferentes.");
  if (estadiaMin == null || estadiaMax == null || estadiaMin < 1 || estadiaMax < estadiaMin || estadiaMax > 90) {
    throw new Error("Estadia: mínimo de 1 dia, e o máximo não pode ser menor que o mínimo.");
  }
  const cidade = texto(f, "cidade");
  if (cidade) {
    await prisma.lugar.upsert({ where: { codigo: destino }, create: { codigo: destino, cidade }, update: {} });
  }
  await prisma.busca.create({
    data: { origem, destino, estadiaMin, estadiaMax, classe, idaVolta: texto(f, "soIda") !== "on" },
  });
}

export async function alternarBusca(id: number, ligada: boolean): Promise<void> {
  await prisma.busca.update({ where: { id }, data: { ligada } });
}

export async function apagarBusca(id: number): Promise<void> {
  await prisma.busca.delete({ where: { id } });
}

// --- Valores ------------------------------------------------------------------

export async function salvarPrograma(f: FormData): Promise<void> {
  const id = texto(f, "id");
  const preco = numero(f, "precoMilheiro");
  if (preco != null && (preco <= 0 || preco > 500)) throw new Error("Milheiro: entre R$ 0,01 e R$ 500.");
  await prisma.programa.update({ where: { id }, data: { precoMilheiro: preco, usaClube: texto(f, "usaClube") === "on" } });
}

export async function salvarMargem(f: FormData): Promise<void> {
  const tipo = texto(f, "tipo");
  const percentual = numero(f, "percentual");
  const minimo = numero(f, "minimo");
  if (percentual == null || percentual < 0 || percentual > 100 || minimo == null || minimo < 0) {
    throw new Error("Margem: percentual de 0 a 100 e mínimo a partir de R$ 0.");
  }
  await prisma.margem.upsert({
    where: { tipo },
    create: { tipo, percentual, minimoBrl: minimo },
    update: { percentual, minimoBrl: minimo },
  });
}

export async function salvarParcela(f: FormData): Promise<void> {
  const parcelas = numero(f, "parcelas");
  const taxa = numero(f, "taxa");
  if (parcelas == null || !Number.isInteger(parcelas) || parcelas < 1 || parcelas > 24) throw new Error("Parcelas: de 1 a 24.");
  if (taxa == null) {
    await prisma.parcelaTaxa.deleteMany({ where: { parcelas } });
  } else {
    if (taxa < 0 || taxa > 50) throw new Error("Taxa: de 0% a 50%.");
    await prisma.parcelaTaxa.upsert({ where: { parcelas }, create: { parcelas, taxa }, update: { taxa } });
  }
}

export async function salvarFaixa(f: FormData): Promise<void> {
  const id = numero(f, "id");
  const deMes = numero(f, "deMes");
  const ateMes = numero(f, "ateMes");
  const intervaloHoras = numero(f, "intervaloHoras");
  if (deMes == null || ateMes == null || intervaloHoras == null || deMes < 0 || ateMes < deMes || ateMes > 23 || intervaloHoras < 1) {
    throw new Error("Faixa: meses de 0 a 23 (o fim não antes do começo) e intervalo de pelo menos 1 hora.");
  }
  if (id) await prisma.faixaBusca.update({ where: { id }, data: { deMes, ateMes, intervaloHoras } });
  else await prisma.faixaBusca.create({ data: { deMes, ateMes, intervaloHoras } });
}

export async function apagarFaixa(id: number): Promise<void> {
  if ((await prisma.faixaBusca.count()) <= 1) throw new Error("Precisa sobrar ao menos uma faixa.");
  await prisma.faixaBusca.delete({ where: { id } });
}

export async function alternarFonte(id: string, ligada: boolean): Promise<void> {
  await prisma.fonte.update({ where: { id }, data: { ligada } });
}

/** As chaves numéricas da tabela de configuração, com os limites do catálogo. */
export async function salvarConfiguracao(f: FormData): Promise<void> {
  const chave = texto(f, "chave");
  const limites = limitesDe(chave);
  const valor = numero(f, "valor");
  if (!limites) throw new Error(`Chave desconhecida: ${chave}`);
  if (valor == null || !Number.isInteger(valor) || valor < limites.min || valor > limites.max) {
    throw new Error(`${chave}: um número inteiro de ${limites.min} a ${limites.max}.`);
  }
  await prisma.configuracao.update({ where: { chave }, data: { valor } });
}

// --- V6: alertas do WhatsApp ----------------------------------------------------

/** "Conferi" — a equipe conferiu a oferta de alerta no site do programa (Azul,
 *  LATAM, Smiles executiva, ou a taxa que o alerta não deu). Fica o nome e a hora. */
export async function conferirAlerta(ofertaId: string, f: FormData): Promise<void> {
  if (!/^\d{1,19}$/.test(ofertaId)) throw new Error("Oferta inválida.");
  const milhas = numero(f, "milhas");
  await conferirAMao(BigInt(ofertaId), {
    quem: texto(f, "quem"),
    esgotou: texto(f, "acao") === "esgotou",
    milhas: milhas != null ? Math.round(milhas) : null,
    taxasBrl: numero(f, "taxas"),
  });
}

/** Valores: o nome de programa que aparece nos alertas → um programa do radar
 *  (ou nenhum = fora da vitrine). Os alertas recentes são relidos com a regra nova. */
export async function salvarAlertaPrograma(nome: string, f: FormData): Promise<void> {
  const programaId = texto(f, "programa") || null;
  if (programaId && !(await prisma.programa.findUnique({ where: { id: programaId } }))) {
    throw new Error("Programa desconhecido.");
  }
  await prisma.alertaPrograma.update({ where: { nome }, data: { programaId } });
  await pedirReleituraDosAlertas();
}

/** Valores: de onde um alerta pode ir para a vitrine. */
export async function salvarAlertaOrigem(f: FormData): Promise<void> {
  const c = codigo(texto(f, "codigo"));
  if (!c) throw new Error("Origem: código de 3 letras.");
  const soInternacional = texto(f, "soInternacional") === "on";
  await prisma.alertaOrigem.upsert({ where: { codigo: c }, create: { codigo: c, soInternacional }, update: { soInternacional } });
  await pedirReleituraDosAlertas();
}

export async function tirarAlertaOrigem(codigoOrigem: string): Promise<void> {
  await prisma.alertaOrigem.delete({ where: { codigo: codigoOrigem } });
  await pedirReleituraDosAlertas();
}

/**
 * A regra dos alertas mudou: os alertas recentes (dentro da validade, ou de
 * hoje) voltam a "falta ler" e as ofertas de alerta saem da vitrine. O motor
 * relê os pendentes na passada seguinte (`processarAlertas` → `lerPendentes`)
 * e grava de novo o que passar na regra nova.
 *
 * Antes (até a etapa L) a tela relia na hora, rodando o leitor do motor; agora
 * nenhuma tela roda código do motor. O motor (`relerRecentes`) usa esta mesma
 * marcação.
 */
export async function pedirReleituraDosAlertas(): Promise<void> {
  const { "alertas.validade_horas": horas } = await lerConfiguracao(["alertas.validade_horas"]);
  await prisma.$executeRaw`
    UPDATE "ofertas"."alerta_mensagem" SET lida_em = NULL
     WHERE enviada_em >= LEAST(now() - (${horas}::int * interval '1 hour'),
                               date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')`;
  await prisma.$executeRaw`UPDATE "ofertas"."oferta" SET ativa = false WHERE ativa AND fonte_id = ${FONTE_ALERTA}`;
}
