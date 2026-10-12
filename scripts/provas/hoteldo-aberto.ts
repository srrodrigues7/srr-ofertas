/*
 * Prova — Hoteldo não tem caminho sem login.
 *
 * Mostra, com quatro consultas leves, o que a investigação achou (detalhes em
 * docs/fontes/hoteldo.md):
 *   1. o site recusa programas (403) e só abre num navegador depois de uma
 *      "verificação do dispositivo" — proteção anti-robô, que não contornamos;
 *   2. o robots.txt proíbe robôs justamente em pacotes, hotéis e passagens;
 *   3. a busca de verdade mora atrás do login de agência (e-agencias.com);
 *   4. existe a documentação pública da API B2B oficial (api-docs.despegar.com).
 *
 * Não envia senha nem formulário nenhum. Roda direto no Node 24:
 *
 *   node scripts/provas/hoteldo-aberto.ts
 */

const AGENTE = "SRRViagens-RadarOfertas/0.1 (prova de captura; agencia cliente Hoteldo)";
const PRAZO_MS = 20_000;

async function consultar(url: string) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": AGENTE }, redirect: "manual", signal: AbortSignal.timeout(PRAZO_MS) });
    return { status: r.status, local: r.headers.get("location") ?? "", corpo: await r.text() };
  } catch (e) {
    return { status: 0, local: "", corpo: e instanceof Error ? e.message : String(e) };
  }
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function principal() {
  console.log("\nHoteldo · o que um programa (sem navegador, sem login) consegue ver\n");

  const site = await consultar("https://www.hoteldo.com.br/");
  console.log(`1. Página inicial: resposta ${site.status}${site.status === 403 ? " (recusado — proteção anti-robô)" : ""}`);
  await espera(3000);

  const robots = await consultar("https://www.hoteldo.com.br/robots.txt");
  const proibidos = robots.corpo
    .split("\n")
    .filter((l) => /^Disallow:\s*\/(pacotes|hoteis|passagens-aereas|paquetes|hoteles|login)/i.test(l.trim()))
    .map((l) => l.replace(/^Disallow:\s*/i, "").trim());
  console.log(`2. robots.txt (resposta ${robots.status}): proíbe robôs em ${proibidos.join(", ") || "(não consegui ler)"}`);
  await espera(3000);

  const login = await consultar("https://es-hoteldo.e-agencias.com/login");
  console.log(`3. Login de agência (e-agencias.com, plataforma da Despegar/Decolar): resposta ${login.status}${login.local ? ` → ${login.local}` : ""}`);

  await espera(3000);
  const docs = await consultar("https://api-docs.despegar.com/llms.txt");
  const temHoteis = /API Reference: Hotels/i.test(docs.corpo);
  console.log(`4. Documentação pública da API B2B (api-docs.despegar.com): resposta ${docs.status}${temHoteis ? " — tem hotéis, voos, reserva e pós-venda" : ""}`);

  console.log(
    "\nConclusão: na Hoteldo não há página aberta de ofertas, e o portal (inclusive o\n" +
      "endereço da SRR) tem anti-robô e robots.txt proibindo a busca — não é caminho para robô.\n" +
      "O caminho é a API B2B oficial: pedido ao gerente comercial em docs/fontes/hoteldo.md.\n",
  );
}

principal();
