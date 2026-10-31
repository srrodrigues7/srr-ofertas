# Etapa L0 — O painel no ar para a equipe

**Esforço: médio.** É publicar o que já existe, não construir tela nova. O
`next build` passa no main (conferido pela sessão de controle em 30/10), e a
Vercel já estava preparada na O0 (`vercel.json`, `scripts/vercel-build.mjs`).
O que pesa: a proteção por senha tem de cobrir tudo, e o prazo é **hoje** —
o Saulo apresenta o painel à equipe ainda em 30/10/2026.

## O objetivo, em uma frase

**Um endereço na internet onde a equipe abre o painel com a senha da SRR**,
com as ofertas que o motor (no computador do Saulo) já está colhendo.

## Decisões já tomadas (sessão de controle, 30/10/2026)

- **Banco: o de testes (`milespro-staging`), por enquanto.** É onde estão as
  ofertas e todas as migrações (V1a, V1b, V6 e as da V2 em construção). O de
  produção (`milespro-production`) está vazio e a troca fica para a etapa L.
  Registre isso no `README.md` com destaque: a decisão da O0 ("produção para
  o publicado") fica adiada, não revogada.
- **Senha única da equipe** antes de qualquer tela — é a regra escrita na O0
  ("antes de qualquer tela com custo, margem, fonte ou botão, entra a
  proteção"). Uma tela `/entrar`, cookie assinado e `HttpOnly`, e a trava no
  lugar certo desta versão do Next (leia `node_modules/next/dist/docs/` —
  o nome e o arquivo da camada que intercepta pedidos mudaram). A senha vem
  de uma variável (`PAINEL_SENHA`); **sem ela, o painel não abre nada**
  (falha fechada), inclusive as server actions.
- **Sem GitHub hoje.** Publicar pela CLI da Vercel (`npx vercel`) a partir
  do checkout do main, ou pela integração da Vercel já ligada ao Claude. O
  login na Vercel é do Saulo: o agente pede, nunca digita.
- **Motor continua no computador do Saulo**, no mesmo banco. Os botões do
  painel ("Buscar agora", "Conferir agora", "Conferi") só escrevem no banco;
  o motor local atende. Nada do motor sobe para a Vercel; a ponte do
  WhatsApp (V6) também não.
- **Endereço:** o da Vercel (`….vercel.app`) resolve hoje. O domínio
  `ofertas.srrviagens.com.br` (decidido na O0, DNS na HostGator) só se o
  Saulo quiser mexer no DNS hoje; senão fica para a L.

## O que entregar

1. A proteção por senha, testada: sem cookie, **qualquer** rota (páginas e
   actions) manda para `/entrar`; com a senha certa, entra; senha errada não
   diz nada além de "não entrou". Sem `PAINEL_SENHA`, nada abre.
2. O projeto na Vercel (nome `srr-ofertas`), com as variáveis **postas pelo
   Saulo** (`DATABASE_URL` do banco de testes, `PAINEL_SENHA`) — pelo painel
   da Vercel ou por `vercel env add` no terminal dele. Veja antes quais
   outras variáveis o painel lê em tempo de execução (`grep process.env` em
   `src/app` e `src/lib`) e liste para ele; o que é só do motor não sobe.
3. O build da Vercel passando. Atenção: `scripts/vercel-build.mjs` roda
   `prisma migrate deploy` — rode-o antes **localmente** contra o banco de
   testes para ver se ele aceita um banco com migrações que a pasta ainda
   não tem (as da V2). Se reclamar, troque o build de hoje por
   `prisma generate && next build` e registre.
4. Node: `package.json` pede `>=24`. Confira o que a Vercel oferece; se não
   houver 24, baixe para o que houver e registre.
5. No `README.md` das etapas: a linha da L0 no quadro, o endereço, as
   variáveis que existem na Vercel (nomes, nunca valores), e o que a etapa L
   herda (troca para produção, domínio, GitHub, login por pessoa).

## Regras desta etapa

- **Segredo nunca no chat nem no commit.** Senha e `DATABASE_URL` só o Saulo
  digita, na Vercel ou no terminal dele. Se um comando precisar do valor,
  peça que ele rode.
- Não mexa no motor, nas fontes nem nas telas além da trava e da `/entrar`.
- O `.env` local do Saulo ganha `PAINEL_SENHA` também (documente no
  `.env.example`), senão o painel local para de abrir.

## Perguntas de negócio que esta etapa leva ao Saulo

Só o que muda o que vai ser construído, na caixa de seleção. Prováveis:
domínio hoje ou endereço da Vercel; se a tela de entrada mostra a marca da
SRR (há `docs/marca.md` no VoePro, só leitura) ou é só o campo da senha.

## Fora do escopo

Login por pessoa, GitHub, banco de produção, motor no computador dedicado,
avisos de saúde por mensagem — tudo isso é a etapa L.

## Como a revisão vai conferir

- Abrir o endereço numa janela anônima: só a tela de entrada. Com a senha:
  a vitrine com as ofertas de hoje.
- Chamar uma rota direto (ex.: `/valores`, `/saude`) sem cookie: volta para
  `/entrar`.
- "Conferir agora" numa oferta pela internet: o pedido entra na fila e o
  motor local atende.
- `git log -p` do ramo: nenhuma senha, nenhum `DATABASE_URL`.
