/**
 * Datas de viagem são dias de calendário ("2027-03-10"), sem hora nem fuso.
 * Andam como texto ISO por todo o sistema e só viram `Date` (meia-noite UTC)
 * na hora de gravar numa coluna `date` do banco — assim um fuso nunca empurra
 * a viagem para o dia anterior.
 */

const fmtDiaBrasilia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Hoje, em Brasília. */
export function hoje(): string {
  return fmtDiaBrasilia.format(new Date());
}

export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Dias entre duas datas (b − a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** "2027-03-10" → "2027-03". */
export function mesDe(dia: string): string {
  return dia.slice(0, 7);
}

/** O primeiro dia do mês `n` meses depois do mês de `dia`. */
export function inicioDoMes(dia: string, n = 0): string {
  const d = new Date(`${dia.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

/** O último dia do mês `n` meses depois do mês de `dia`. */
export function fimDoMes(dia: string, n = 0): string {
  return somarDias(inicioDoMes(dia, n + 1), -1);
}

/** Texto ISO → `Date` para coluna `date`. */
export function paraBanco(dia: string): Date {
  return new Date(`${dia}T00:00:00Z`);
}

/** `Date` de coluna `date` → texto ISO. */
export function doBanco(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Hora local de aeroporto ("2027-01-12T19:25:00", sem fuso) → `Date` para
 *  coluna `timestamp` (sem fuso): o relógio da parede do aeroporto, guardado
 *  como se fosse UTC. Ler sempre com timeZone "UTC". */
export function horaLocalParaBanco(hora: string | null | undefined): Date | null {
  if (!hora) return null;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?/.exec(hora);
  return m ? new Date(`${m[1]}T${m[2]}${m[3] ?? ":00"}Z`) : null;
}

/** Espera `ms` milissegundos (o ritmo educado entre duas requisições). */
export function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
