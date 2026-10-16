/*
 * Prova — Pátria Consolidadora: o portal não serve para robô; o caminho é a
 * API oficial da Wooba (Travellink). Detalhes em docs/fontes/patria.md.
 *
 * Sem credencial (hoje), mostra com poucas consultas leves:
 *   1. o login do portal (portal.patria.tur.br, sistema Travellink) tem
 *      reCAPTCHA — robô não entra sozinho, e não contornamos;
 *   2. a documentação pública da API Travellink (aéreo e hotel) está no ar;
 *   3. a tabela pública de parcelamento por companhia aérea da Pátria
 *      (patria.tur.br/parcelamento) — é dela que sai o "N× sem juros" de cada
 *      oferta, porque a API só dá as parcelas depois de uma reserva.
 *
 * Com a credencial (quando a Wooba homologar o "SRR Ofertas" e a Pátria gerar
 * o acesso), faz também uma busca de voos de verdade, só consulta:
 *
 *   node --env-file=.env scripts/provas/patria-wooba.ts --origem BSB --destino LIS \
 *        --ida 2027-03-10 --volta 2027-03-20 [--cabine C] [--adultos 1]
 *
 * Variáveis no .env (quem põe é o Saulo; nunca no chat nem no commit):
 *   WOOBA_DEVELOPER_TOKEN      token de desenvolvedor (da Wooba)
 *   WOOBA_DEVELOPER_CODIGO     developer access code (da Wooba)
 *   WOOBA_CHAVE_PUBLICA_XML    chave pública RSA da Wooba (<RSAKeyValue>…)
 *   PATRIA_WOOBA_URL           endereço de produção da Pátria (…/AereoNoSession.svc)
 *   PATRIA_WOOBA_LOGIN         login do ambiente Pátria (usuário só do robô)
 *   PATRIA_WOOBA_SENHA         senha desse login
 *
 * Nunca chama reservar, tarifar, emitir nem cancelar — só RecuperarSistemasPesquisa
 * e Disponibilidade. Roda direto no Node 24, sem instalar nada, sem banco.
 */

import { constants, createPublicKey, publicEncrypt } from "node:crypto";

const AGENTE = "SRRViagens-RadarOfertas/0.1 (prova de captura; agencia parceira Patria)";
const PRAZO_MS = 30_000;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

function argumento(nome: string, padrao = ""): string {
  const i = process.argv.indexOf(`--${nome}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
}

async function texto(url: string): Promise<{ status: number; corpo: string }> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(PRAZO_MS) });
    return { status: r.status, corpo: await r.text() };
  } catch (e) {
    return { status: 0, corpo: e instanceof Error ? e.message : String(e) };
  }
}

// ------------------------------------------------------------ parte aberta

type RegraParcela = { companhia: string; semJuros: number | null; resumo: string };

/** Lê a tabela pública de parcelamento: uma janela por companhia aérea. */
function lerParcelamento(html: string): RegraParcela[] {
  const limpo = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8211;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
  return limpo
    .split("&times;")
    .slice(1)
    .map((b) => b.replace(/\s+/g, " ").trim())
    .filter((b) => b.length > 10)
    .map((b) => {
      const nome = b.split(/\s(?:Parcelamento|Sistema|Cart|Pagamento|Reserva|Cia\s)/i)[0].trim();
      // A primeira regra é a geral; as seguintes costumam ser casos (cartão da
      // companhia, NDC, programa de fidelidade) — por isso vale a primeira.
      const geral = /juros/i.test(b) ? /(?:at[ée]|em)\s*(\d{1,2})\s*x/i.exec(b) : null;
      return {
        companhia: nome,
        semJuros: geral && !/c\/juros/i.test(b.slice(geral.index, geral.index + 20)) ? Number(geral[1]) : null,
        resumo: b.slice(nome.length, nome.length + 110).trim(),
      };
    });
}

async function parteAberta() {
  console.log("\nPátria · o que um programa (sem login) consegue ver\n");

  const portal = await texto("https://portal.patria.tur.br/");
  const captcha = /recaptcha/i.test(portal.corpo);
  const travellink = /Travellink/i.test(portal.corpo);
  console.log(
    `1. Portal do agente: resposta ${portal.status}` +
      `${travellink ? " — sistema Travellink (Wooba)" : ""}` +
      `${captcha ? "; o login tem reCAPTCHA → robô não entra sozinho" : ""}`,
  );
  await espera(3000);

  const docs = await texto("https://wooba-sandbox.travellink.com.br/TravellinkWebapi/");
  const temAereo = /API AIR/i.test(docs.corpo);
  const temHotel = /API HOTEL/i.test(docs.corpo);
  console.log(
    `2. Documentação pública da API Travellink: resposta ${docs.status}` +
      `${temAereo && temHotel ? " — tem aéreo e hotel (também carro, ônibus, seguro)" : ""}`,
  );
  await espera(3000);

  const parc = await texto("https://patria.tur.br/parcelamento");
  const regras = lerParcelamento(parc.corpo);
  console.log(`3. Tabela pública de parcelamento (resposta ${parc.status}): ${regras.length} companhias\n`);
  for (const r of regras) {
    const n = r.semJuros ? `até ${String(r.semJuros).padStart(2)}x s/juros` : "ver regra      ";
    console.log(`   ${r.companhia.padEnd(20).slice(0, 20)} ${n}   ${r.resumo}`);
  }
}

// ------------------------------------------------------------ parte com credencial

/** "/Date(1765681200000-0300)/" → "2026-12-14 00:00" (hora de Brasília). */
function dataWooba(s: string | null | undefined): string {
  const m = /\/Date\((\d+)([+-]\d{4})?\)\//.exec(s ?? "");
  if (!m) return "";
  const d = new Date(Number(m[1]) - 3 * 3600_000);
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function paraWooba(iso: string): string {
  return `/Date(${Date.parse(`${iso}T12:00:00-03:00`)}-0300)/`;
}

/** Converte a chave pública no formato <RSAKeyValue> do .NET para o Node. */
function chaveDoXml(xml: string) {
  const pega = (tag: string) => new RegExp(`<${tag}>([^<]+)</${tag}>`).exec(xml)?.[1] ?? "";
  const url = (b64: string) => b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return createPublicKey({ key: { kty: "RSA", n: url(pega("Modulus")), e: url(pega("Exponent")) }, format: "jwk" });
}

/** O developer access code vai cifrado em RSA (PKCS1) e em base64, como manda a documentação. */
function codigoCifrado(codigo: string, chaveXml: string): string {
  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10).split("-").reverse().join("/");
  // A documentação dá o exemplo "CODIGO|dd/MM/aaaa"; confirmar o formato na homologação.
  const valor = codigo.includes("|") ? codigo : `${codigo}|${hoje}`;
  return publicEncrypt({ key: chaveDoXml(chaveXml), padding: constants.RSA_PKCS1_PADDING }, Buffer.from(valor, "utf8")).toString("base64");
}

type Preco = { Total: number; TotalTarifa: number; TotalTaxaEmbarque: number; TotalTaxaServico: number; ValorRAV: number; Moeda: string; TarifaPrivada: boolean };
type Voo = { Numero: string; Origem: { CodigoIata: string }; Destino: { CodigoIata: string }; DataSaida: string; DataChegada: string; Classe: string; Cabine: string; Familia: string; BagagemInclusa: boolean; BagagemQuantidade: number; CiaMandatoria: { CodigoIata: string } };
type Viagem = { Preco: Preco; Voos: Voo[]; NumeroParadas: number; TempoDeDuracao: string; Fornecedor: { Nome: string } };
type RespostaDisp = { Exception: unknown; ViagensTrecho1: Viagem[] | null; ViagensTrecho2: Viagem[] | null; Recomendacoes: unknown };

async function parteComCredencial() {
  const env = process.env;
  const faltam = ["WOOBA_DEVELOPER_TOKEN", "WOOBA_DEVELOPER_CODIGO", "WOOBA_CHAVE_PUBLICA_XML", "PATRIA_WOOBA_URL", "PATRIA_WOOBA_LOGIN", "PATRIA_WOOBA_SENHA"].filter((k) => !env[k]);
  if (faltam.length) {
    console.log(
      `\nBusca de voos pela API: ainda sem credencial (faltam no .env: ${faltam.join(", ")}).\n` +
        "Quando a Wooba homologar o \"SRR Ofertas\" e a Pátria gerar o acesso, rode de novo com\n" +
        "  node --env-file=.env scripts/provas/patria-wooba.ts --origem BSB --destino LIS --ida 2027-03-10 --volta 2027-03-20\n",
    );
    return;
  }
  const base = env.PATRIA_WOOBA_URL!.replace(/\/$/, "");
  const cabecalho = {
    "Content-Type": "application/json",
    "User-Agent": AGENTE,
    "Developer-Token": env.WOOBA_DEVELOPER_TOKEN!,
    "Developer-Access-Code": codigoCifrado(env.WOOBA_DEVELOPER_CODIGO!, env.WOOBA_CHAVE_PUBLICA_XML!),
  };
  const conta = { Login: env.PATRIA_WOOBA_LOGIN, Senha: env.PATRIA_WOOBA_SENHA };
  const origem = argumento("origem", "BSB");
  const destino = argumento("destino", "LIS");
  const ida = argumento("ida");
  const volta = argumento("volta");
  if (!ida) throw new Error("Falta --ida AAAA-MM-DD");

  const chamar = async <T>(servico: string, corpo: object): Promise<T> => {
    const inicio = Date.now();
    const r = await fetch(`${base}/${servico}`, { method: "POST", headers: cabecalho, body: JSON.stringify({ ...conta, ...corpo }), signal: AbortSignal.timeout(90_000) });
    if (!r.ok) throw new Error(`${servico}: resposta ${r.status} — ${(await r.text()).slice(0, 200)}`);
    const j = (await r.json()) as T;
    console.log(`   (${servico}: ${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
    return j;
  };

  console.log(`\nBusca de voos pela API da Pátria: ${origem} → ${destino}, ${ida}${volta ? ` a ${volta}` : " (só ida)"}\n`);
  const sistemas = await chamar<{ Sistemas: { Label: string; Sistema: number }[] }>("RecuperarSistemasPesquisa", { Origem: origem, Destino: destino });
  console.log(`   sistemas para a rota: ${sistemas.Sistemas?.map((s) => s.Label.trim()).join(", ") || "(nenhum)"}`);
  await espera(3000);

  const disp = await chamar<RespostaDisp>("Disponibilidade", {
    Origem: origem, Destino: destino,
    DataIda: paraWooba(ida), DataVolta: volta ? paraWooba(volta) : null,
    QuantidadeAdultos: Number(argumento("adultos", "1")), QuantidadeCriancas: 0, QuantidadeBebes: 0,
    Cabine: argumento("cabine", ""), // "" = todas; "C" = executiva (a confirmar na homologação)
    Flex: true, // ida e volta casados (não soma de trechos)
    BuscarVoosComBagagem: true, BuscarVoosSemBagagem: true,
    ApenasVoosDiretos: false, ApenasVoosComBagagem: false,
    CompanhiasPreferenciais: [], QuantidadeDeVoos: 0, Recomendacao: false, Sistema: 0,
  });
  if (disp.Exception) console.log("   aviso da API:", JSON.stringify(disp.Exception).slice(0, 300));

  const viagens = [...(disp.ViagensTrecho1 ?? [])].sort((a, b) => a.Preco.Total - b.Preco.Total).slice(0, 15);
  console.log(`\n   ${viagens.length} opções mais baratas (preço por adulto):\n`);
  for (const v of viagens) {
    const p = v.Preco;
    const voos = v.Voos.map((s) => `${s.CiaMandatoria?.CodigoIata}${s.Numero} ${s.Origem.CodigoIata}-${s.Destino.CodigoIata} ${dataWooba(s.DataSaida).slice(5)}`).join(" + ");
    const s0 = v.Voos[0];
    console.log(
      `   R$ ${p.Total.toFixed(2).padStart(9)} (tarifa ${p.TotalTarifa.toFixed(2)} + embarque ${p.TotalTaxaEmbarque.toFixed(2)} + DU ${p.TotalTaxaServico.toFixed(2)})` +
        ` | ${v.Fornecedor?.Nome} | ${s0?.Cabine || "?"}/${s0?.Classe} ${s0?.Familia ?? ""} | bagagem ${s0?.BagagemInclusa ? `sim (${s0.BagagemQuantidade})` : "não"}` +
        ` | ${v.NumeroParadas} parada(s), ${v.TempoDeDuracao} | ${voos}${p.TarifaPrivada ? " | tarifa privada" : ""}`,
    );
  }
}

await parteAberta();
await parteComCredencial();
