/*
 * Prova — Expedia TAAP: nada sem login, login com CAPTCHA e robots.txt
 * proibindo as buscas. O caminho é a integração oficial (Expedia Partner
 * Solutions / Rapid API). Detalhes em docs/fontes/expedia-taap.md.
 *
 * Quatro consultas leves:
 *   1. o robots.txt da Expedia proíbe robôs justamente nas buscas de hotel,
 *      voo e pacote (o TAAP é a mesma plataforma; o robots.txt do próprio
 *      TAAP responde 403);
 *   2. a busca de hotel do TAAP manda para a tela de login;
 *   3. a tela de login carrega o desafio anti-robô da Arkose (CAPTCHA);
 *   4. a documentação da integração oficial (Rapid API) está no ar.
 *
 * Não envia senha nem formulário. Roda direto no Node 24:
 *
 *   node scripts/provas/expedia-taap-aberto.ts
 */

const AGENTE = "SRRViagens-RadarOfertas/0.1 (prova de captura; agencia afiliada Expedia TAAP)";
const PRAZO_MS = 20_000;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function consultar(url: string, seguir = true) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": AGENTE, "Accept-Language": "pt-BR" }, redirect: seguir ? "follow" : "manual", signal: AbortSignal.timeout(PRAZO_MS) });
    return { status: r.status, final: r.url, local: r.headers.get("location") ?? "", corpo: await r.text() };
  } catch (e) {
    return { status: 0, final: url, local: "", corpo: e instanceof Error ? e.name : String(e) };
  }
}

async function principal() {
  console.log("\nExpedia TAAP · o que um programa (sem navegador, sem login) encontra\n");

  const robots = await consultar("https://www.expedia.com.br/robots.txt");
  const proibidos = robots.corpo
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^disallow:\s*\/(hotel-search|flights-search|multiitemcheckout|carsearch|things-to-do\/search)/i.test(l))
    .map((l) => l.replace(/^disallow:\s*/i, ""));
  console.log(`1. robots.txt da Expedia (resposta ${robots.status}): proíbe robôs em ${proibidos.join(", ") || "(não consegui ler)"}`);
  const taapRobots = await consultar("https://www.expediataap.com.br/robots.txt");
  console.log(`   robots.txt do TAAP: resposta ${taapRobots.status}${taapRobots.status === 403 ? " (acesso negado — vale o da Expedia, mesma plataforma)" : ""}`);
  await espera(4000);

  const busca = await consultar("https://www.expediataap.com.br/Hotel-Search?destination=Punta%20Cana&startDate=2026-12-01&endDate=2026-12-06&adults=2", false);
  console.log(`2. Busca de hotel no TAAP: resposta ${busca.status}${busca.local ? ` → ${busca.local}` : ""}${/signin|logout/i.test(busca.local) ? " (manda para a tela de login: exige login)" : ""}`);
  await espera(4000);

  const login = await consultar("https://www.expediataap.com.br/taap/signin");
  const desafio = [...new Set((login.corpo.match(/arkose|funcaptcha|recaptcha|hcaptcha|captcha/gi) ?? []).map((s) => s.toLowerCase()))];
  console.log(`3. Tela de login: resposta ${login.status}${desafio.length ? ` — traz desafio anti-robô (${desafio.join(", ")})` : ""}`);
  await espera(4000);

  const docs = await consultar("https://developers.expediagroup.com/docs/products/rapid");
  console.log(`4. Documentação da integração oficial (Rapid API, Expedia Partner Solutions): resposta ${docs.status}`);

  console.log(
    "\nConclusão: no TAAP não há página aberta de ofertas; a busca exige login, o login tem\n" +
      "CAPTCHA e o robots.txt proíbe as buscas — não é caminho para robô. O caminho é a\n" +
      "integração oficial da Expedia: pedido pronto em docs/fontes/expedia-taap.md.\n",
  );
}

principal();

export {};
