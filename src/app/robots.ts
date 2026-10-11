import type { MetadataRoute } from "next";

// Nenhum buscador lista o painel. Não é proteção — quem tem o endereço entra —,
// é só para ele não aparecer para quem não conhece. A proteção de verdade
// (senha ou o login do VoePro) é obrigatória antes de qualquer tela com custo,
// margem, fonte ou botão: ver docs/etapas/README.md.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
