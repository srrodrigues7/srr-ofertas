import Link from "next/link";
import { quemEntrou } from "@/lib/acesso/acesso";
import { sair } from "../entrar/acoes";
import s from "./Cabecalho.module.css";

const ABAS = [
  { href: "/", rotulo: "Passagens" },
  { href: "/pacotes", rotulo: "Pacotes" },
  { href: "/buscas", rotulo: "Pedidos de busca" },
  { href: "/valores", rotulo: "Valores" },
  { href: "/saude", rotulo: "Saúde" },
] as const;

/** O cabeçalho de todas as telas: logo, nome, o que é esta tela, as abas e quem entrou. */
export default async function Cabecalho({ atual, subtitulo }: { atual: (typeof ABAS)[number]["href"]; subtitulo: string }) {
  const quem = await quemEntrou();
  return (
    <header className={s.cabecalho}>
      <span className={s.placa}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-srr.png" alt="SRR Viagens" className={s.logo} />
      </span>
      <div className={s.titulo}>
        <h1 className={s.nome}>SRR Ofertas</h1>
        <p className={s.sub}>{subtitulo}</p>
      </div>
      <nav className={s.abas} aria-label="Telas">
        {ABAS.map((a) => (
          <Link key={a.href} href={a.href} className={a.href === atual ? `${s.aba} ${s.atual}` : s.aba}>
            {a.rotulo}
          </Link>
        ))}
      </nav>
      {quem ? (
        <form action={sair} className={s.quem}>
          <span title="Você entrou com esta conta">{quem.email}</span>
          <button type="submit" className={s.sair}>
            Sair
          </button>
        </form>
      ) : null}
      {/* O arco de assinatura da marca: o mesmo gesto do risco da logo. */}
      <svg className={s.arco} viewBox="0 0 320 90" aria-hidden="true">
        <path d="M4 86 C 90 10, 220 -6, 316 30" />
      </svg>
    </header>
  );
}
