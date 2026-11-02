import localFont from "next/font/local";

/**
 * A letra do kit da SRR (etapa D): a Plus Jakarta Sans, servida pelo próprio
 * sistema. Os arquivos moram em `src/kit/fontes/`, com a licença OFL ao lado
 * (`OFL.txt`, que precisa ir junto sempre): o build não depende do Google na
 * hora de compilar (pedido da sessão de controle, 02/11/2026, depois de um build
 * da Vercel cair só por causa do `next/font/google`).
 *
 * Um arquivo cobre todos os pesos (fonte variável). O segundo tem as letras de
 * outras línguas e só baixa quando aparece um nome que precisa dele.
 *
 * Uso, no layout raiz: `<html className={classesDasFontes}>`. O `kit.css` lê as
 * variáveis `--fonte-corpo` e `--fonte-extra`.
 */
const jakarta = localFont({
  src: "./fontes/plus-jakarta-sans-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--fonte-corpo",
  display: "swap",
});

const jakartaExtra = localFont({
  src: "./fontes/plus-jakarta-sans-latin-ext-wght-normal.woff2",
  weight: "200 800",
  variable: "--fonte-extra",
  display: "swap",
  preload: false,
});

export const classesDasFontes = `${jakarta.variable} ${jakartaExtra.variable}`;
