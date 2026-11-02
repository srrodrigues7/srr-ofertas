import type { Metadata } from "next";
import { cookies } from "next/headers";
import { classesDasFontes } from "@/kit/fontes";
import { visualDoNavegador, visualQueVale } from "@/kit/visual";
// O kit da SRR primeiro (cores, letra, cantos, barras: o mesmo do VoePro);
// depois o que é só do Radar.
import "@/kit/kit.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SRR Ofertas",
  description: "SRR Ofertas — o radar de passagens da SRR Viagens",
  // O painel pede login (L0), e ainda assim fica fora dos buscadores.
  // Ver também src/app/robots.ts e src/proxy.ts.
  robots: { index: false, follow: false },
};

/**
 * A casca de todas as telas. A letra (Plus Jakarta Sans, servida daqui: o build
 * não depende do Google) e o visual vêm do kit da SRR (`src/kit/`, copiado do
 * VoePro — ver `src/kit/ORIGEM.md`).
 *
 * O tema (claro/escuro) e a cor de destaque são os que a pessoa escolheu neste
 * navegador, guardados nos cookies `srr_tema` e `srr_cor` pelo botão do
 * cabeçalho. Sem escolha: claro e o verde da casa, não o que o Windows pede.
 * Ler os cookies torna o layout dinâmico — no Radar, que já pede login em toda
 * tela, isso não muda nada.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pote = await cookies();
  const visual = visualQueVale(visualDoNavegador((nome) => pote.get(nome)?.value));
  return (
    <html lang="pt-BR" className={classesDasFontes} data-theme={visual.tema} data-accent={visual.cor}>
      <body>{children}</body>
    </html>
  );
}
