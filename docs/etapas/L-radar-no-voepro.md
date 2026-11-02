# Etapa L — O Radar dentro do VoePro (`voepro.srrviagens.com.br/ofertas`)

**Esforço: alto.** Não há tela nova nem dado novo. O peso está em três
lugares: o **login** (quem entra no VoePro tem de entrar no Radar, e só
essas pessoas), as **rotas de dois sistemas em produção**, e a ordem dos
deploys (um passo fora de ordem tranca a equipe fora do Radar ou deixa uma
porta aberta). Não é **xalto** porque nada aqui apaga dado nem mexe em
dinheiro, e a volta leva minutos (tirar uma linha do VoePro). Se o Saulo
escolher a opção B da pergunta 1 (o acesso vem do VoePro), entra uma
permissão de banco entre os dois schemas: continua alto, mas passa pelo
Guardião da fusão antes de qualquer coisa.

> O quadro antigo chamava de "L — ligar tudo" um pacote maior (Radar no
> VoePro, GitHub, motor no computador dedicado, alertas de saúde). O GitHub
> já foi feito na L0. Esta especificação cobre **só a fase 1b do
> [`FUSAO.md`](../../../FUSAO/FUSAO.md)**: o Radar como item do VoePro. O
> resto vira **L2** (pergunta 4).

## O objetivo, em uma frase

**A pessoa está no VoePro, clica em "Radar de ofertas" no menu e o Radar
abre em `voepro.srrviagens.com.br/ofertas`, sem pedir login de novo.**

Palavras do Saulo (31/10): "eu não enxergo o radar como um terceiro sistema,
é uma ferramenta dentro do VoePro; a pessoa dá um clique no menu do Radar e
ele aparece".

## O que já existe (02/11/2026)

- **Radar no ar** em `https://ofertas.srrviagens.com.br` (L0): Vercel
  `srr-ofertas`, funções em São Paulo, banco de produção (schema `ofertas`,
  papel `srr_ofertas`), login pelo Auth de produção (a mesma conta do
  MilesPro) + captcha + a lista `ofertas.acesso`. O motor roda no notebook
  do Saulo, apontado para a produção.
- **VoePro no ar** em `https://voepro.srrviagens.com.br`, com o item "Radar
  de ofertas" no menu apontando para fora, em aba nova
  (`srr-crm/src/app/components/Sidebar.tsx`).
- **Login único é possível** (conferido pelo Guardião na noite de 01/11): o VoePro
  guarda a sessão no cookie padrão do `@supabase/ssr`
  (`sb-unhzbeevczoxgwyfxxnv-auth-token`, sem domínio próprio, path `/`). Sob
  o endereço do VoePro, o Radar recebe esse mesmo cookie.
- **Visual:** o kit da SRR (etapa D) já está aplicado no Radar no ramo
  `l-visual/kit-srr`, esperando o "sim" do Saulo. Os cookies de tema e cor
  (`srr_tema`, `srr_cor`) têm o mesmo nome nos dois sistemas: sob
  `/ofertas`, o tema escolhido no VoePro passa a valer no Radar sozinho —
  **depois** que a etapa D do VoePro estiver no ar (o VoePro publicado ainda
  não tem o kit). Se um dia o kit dos dois divergir, um valor de cookie que
  o Radar não conhece cai no padrão (claro e verde): `limparVisual` já faz isso.

## Como funciona (o desenho)

O jeito que o próprio Next recomenda para dois sistemas no mesmo endereço
("multi-zones", `node_modules/next/dist/docs/01-app/02-guides/multi-zones.md`):

```
navegador ──► voepro.srrviagens.com.br/ofertas/valores
                 │  o VoePro não tem essa tela: repassa (rewrite),
                 │  levando os cookies do VoePro
                 ▼
              ofertas.srrviagens.com.br/ofertas/valores   ← o Radar, deploy próprio
                 │  lê a sessão do cookie, confere quem é, desenha a tela
                 ▼
              a resposta volta pelo VoePro para o navegador
```

- O Radar passa a morar em `/ofertas` também no domínio dele (`basePath`).
  Tudo dele — telas, arquivos, ações — fica debaixo de `/ofertas`, então não
  colide com nada do VoePro.
- O VoePro ganha **uma regra de repasse** (`/ofertas` e `/ofertas/:path*` →
  `https://ofertas.srrviagens.com.br/ofertas/...`) e o item do menu vira um
  link normal na mesma aba.
- **Código continua em dois repositórios, deploys separados, bancos
  separados por schema.** Nada do VoePro vai para o Radar e vice-versa.

## O que muda

**No Radar (esta sessão):**

1. `next.config.ts`: `basePath: "/ofertas"`; `experimental.serverActions.allowedOrigins`
   com `voepro.srrviagens.com.br` (os botões do Radar chegam com a origem do
   VoePro; sem isso, o Next recusa); um redirecionamento de `/` para
   `/ofertas` com `basePath: false`, para quem abrir
   `ofertas.srrviagens.com.br` não ver erro.
2. `src/proxy.ts`: o redirecionamento para a entrada passa a ser montado com
   `pedido.nextUrl.clone()` (o `new URL("/entrar", …)` de hoje perde o
   `/ofertas`); conferir se o `matcher` conta com o prefixo (a documentação
   não diz: **prova obrigatória**, ver abaixo).
   **Só o VoePro renova a sessão** (desenho padrão, não contingência): sob
   `/ofertas` o porteiro do VoePro já renovou o token antes de repassar; se o
   Radar renovar de novo no mesmo pedido, a resposta volta com dois
   `Set-Cookie` para o mesmo nome e o Auth pode tratar como reuso do token de
   renovação e derrubar a sessão nos três sistemas (risco L-2). O porteiro do
   Radar passa a **só ler** a sessão quando o pedido chega pelo VoePro, e
   repassa os cabeçalhos de "não guardar em cache" como o VoePro faz (o
   `clienteNoProxy` de hoje ignora esse segundo argumento).
2b. `src/app/entrar/acoes.ts`: `signOut({ scope: "local" })` nas duas
   chamadas. Hoje o `signOut()` sem escopo usa o padrão da biblioteca,
   **global**: sair do Radar desloga a pessoa do MilesPro e do VoePro em todos
   os aparelhos. Isso já vale na L0 e tem conserto próprio (C3 no README),
   que deve vir **antes** desta etapa. Dentro do VoePro, o "Sair" do Radar
   passa a ser o do VoePro (ou some do cabeçalho do Radar).
3. A logo (`<img src="/logo-srr.png">` no cabeçalho e na entrada): passa a
   usar o prefixo. Os outros caminhos do código (`<Link>`, `redirect()`) o
   Next prefixa sozinho.
4. A tela de entrada: sob o VoePro, quem chega **sem sessão** vai para o
   **`/login` do VoePro** com a volta para `/ofertas`, não para o `/entrar`
   do Radar (que tem o captcha e um formulário próprio). Quem chega **com
   sessão mas não liberado** continua vendo o recado "não liberada" do
   Radar: se fosse mandado ao `/login` do VoePro, o porteiro de lá (já
   conectado) o jogaria na página inicial do VoePro, sem explicação. O
   `/entrar` completo fica só para quem abrir o domínio antigo diretamente,
   até a pergunta 3 decidir.
5. Um link "← VoePro" no cabeçalho do Radar (pergunta 2).
6. Cabeçalhos de segurança: o `headers()` do VoePro (`/:path*`) **já cai
   sobre as respostas repassadas**. O Radar põe os seus só para o domínio
   próprio, com valores **idênticos** aos do VoePro (dois `X-Frame-Options`
   diferentes valem como inválidos). Anotado: uma política de conteúdo mais
   dura no VoePro (`script-src`) passaria a valer para o Radar e teria de
   liberar o captcha da Cloudflare e os scripts do Radar.
7. **Quem entra (pergunta 1).** O destino decidido em 31/10 é o acesso vir do
   VoePro. Quando vier: o VoePro publica uma visão de **duas colunas** (id do
   Auth, Radar ligado/desligado) num **schema de contrato próprio** (molde do
   `milespro_vitrine`; por exemplo `voepro_vitrine`), nunca dentro de `crm`
   (o papel `srr_ofertas` não ganha acesso ao `crm`). O Radar lê por SQL
   direto (`$queryRaw`), **sem acrescentar esse schema ao `datasource` do
   Prisma** (R2). A chave é o id da conta (`claims.sub`), não o e-mail.
   `ofertas.acesso` e a tela "Quem entra no Radar" se aposentam depois de uma
   semana com as duas conferências batendo.

**No VoePro (a sessão do VoePro, não esta):**

8. `next.config.ts`: as duas regras de repasse (`/ofertas`,
   `/ofertas/:path*`), para `https://ofertas.srrviagens.com.br` — **nunca**
   para o `.vercel.app`, que está atrás do login da Vercel.
9. `src/proxy.ts`: `/ofertas` sem sessão, por GET → `/login?volta=/ofertas`
   (o porteiro do VoePro já faz isso, e o `voltaSegura` dele aceita
   `/ofertas`: conferido pelo revisor da fusão). **POST sem sessão ele não
   redireciona**: atravessa até o Radar, que responde 303 para
   `/ofertas/entrar` e não executa a ação.
   **O repasse só se prova na produção:** fora dela (`VOEPRO_AMBIENTE` ≠
   `producao`) o `acessoDeFora` do VoePro responde 404 a quem vem de fora, e
   as variáveis do VoePro só existem em Production — a prévia da Vercel não
   serve. No computador, o VoePro usa o Auth de teste e repassaria para o
   Radar de produção (ambientes misturados). Decisão técnica desta etapa: o
   `destination` fixo no código (`https://ofertas.srrviagens.com.br`), sem
   variável nova; por isso o passo 2 se divide em 2a e 2b (abaixo).
10. O menu: "Radar de ofertas" com `href="/ofertas"`, **`<a>`** e não
    `<Link>` (trocar de sistema é carregar a página inteira), na mesma aba.
11. Se a pergunta 1 for B: a visão de contrato e o interruptor "Radar" na
    tela Equipe.

## O que não muda

- **O motor.** Continua no notebook do Saulo, escrevendo só em `ofertas`.
  Ele não sabe de endereço nenhum (R10 do FUSAO: o motor fica neste
  repositório; só a tela entra no VoePro).
- **O banco.** Nenhuma tabela nova, nenhuma migração (exceto a visão da
  opção B, que é do VoePro). O papel `srr_ofertas` continua enxergando só
  `ofertas`.
- **O MilesPro.** Nada. Nem domínio, nem Auth, nem código. O Site URL do Auth
  é do MilesPro e não é tocado; a Redirect URL `https://voepro…/**` já existe.
- **As telas do Radar.** Mesmas abas, mesmos botões, mesmo visual (o do kit).
- **O domínio `ofertas.srrviagens.com.br`** continua existindo: é para onde
  o VoePro repassa (pergunta 3).

## Perguntas de negócio que esta etapa leva ao Saulo

**1. Quem pode abrir o Radar?**

- **A) A lista do Radar continua** (Valores → "Quem entra no Radar"). Ganha:
  zero mudança no banco, a etapa fica menor. Custa: liberar alguém em dois
  lugares (Equipe do VoePro e Valores do Radar), e desligar em dois.
- **B) O VoePro decide:** um interruptor "Radar de ofertas" na tela Equipe
  do VoePro; o Radar só lê. Ganha: um lugar só, como o FUSAO pede
  (`acesso = crm.usuario`). Custa: uma visão de contrato no banco entre os
  dois sistemas, feita pela sessão do VoePro e revisada pelo Guardião.
- **C) Quem está ativo no VoePro entra no Radar.** Ganha: nada a configurar.
  Custa: o Radar mostra custo, margem e fonte; toda a equipe do VoePro
  passaria a ver.
- **Atenção:** a decisão de 31/10 já registrada no FUSAO (seção 0, fase 1b
  e seção 6: "pessoa separada não") é a **B**: a lista do Radar "é ponte e
  se aposenta quando o Radar entrar no menu".
- **Recomendação: B como destino, com A por no máximo duas semanas.**
  Primeiro o Radar entra no VoePro sem mexer em quem pode entrar (um risco
  por vez); o passo 4 (a troca para B) é **obrigatório**, com prazo, e as
  duas listas ficam conferidas lado a lado por uns dias. Se o Saulo escolher
  isso, é um desvio temporário da decisão de 31/10 e o Guardião registra no
  FUSAO.

**2. Como o Radar aparece dentro do VoePro?**

- **A) Tela inteira do Radar**, com o cabeçalho dele (abas, tema) e um link
  "← VoePro" no canto. Ganha: pronto nesta etapa. Custa: o menu lateral do
  VoePro some enquanto se está no Radar.
- **B) Dentro da moldura do VoePro**, com o menu lateral. Custa: só dá
  juntando o código dos dois sistemas num repositório (fase 5 do FUSAO,
  opcional e sem data).
- **Recomendação: A.** O visual já é o mesmo (kit), então a troca de tela não
  parece outro sistema.

**3. E o endereço `ofertas.srrviagens.com.br`?**

- **A) Continua só como "porta dos fundos"**: o VoePro repassa para ele, e
  quem digitar o endereço direto cai no login do VoePro e volta para
  `voepro…/ofertas`. Ganha: links antigos continuam funcionando. Custa: um
  domínio a mais para manter (DNS e o widget do captcha).
- **B) Desligar o domínio** e o VoePro repassar para o endereço interno da
  Vercel. Custa: o endereço interno está atrás do login da Vercel; para
  passar seria preciso uma chave de passagem guardada no VoePro. Mais peças,
  mais risco.
- **Recomendação: A.**

**4. O resto do antigo "L"** (motor num computador dedicado, sempre ligado;
avisos de saúde no celular): **proposta** de separar numa etapa **L2**,
aberta quando o Saulo decidir sobre o computador. Hoje o motor no notebook
funciona; misturar as duas mudanças aumenta o risco das duas.

## O plano, em passos (cada passo com o "sim" do Saulo antes)

| passo | o quê | quem | pronto quando |
|---|---|---|---|
| 0 | O visual (`l-visual/kit-srr`) aprovado e no `main`; o "Sair" local (C3) publicado | Radar | Saulo aprovou as fotos; prova 12 |
| 1 | Radar com `basePath`, `allowedOrigins`, proxy (só lê a sessão sob o VoePro), logo, `/`→`/ofertas`, cabeçalhos, link "← VoePro" — **publicado só no domínio dele** | Radar | `ofertas.srrviagens.com.br/ofertas` funciona inteiro (provas 1–4) |
| 2a | **Só o repasse** no VoePro, num deploy que não leve mais nada | VoePro | provas 5–9, digitando `voepro…/ofertas` (ninguém da equipe vê ainda) |
| 2b | O item do menu | VoePro | a equipe clica e entra |
| 3 | O `/entrar` do Radar manda quem está sem sessão para o `/login` do VoePro | Radar | provas 9 e 10 |
| 4 | Visão de contrato + interruptor na Equipe do VoePro; aposentar `ofertas.acesso` (**obrigatório**, prazo combinado na pergunta 1) | VoePro + Radar + Guardião | prova 11, uma semana batendo |

Entre o passo 1 e o 2b, o item do menu do VoePro aponta para
`ofertas.srrviagens.com.br`, que redireciona para `/ofertas`: ninguém fica
sem Radar no meio do caminho.

**Cada deploy leva só o seu passo.** O `master` local do VoePro está 45
commits à frente do publicado (etapa D, rodadas da 10a): o deploy do 2a
não pode levar isso junto sem lista e revisão própria. No Radar, o build
roda `prisma migrate deploy` na produção a cada deploy: antes e depois de
cada deploy desta etapa, conferir `ofertas._prisma_migrations`, e **nenhuma
pasta nova em `prisma/migrations/`** pode estar no `main` junto (a C2-A, que
cria a tabela de feriados, vem depois, com revisão própria). São pelo menos
seis builds somando os dois sistemas (R16): nada de push de teste.

## Riscos

| # | risco | gravidade | como evitar |
|---|---|---|---|
| L-1 | **O cookie de sessão não chega ao Radar pelo repasse** (ou a renovação do Radar não volta ao navegador): a pessoa fica presa entre o login do VoePro e o do Radar | ALTO | prova 6 antes de pôr o item no menu; se falhar, o passo 2 não vai |
| L-2 | **Dois porteiros renovando a mesma sessão no mesmo pedido**: o do VoePro renova antes de repassar; se o Radar receber o token velho e renovar de novo, volta com dois `Set-Cookie` e o Auth pode ver reuso do token de renovação e derrubar a sessão nos três sistemas | ALTO | desenho padrão: **só o VoePro renova**, o Radar só lê sob `/ofertas`; prova 7 com o token vencido e o primeiro pedido direto no Radar, por GET e por POST |
| L-11 | **"Sair" do Radar desloga de tudo** (escopo global, padrão da biblioteca) — já vale hoje | ALTO | C3 antes desta etapa; prova 12 |
| L-12 | **Deploy do VoePro levando o que não foi revisado** (master 45 commits à frente) | MÉDIO | 2a num deploy só com o repasse |
| L-13 | **Migração indo à produção sem revisão** pelo build do Radar | MÉDIO | `_prisma_migrations` antes/depois; nenhuma migração no `main` junto com a L |
| L-3 | **Botões do Radar recusados** pela proteção do Next contra pedido de outro site (a origem é o VoePro) | ALTO | `allowedOrigins` com o domínio exato do VoePro, nada de curinga; prova 8 |
| L-4 | **Porta aberta por fora**: o domínio do Radar e o `.vercel.app` continuam respondendo | ALTO (R5) | o Radar confere a sessão **e** a lista em toda tela e ação, como hoje — o repasse não substitui isso; o `.vercel.app` segue atrás do login da Vercel; prova 4 |
| L-5 | **`matcher` do proxy sem o prefixo**: alguma tela do Radar abre sem passar pela porta | ALTO | prova 2 (toda tela e uma ação por POST, sem sessão, vão para a entrada) antes de publicar |
| L-6 | **Link ou imagem quebrada** com o prefixo (logo, redirecionamento montado à mão) | BAIXO | lista dos caminhos absolutos já levantada (`grep`): 2 logos, 1 redirecionamento no proxy; prova 3 |
| L-7 | **Deploy fora de ordem**: VoePro repassando antes de o Radar ter o `basePath` → 404 em `/ofertas` | MÉDIO | ordem da tabela acima; o passo 2 só depois da prova 1 no ar |
| L-8 | **Ações de uma versão antiga** ("Failed to find Server Action" depois de cada deploy do Radar) | BAIXO | é o comportamento normal do Next; recarregar a página resolve. Avisar a equipe |
| L-9 | **Custo da Vercel** (R16): cada push é um build, o Radar e o VoePro somam | BAIXO | juntar as mudanças do passo 1 num deploy só; nada de pushes de teste em ramo publicado |
| L-10 | **(passo 4) permissão entre schemas**: o papel `srr_ofertas` passa a ler uma visão do VoePro | MÉDIO | schema de contrato próprio (nunca `crm`), duas colunas (id do Auth, ligado/desligado), sem nome nem e-mail, leitura por SQL direto sem mexer no `datasource`; Guardião revisa; registrada no DIARIO |

## Como provar (no ar, com o Saulo olhando)

1. `https://ofertas.srrviagens.com.br/` → vai para `/ofertas`; com sessão, a
   vitrine abre; as cinco abas abrem; a logo aparece.
2. **Sem sessão** (janela anônima): `/ofertas`, `/ofertas/valores`,
   `/ofertas/saude`, `/ofertas/buscas`, `/ofertas/pacotes` e um POST de ação
   → todos vão para a entrada (o mesmo teste da L0, com o prefixo).
3. `curl -I` nos arquivos: `/ofertas/_next/static/...` 200; `/logo-srr.png`
   não é mais pedido sem prefixo (aba Rede do navegador).
4. `srr-ofertas.vercel.app` continua pedindo o login da Vercel.
5. `https://voepro.srrviagens.com.br/ofertas` sem sessão → `/login` do VoePro
   com a volta para `/ofertas`.
6. Entrar no VoePro e clicar no menu: o Radar abre **sem pedir senha**, na
   mesma aba, com o e-mail certo no cabeçalho.
7. Deixar a aba parada mais de uma hora (token vencido) e fazer o
   **primeiro** pedido direto em `voepro…/ofertas/valores`, por GET (abrir a
   tela) e por POST (salvar uma regra): entra, sem deslogar, e a resposta tem
   um `Set-Cookie` só (L-2). Depois, navegar entre VoePro e Radar por uma hora.
8. Dentro de `voepro…/ofertas`: "Buscar agora" e "Conferir agora" entram na
   fila (`ofertas.busca_agora`, `ofertas.conferencia_pedido`) e o motor
   atende; em Valores, salvar uma regra. Nenhum erro de origem nos logs.
9. Uma conta que está no VoePro mas **não** liberada no Radar: vê o recado
   "não liberada", não a vitrine.
10. `ofertas.srrviagens.com.br/ofertas/entrar` → login do VoePro.
11. (passo 4) desligar o interruptor de alguém no VoePro → na próxima tela,
    essa pessoa perde o Radar.
12. Entrar no Radar e no MilesPro no mesmo navegador (e o MilesPro no
    celular); apertar "Sair" no Radar: o MilesPro e o celular **continuam**
    conectados.

Conferências no banco depois de cada passo: `select count(*) from
pg_stat_activity` (R3); nenhuma tabela nova em `ofertas` (exceto se o Saulo
pedir); `ofertas.passada` seguindo (o motor não sentiu nada).

## Como desfazer

- **Passos 2a/2b (VoePro):** voltar o menu para o link externo e tirar as
  duas regras de repasse ("Promote" do deploy anterior na Vercel, sem build).
  Minutos. O Radar segue em `ofertas.srrviagens.com.br/ofertas`.
- **Passo 1 (Radar):** "Promote" do deploy anterior na Vercel (sem build) ou
  reverter o commit do `basePath`. Os endereços antigos sem `/ofertas` voltam.
- **Passo 4:** o Radar volta a ler `ofertas.acesso` (que não é
  apagada até a semana de conferência terminar); a visão do VoePro pode
  ficar, não atrapalha.
- Nenhum passo apaga dado, então nenhuma volta precisa de backup. Mesmo
  assim, antes do passo 4, uma cópia do `ofertas.acesso`.

## Regras desta etapa

- **Revisor da fusão antes de cada commit** que toca `next.config.ts`,
  `proxy.ts`, `src/lib/acesso/**` ou qualquer `process.env` novo (é tudo área
  sensível do FUSAO, seção 5).
- **Nada vai ao ar sem o Saulo olhando.** Os pushes são dele.
- **Esta sessão não escreve no `srr-crm`.** Os passos do VoePro vão escritos
  para a sessão do VoePro, com o texto exato das regras de repasse.
- Segredo nunca no chat nem no commit. Esta etapa não pede variável nova
  (o domínio do VoePro entra no código, não é segredo).
- Leia `node_modules/next/dist/docs/` (multi-zones, basePath, rewrites,
  serverActions) antes de escrever.

## Fora do escopo

Motor no computador dedicado e avisos de saúde (L2); juntar os repositórios
(fase 5 do FUSAO); cookie no domínio pai `.srrviagens.com.br` (fase 2 do
FUSAO); painel central de usuários (fase 4); a nota (V2), o card (V4) e o
Telegram (V5).

## Como a revisão vai conferir

- O diff do Radar: só `next.config.ts`, `proxy.ts`, a logo, o cabeçalho,
  `src/app/entrar/` e, no passo 4, `src/lib/acesso/`. Nenhuma migração.
- As provas 1–12 refeitas pela sessão de controle no endereço publicado.
- Revisão do revisor da fusão sobre esta especificação (02/11): **OK com
  ressalvas**, todas incorporadas acima (pergunta 1 contra o FUSAO, "Sair"
  global, renovação dupla, repasse só testável na produção, deploys sem
  carona, migração no build, recado "não liberada", cabeçalhos).
- O DIARIO com uma linha por deploy, com a hora.
