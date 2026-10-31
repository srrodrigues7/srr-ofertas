import { connection } from "next/server";
import { exigirAcessoNaTela } from "@/lib/acesso/acesso";
import Vitrine from "../_componentes/Vitrine";

/** Pacotes — aéreo + hotel prontos das operadoras (hoje, a Cativa). */
export default async function PacotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  await exigirAcessoNaTela();
  return <Vitrine tipo="pacote" sp={await searchParams} />;
}
