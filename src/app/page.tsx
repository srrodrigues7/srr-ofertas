import { connection } from "next/server";
import { exigirAcessoNaTela } from "@/lib/acesso/acesso";
import Vitrine from "./_componentes/Vitrine";

/** Passagens — a aba principal da vitrine (inclui os bloqueios aéreos de operadora). */
export default async function PassagensPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  await exigirAcessoNaTela();
  return <Vitrine tipo="passagem" sp={await searchParams} />;
}
