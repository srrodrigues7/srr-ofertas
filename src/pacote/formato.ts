/** Formatos de tela (pt-BR). Horas de voo são o relógio do aeroporto, guardadas como UTC. */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlInteiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const inteiro = new Intl.NumberFormat("pt-BR");
const diaMes = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" });
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
const mesAno = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });

/**
 * Um prazo de verdade (com fuso, como "emitir até"), no relógio de Brasília.
 * Meia-noite em ponto = a fonte só deu o dia: mostra só o dia.
 */
const prazoDia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit" });
const prazoHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
export function prazo(d: Date | null | undefined): string {
  if (!d) return "—";
  const dia = prazoDia.format(d).replace(".", "").replace(",", "");
  const h = prazoHora.format(d);
  return h === "00:00" ? dia : `${dia} ${h}`;
}

export const reais = (v: number | null | undefined) => (v == null ? "—" : brl.format(v));
export const reaisInteiro = (v: number | null | undefined) => (v == null ? "—" : brlInteiro.format(v));
export const milhas = (v: number | null | undefined) => (v == null ? "—" : `${inteiro.format(v)} mi`);
export const data = (d: Date | null | undefined) => (d ? `${semana.format(d).replace(".", "")} ${diaMes.format(d)}` : "—");
export const horaLocal = (d: Date | null | undefined) => (d ? hora.format(d) : "");
export function nomeDoMes(mes: string): string {
  const t = mesAno.format(new Date(`${mes}-01T00:00:00Z`));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function duracao(min: number | null | undefined): string {
  if (min == null) return "";
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
}

/** "há 5 min", "há 3 h", "há 2 dias". `agora` vem de fora: nada de Date.now() na renderização. */
export function haQuanto(d: Date, agora: number): string {
  const s = Math.max(0, Math.round((agora - d.getTime()) / 1000));
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86400)} dias`;
}

export const BAGAGEM: Record<string, string> = {
  despachada: "com mala",
  so_mao: "só de mão",
  item_pessoal: "só item pessoal",
  nao_informada: "",
};

export const CLASSE: Record<string, string> = {
  economica: "econômica",
  premium: "premium",
  executiva: "executiva",
  primeira: "primeira",
};
