import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

// As mesmas duas fontes do VoePro e do MilesPro (docs/marca.md do VoePro):
// Inter no texto, Space Grotesk nos títulos e números.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fonte-corpo",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--fonte-titulo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SRR Ofertas",
  description: "SRR Ofertas — o radar de passagens da SRR Viagens",
  // O painel ainda não tem senha (decisão do Saulo na etapa O0): ao menos não
  // aparece em buscador. Ver também src/app/robots.ts.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
