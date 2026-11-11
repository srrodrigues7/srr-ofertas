/**
 * O "Abrir na Cativa" de cada linha de pacote: contas com resposta conhecida,
 * sem banco e sem internet. `npm run testar:link-cativa`.
 *
 * Os links são reais, da vitrine da Cativa em 11/11/2026 (chamado #29 do
 * VoePro): o antigo dá 404 "Orçamento não disponível" no sistema da Cativa, o
 * novo abre (e o `&option=2` abre o 2º hotel).
 */
import { linkDaLinha, linkDoHotel, orcamentoAntigo } from "../src/lib/coleta/pacotes";

const BASE = "https://premium.infotravel.com.br/orcamento-web/pt/link?token=";
// "CATI | 5729654 | 5D1CB0417A8B6591D3DE3B18F5E97589" em base64: o formato antigo.
const ANTIGO = `${BASE}Q0FUSSB8IDU3Mjk2NTQgfCA1RDFDQjA0MTdBOEI2NTkxRDNERTNCMThGNUU5NzU4OQ==`;
// "1|CATI|6320698|0" + assinatura: o formato novo (orçamento 6320698, Natal Luz).
const NOVO = `${BASE}MXxDQVRJfDYzMjA2OTh8MHdEJfk52bt8dc_UeN96B_g`;
const VITRINE_BSB = "https://viajandocomdesconto.com/#pacote=tauahoteleconventionjoao&saida=BSB";

const casos: Array<[string, unknown, unknown]> = [
  // qual é qual
  ["o token antigo é reconhecido", orcamentoAntigo(ANTIGO), true],
  ["o token antigo com option também", orcamentoAntigo(`${ANTIGO}&option=3`), true],
  ["o token antigo com o '=' escapado (%3D)", orcamentoAntigo(ANTIGO.replace(/=/g, "%3D").replace("token%3D", "token=")), true],
  ["o token novo não é antigo", orcamentoAntigo(NOVO), false],
  ["o token novo com option não é antigo", orcamentoAntigo(`${NOVO}&option=2`), false],
  ["link sem token não é antigo", orcamentoAntigo(`${BASE.replace("?token=", "?x=1")}`), false],
  ["token vazio não é antigo", orcamentoAntigo(`${BASE}`), false],
  ["token com % quebrado não derruba", orcamentoAntigo(`${BASE}%E0%A4%A`), false],

  // o orçamento no hotel da linha (o que já valia desde 04/11, agora só no novo)
  ["novo: ganha o option do hotel", linkDoHotel(NOVO, 2), `${NOVO}&option=2`],
  ["novo: option que já veio é trocado", linkDoHotel(`${NOVO}&option=3`, 1), `${NOVO}&option=1`],
  ["novo: o '#' fica depois do option", linkDoHotel(`${NOVO}#topo`, 2), `${NOVO}&option=2#topo`],
  ["antigo: não vira link (não abre mais)", linkDoHotel(ANTIGO, 1), ""],
  ["antigo com option: também não", linkDoHotel(`${ANTIGO}&option=3`, 2), ""],
  ["sem link: vazio", linkDoHotel(undefined, 1), ""],
  ["link que não é orçamento fica como veio", linkDoHotel("https://wa.me/5561999999999", 1), "https://wa.me/5561999999999"],

  // o que vai para a oferta
  ["linha com orçamento novo: o orçamento", linkDaLinha(NOVO, 3, "tauahoteleconventionjoao", "BSB"), `${NOVO}&option=3`],
  ["linha com orçamento antigo: a página do pacote na vitrine", linkDaLinha(ANTIGO, 2, "tauahoteleconventionjoao", "BSB"), VITRINE_BSB],
  ["linha sem link: a página do pacote na vitrine", linkDaLinha(undefined, 1, "tauahoteleconventionjoao", "BSB"), VITRINE_BSB],
  [
    "vitrine: o nome do pacote vai escapado",
    linkDaLinha("", 1, "rio & mar", "GRU"),
    "https://viajandocomdesconto.com/#pacote=rio%20%26%20mar&saida=GRU",
  ],
];

let falhas = 0;
for (const [nome, veio, esperado] of casos) {
  if (veio === esperado) continue;
  falhas++;
  console.error(`FALHOU: ${nome}\n  esperado: ${String(esperado)}\n  veio:     ${String(veio)}`);
}
console.log(`${casos.length - falhas} de ${casos.length} certos`);
if (falhas) process.exit(1);
