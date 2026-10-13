import { connection } from "next/server";
import Vitrine from "./_componentes/Vitrine";

/** Passagens — a aba principal da vitrine (inclui os bloqueios aéreos de operadora). */
export default async function PassagensPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  return <Vitrine tipo="passagem" sp={await searchParams} />;
}
