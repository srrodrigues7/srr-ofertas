/**
 * O visual de cada pessoa (etapa D): o tema e a cor de destaque.
 *
 * Faz parte do kit da SRR (`src/kit/`), o mesmo no VoePro e no Radar de
 * ofertas (pedido do Saulo, 02/11/2026: "tudo padronizado"). Tudo aqui é puro
 * (sem banco e sem React): o servidor, o seletor de tema e a suíte
 * `npm run testar:visual` usam as mesmas regras.
 *
 * No VoePro, a escolha mora na pessoa, em `crm.usuario.ajustes`, numa chave
 * própria — `{ "visual": { "tema": "escuro", "cor": "azul" } }` — ao lado dos
 * interruptores, que continuam soltos na raiz como sempre. Assim vale em
 * qualquer computador. As telas sem pessoa (a porta) usam o último tema e a
 * última cor daquele navegador, num cookie.
 */

export const TEMAS = ["claro", "escuro"] as const;
export type Tema = (typeof TEMAS)[number];

/** As seis cores do kit. `claro` e `escuro` são a cor no tema de cada nome;
 *  a primeira é a do VoePro. A conta de contraste está em `docs/marca.md`. */
export const CORES = [
  { chave: "srr", nome: "Verde SRR", claro: "#007F4F", escuro: "#00B46C" },
  { chave: "azul", nome: "Azul", claro: "#2457B0", escuro: "#6CA8FF" },
  { chave: "roxo", nome: "Roxo", claro: "#6D28D9", escuro: "#B79BFF" },
  { chave: "rosa", nome: "Rosa", claro: "#BE185D", escuro: "#F58AB8" },
  { chave: "laranja", nome: "Laranja", claro: "#B45309", escuro: "#F5A35B" },
  { chave: "petroleo", nome: "Azul-petróleo", claro: "#0F766E", escuro: "#4FD1C5" },
] as const;
export type Cor = (typeof CORES)[number]["chave"];

export type Visual = { tema: Tema; cor: Cor };

/** Quem entra pela primeira vez: tema claro (decisão 2 do Saulo, 31/10) e o
 *  verde da casa. */
export const VISUAL_PADRAO: Visual = { tema: "claro", cor: "srr" };

/** Os cookies do navegador: o tema e a cor para as telas sem pessoa, e o menu
 *  recolhido, que é do computador e não da pessoa. Os nomes são da SRR, não de
 *  um sistema: os mesmos no VoePro e no Radar. */
export const COOKIE_TEMA = "srr_tema";
export const COOKIE_COR = "srr_cor";
export const COOKIE_MENU = "srr_menu";

/** O tema e a cor deste navegador, lidos dos cookies. `ler` é quem sabe ler
 *  cookie onde a chamada está: no layout do servidor,
 *  `(nome) => (await cookies()).get(nome)?.value`. */
export function visualDoNavegador(ler: (nome: string) => string | undefined): Partial<Visual> {
  return limparVisual({ tema: ler(COOKIE_TEMA), cor: ler(COOKIE_COR) });
}

/** Pinta a página agora, no navegador, sem esperar o servidor: o tema e a cor
 *  ficam em `data-theme` e `data-accent` no `<html>`, que o `kit.css` lê. */
export function pintarAgora(visual: Visual): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = visual.tema;
  document.documentElement.dataset.accent = visual.cor;
}

export const ehTema = (x: unknown): x is Tema => typeof x === "string" && (TEMAS as readonly string[]).includes(x);
export const ehCor = (x: unknown): x is Cor => typeof x === "string" && CORES.some((c) => c.chave === x);

function objeto(x: unknown): Record<string, unknown> | null {
  return x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
}

/** O que dá para aproveitar de uma escolha vinda de fora (o banco, a tela,
 *  um cookie): só tema e cor das listas conhecidas. O resto some em silêncio. */
export function limparVisual(bruto: unknown): Partial<Visual> {
  const v = objeto(bruto);
  const limpo: Partial<Visual> = {};
  if (v && ehTema(v.tema)) limpo.tema = v.tema;
  if (v && ehCor(v.cor)) limpo.cor = v.cor;
  return limpo;
}

/** A escolha guardada na pessoa, lida do JSON inteiro de `usuario.ajustes`. */
export function lerVisual(ajustes: unknown): Partial<Visual> {
  return limparVisual(objeto(ajustes)?.visual);
}

/** O visual que vale: o padrão, por cima o do navegador, por cima o da pessoa. */
export function visualQueVale(...camadas: Partial<Visual>[]): Visual {
  return Object.assign({}, VISUAL_PADRAO, ...camadas);
}

/** O JSON de `usuario.ajustes` depois de a pessoa mudar o visual: tudo o que
 *  já estava lá fica (os interruptores e o resto do `visual`), só muda o que
 *  ela mudou. */
export function gravarVisual(ajustes: unknown, mudanca: Partial<Visual>): Record<string, unknown> {
  const antes = objeto(ajustes) ?? {};
  const visualAntes = objeto(antes.visual) ?? {};
  return { ...antes, visual: { ...visualAntes, ...limparVisual(mudanca) } };
}

/**
 * Para quem reescreve os ajustes de outra pessoa (a tela de Equipe, ao trocar
 * o papel ou os interruptores): devolve os ajustes novos com o `visual` que já
 * estava lá. Sem isso, mexer nos interruptores de alguém apagaria o tema dela.
 */
export function comVisual<T extends object>(novos: T, ajustesAntes: unknown): T | (T & { visual: Record<string, unknown> }) {
  const visual = objeto(objeto(ajustesAntes)?.visual);
  return visual ? { ...novos, visual } : novos;
}
