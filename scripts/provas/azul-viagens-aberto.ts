/*
 * Prova — Azul Viagens: a busca é aberta para gente, mas protegida contra robô.
 *
 * Mostra, com três consultas leves, o que a investigação achou (detalhes em
 * docs/fontes/azul-viagens.md):
 *   1. o robots.txt libera tudo (não é ele que barra);
 *   2. toda página carrega o "sensor" do Akamai Bot Manager (o anti-robô da
 *      Akamai) — e na investigação a busca de pacotes, feita por programa,
 *      passou uma vez e depois ficou presa sem resposta, enquanto o robots.txt
 *      seguia respondendo na hora. É proteção anti-robô: não contornamos;
 *   3. o site roda no motor de reservas Juniper, que tem API oficial de
 *      pacotes (busca e conferência de preço) com documentação pública — esse
 *      é o caminho, liberado pela própria Azul Viagens.
 *
 * Esta prova NÃO faz busca de pacote (não insistimos num caminho protegido).
 * Não envia senha nem formulário. Roda direto no Node 24:
 *
 *   node scripts/provas/azul-viagens-aberto.ts
 */

const AGENTE = "SRRViagens-RadarOfertas/0.1 (prova de captura; agencia parceira Azul Viagens)";
const PRAZO_MS = 20_000;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function consultar(url: string) {
  const inicio = Date.now();
  try {
    const r = await fetch(url, { headers: { "User-Agent": AGENTE, "Accept-Language": "pt-BR" }, signal: AbortSignal.timeout(PRAZO_MS) });
    return { status: r.status, corpo: await r.text(), ms: Date.now() - inicio, cookies: r.headers.getSetCookie().map((c) => c.split("=")[0]) };
  } catch (e) {
    return { status: 0, corpo: e instanceof Error ? e.name : String(e), ms: Date.now() - inicio, cookies: [] as string[] };
  }
}

async function principal() {
  console.log("\nAzul Viagens · o que um programa (sem navegador, sem login) encontra\n");

  const robots = await consultar("https://www.azulviagens.com.br/robots.txt");
  const liberado = /User-agent:\s*\*\s*[\r\n]+Allow:\s*\//i.test(robots.corpo);
  console.log(`1. robots.txt: resposta ${robots.status}${liberado ? " — libera robôs (só esconde modelos de página)" : ""}`);
  await espera(4000);

  const home = await consultar("https://www.azulviagens.com.br/");
  const sensor = /\/akam\/\d+\//.test(home.corpo);
  const cookiesBm = home.cookies.filter((c) => /^(bm_|_abck|ak_bmsc)/.test(c));
  const juniper = /ejuniper\.com/i.test(home.corpo);
  console.log(
    `2. Página inicial: resposta ${home.status} em ${home.ms} ms` +
      `${sensor ? "\n   — carrega o sensor do Akamai Bot Manager (/akam/…)" : ""}` +
      `${cookiesBm.length ? `\n   — e já entrega os cookies de vigilância dele (${cookiesBm.join(", ")})` : ""}` +
      `${juniper ? "\n   — \"Powered by Juniper\": o motor de reservas é o Juniper" : ""}`,
  );
  await espera(4000);

  const docs = await consultar("https://api-edocs.ejuniper.com/api/jp/package-api");
  console.log(`3. Documentação pública da API de pacotes do Juniper: resposta ${docs.status} (PackageAvail = busca; PackageCheckAvail = confere preço e vaga)`);

  console.log(
    "\nO que a investigação viu (no navegador, como uma pessoa, e uma vez por programa):\n" +
      "  · a busca de pacote devolve um JSON completo (voo com número e horários, hotel com\n" +
      "    estrelas e regime, preço por pessoa e do pacote) — os dados existem;\n" +
      "  · por programa, a 1ª busca passou e as seguintes ficaram presas sem resposta (60 s),\n" +
      "    com o robots.txt respondendo em <1 s — é o anti-robô da Akamai agindo na busca.\n" +
      "\nConclusão: a busca da Azul Viagens não é caminho para robô. O caminho é a API do\n" +
      "Juniper, que a Azul Viagens libera para a agência — pedido pronto em docs/fontes/azul-viagens.md.\n",
  );
}

principal();

export {};
