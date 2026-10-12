/**
 * Prova de captura — Smiles, busca completa (detalhe do voo).
 *
 * A busca completa (`api-air-flightsearch`) é protegida pelo Akamai: requisição
 * simples recebe 406, navegador sem janela também. Aqui o Edge do Windows abre
 * com janela, entra na página inicial da Smiles como uma pessoa, e as buscas
 * são feitas pelo endpoint DE DENTRO dessa página — o mesmo pedido que o site
 * faz, com os cookies que o próprio site deu. Nada é disfarçado.
 *
 * Não grava no banco. Uso:
 *   npx tsx scripts/provas/smiles-detalhe.ts BSB REC 2027-01-12
 *   npx tsx scripts/provas/smiles-detalhe.ts GRU LIS 2027-03-10 --executiva
 */
import { chromium } from "playwright-core";

const [origem = "BSB", destino = "REC", data = "2027-01-12"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const executiva = process.argv.includes("--executiva");

const CONFIG_PUBLICA = "https://ldrelay-green.smiles.com.br/sdk/evalx/5ff64893991a4c0aa4974fc7/users/eyJrZXkiOiJHUkVFTiJ9";
const BUSCA = "https://api-air-flightsearch-green.smiles.com.br/v1/airlines/search";

const t0 = Date.now();
const navegador = await chromium.launch({ channel: "msedge", headless: false, args: ["--start-minimized"] });
try {
  const pagina = await navegador.newPage();
  await pagina.goto("https://www.smiles.com.br/home", { timeout: 60_000, waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(6_000);
  console.log(`Página aberta em ${Date.now() - t0} ms`);

  for (const congenere of [false, true]) {
    const t = Date.now();
    // O código que roda DENTRO da página vai como texto: o tsx acrescenta
    // auxiliares às funções compiladas que não existem lá dentro.
    const args = { CONFIG_PUBLICA, BUSCA, origem, destino, data, executiva, congenere };
    const r = (await pagina.evaluate(`(async (a) => {
      const cfg = await fetch(a.CONFIG_PUBLICA).then((x) => x.json());
      function achar(o) {
        if (o && typeof o === "object") {
          if (typeof o.flightSearchApiKey === "string") return o.flightSearchApiKey;
          for (const v of Object.values(o)) { const k = achar(v); if (k) return k; }
        }
      }
      const q = new URLSearchParams({
        cabin: a.executiva ? "BUSINESS" : "ALL", originAirportCode: a.origem,
        destinationAirportCode: a.destino, departureDate: a.data, memberNumber: "",
        adults: "1", children: "0", infants: "0", forceCongener: String(a.congenere),
      });
      const res = await fetch(a.BUSCA + "?" + q, {
        headers: { Accept: "application/json, text/plain, */*", "x-api-key": achar(cfg) || "", Channel: "WEB" },
      });
      return { status: res.status, corpo: await res.text() };
    })(${JSON.stringify(args)})`)) as { status: number; corpo: string };
    console.log(`\n${congenere ? "Parceiras" : "GOL"}: HTTP ${r.status} em ${Date.now() - t} ms`);
    if (r.status !== 200) {
      console.log(r.corpo.slice(0, 200));
      continue;
    }
    type Tarifa = { type: string; uid: string; miles: number; money: number; g3?: { costTax?: string } };
    type Voo = {
      cabin: string; stops: number; availableSeats: number;
      departure: { date: string }; arrival: { date: string };
      airline: { code: string }; baggage: { free: string; quantity: string };
      duration: { hours: number; minutes: number };
      legList: { flightNumber: string; marketingAirline: { code: string } }[];
      fareList: Tarifa[];
    };
    const d = JSON.parse(r.corpo) as { requestedFlightSegmentList: { flightList: Voo[] }[] };
    const voos = d.requestedFlightSegmentList[0]?.flightList ?? [];
    if (process.argv.includes("--cru") && voos[0]) {
      console.log(JSON.stringify({ ...voos[0], legList: "(omitido)" }, null, 1).slice(0, 4000));
    }
    const linhas = voos
      .map((v) => {
        const clube = v.fareList.find((f) => f.type === "SMILES_CLUB");
        const normal = v.fareList.find((f) => f.type === "SMILES");
        const dinheiro = v.fareList.find((f) => f.type === "MONEY");
        return {
          sai: v.departure.date.slice(11, 16),
          chega: v.arrival.date.slice(5, 16),
          cia: v.airline.code,
          voos: v.legList.map((l) => `${l.marketingAirline.code}${l.flightNumber}`).join("+"),
          paradas: v.stops,
          dur: `${v.duration.hours}h${v.duration.minutes}`,
          classe: v.cabin,
          bagagem: v.baggage.free === "true" ? `${v.baggage.quantity} desp.` : "só mão",
          assentos: v.availableSeats,
          clube: clube?.miles,
          normal: normal?.miles,
          taxa: clube?.g3?.costTax ?? "—",
          reais: dinheiro?.money,
        };
      })
      .sort((a, b) => (a.clube ?? 9e9) - (b.clube ?? 9e9));
    console.log(`${voos.length} voos; os 5 mais baratos (Clube):`);
    console.table(linhas.slice(0, 5));

    // A taxa de embarque completa (nas parceiras ela não vem na busca).
    const maisBarato = [...voos].sort(
      (a, b) =>
        (a.fareList.find((f) => f.type === "SMILES_CLUB")?.miles ?? 9e9) -
        (b.fareList.find((f) => f.type === "SMILES_CLUB")?.miles ?? 9e9),
    )[0] as (Voo & { uid: string; fareList: (Tarifa & { uid: string })[] }) | undefined;
    const tarifa = maisBarato?.fareList.find((f) => f.type === "SMILES_CLUB");
    if (maisBarato && tarifa) {
      const q = new URLSearchParams({
        type: "SEGMENT_1", uid: maisBarato.uid, fareuid: tarifa.uid, adults: "1", children: "0", infants: "0",
      });
      const t2 = Date.now();
      const taxa = (await pagina.evaluate(`(async (u) => {
        const res = await fetch(u, { credentials: "include", headers: { Accept: "application/json, text/plain, */*", Channel: "WEB" } });
        return { status: res.status, corpo: await res.text() };
      })(${JSON.stringify(`https://api-airlines-boarding-tax-green.smiles.com.br/v1/airlines/flight/boardingtax?${q}`)})`)) as {
        status: number;
        corpo: string;
      };
      console.log(`Taxa do mais barato: HTTP ${taxa.status} em ${Date.now() - t2} ms`);
      try {
        const t = JSON.parse(taxa.corpo) as { totals?: unknown };
        console.log("Totais (por pessoa):", JSON.stringify(t.totals));
      } catch {
        console.log(taxa.corpo.slice(0, 300));
      }
    }
  }
} finally {
  await navegador.close();
  console.log(`\nTotal: ${Date.now() - t0} ms (navegador fechado).`);
}
