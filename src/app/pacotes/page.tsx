import { connection } from "next/server";
import Vitrine from "../_componentes/Vitrine";

/** Pacotes — aéreo + hotel. Pronta e vazia até a V1b plugar a Cativa e a Hoteldo. */
export default async function PacotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  return <Vitrine tipo="pacote" sp={await searchParams} />;
}
