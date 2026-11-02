/**
 * Nome das companhias pelo código IATA. É referência, não configuração: o
 * código sozinho ("LA") não diz nada a quem lê a vitrine. Código desconhecido
 * aparece como veio.
 */
const NOMES: Record<string, string> = {
  G3: "GOL",
  LA: "LATAM",
  JJ: "LATAM",
  AD: "Azul",
  TP: "TAP",
  AT: "Royal Air Maroc",
  AV: "Avianca",
  AR: "Aerolíneas Argentinas",
  CM: "Copa",
  H2: "Sky",
  JA: "JetSMART",
  UX: "Air Europa",
  IB: "Iberia",
  AF: "Air France",
  KL: "KLM",
  LH: "Lufthansa",
  LX: "Swiss",
  BA: "British Airways",
  AZ: "ITA Airways",
  TK: "Turkish Airlines",
  EK: "Emirates",
  QR: "Qatar Airways",
  ET: "Ethiopian",
  SA: "South African",
  AA: "American Airlines",
  DL: "Delta",
  UA: "United",
  AC: "Air Canada",
  AM: "Aeroméxico",
  "2Z": "Voepass",
};

export function nomeDaCompanhia(codigo: string | null | undefined): string | null {
  if (!codigo) return null;
  return NOMES[codigo] ?? codigo;
}

/** O caminho inverso, para fonte que só dá o nome ("GOL", "Turkish Airlines").
 *  Nome desconhecido: `null` (a oferta fica com o nome e sem código). */
export function codigoDaCompanhia(nome: string | null | undefined): string | null {
  const alvo = semAcento(nome ?? "");
  if (!alvo) return null;
  for (const [codigo, n] of Object.entries(NOMES)) if (semAcento(n) === alvo) return codigo;
  return null;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
