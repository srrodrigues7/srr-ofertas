import { redirect } from "next/navigation";
import { connection } from "next/server";
import { emailDaSessao, quemEntrou, destinoSeguro } from "@/lib/acesso/acesso";
import { chavesDoPorteiro, VARIAVEIS_DO_PORTEIRO } from "@/lib/acesso/supabase";
import { entrar, sair } from "./acoes";
import Turnstile from "./Turnstile";
import s from "./page.module.css";

/**
 * A tela de entrada. É a única que abre sem sessão.
 *
 * Três situações:
 * - sem porteiro configurado: diz o que falta e não mostra o formulário;
 * - com sessão de uma conta liberada: vai direto para o painel;
 * - com sessão de uma conta NÃO liberada: explica e oferece sair.
 */

const MENSAGENS: Record<string, string> = {
  campos: "Preencha o e-mail e a senha.",
  senha: "E-mail ou senha não conferem.",
  captcha: "A verificação de segurança não passou. Espere o quadrinho confirmar e tente de novo.",
  liberacao: "A conta existe, mas ainda não foi liberada no Radar. Peça ao Saulo para liberar o seu e-mail em Valores.",
};

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const sp = await searchParams;
  const erro = typeof sp.erro === "string" ? MENSAGENS[sp.erro] : undefined;
  const de = destinoSeguro(typeof sp.de === "string" ? sp.de : null);

  const semPorteiro = !chavesDoPorteiro();
  if (!semPorteiro && (await quemEntrou())) redirect(de);
  const presoDoLadoDeFora = semPorteiro ? null : await emailDaSessao();

  return (
    <main className={s.palco}>
      <section className={s.cartao}>
        <svg className={s.arco} viewBox="0 0 320 90" aria-hidden="true">
          <path d="M4 86 C 90 10, 220 -6, 316 30" />
        </svg>
        <span className={s.placa}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-srr.png" alt="SRR Viagens" className={s.logo} />
        </span>
        <h1 className={s.nome}>SRR Ofertas</h1>
        <p className={s.sub}>O radar de passagens da SRR Viagens</p>

        {semPorteiro ? (
          <p className={s.erro}>
            O painel está sem o porteiro configurado: faltam {VARIAVEIS_DO_PORTEIRO.join(" e ")}. Até alguém
            colocá-las, nada abre.
          </p>
        ) : presoDoLadoDeFora ? (
          <form action={sair} className={s.formulario}>
            <p className={s.erro}>
              Você entrou como <b>{presoDoLadoDeFora}</b>, mas essa conta não está liberada no Radar. Peça ao Saulo
              para liberar o seu e-mail em Valores.
            </p>
            <button className={s.botaoSecundario} type="submit">
              Sair e tentar com outra conta
            </button>
          </form>
        ) : (
          <form action={entrar} className={s.formulario}>
            <input type="hidden" name="de" value={de} />
            <p className={s.explica}>Entre com o mesmo e-mail e a mesma senha do MilesPro.</p>
            <label className={s.campo}>
              <span>E-mail</span>
              <input name="email" type="email" autoComplete="username" required autoFocus />
            </label>
            <label className={s.campo}>
              <span>Senha</span>
              <input name="senha" type="password" autoComplete="current-password" required />
            </label>
            <Turnstile />
            {erro ? <p className={s.erro}>{erro}</p> : null}
            <button className={s.botao} type="submit">
              Entrar
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
