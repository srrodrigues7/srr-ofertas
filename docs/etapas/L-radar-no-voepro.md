# Etapa L — O Radar como telas do VoePro

**Esforço: alto, encostado no xalto.** Não há dado novo nem migração de
dados. O peso mudou de lugar: as telas do Radar passam a ser **publicadas
com o VoePro**, e o VoePro passa a ter uma segunda chave de banco (a das
telas do Radar). Um erro aqui não derruba só o Radar: derruba ou expõe o
sistema que a agência usa o dia inteiro, ou alcança o schema `ofertas`.
Por isso cada passo vai em deploy próprio, com o revisor da fusão antes. Não
é xalto porque nada apaga dado e cada passo volta com um "Promote" do
deploy anterior.

## O que o Saulo decidiu (02/11/2026)

1. **Quem pode abrir o Radar decide a gestão de acesso da tela Equipe do
   VoePro.** `ofertas.acesso` e o `/entrar` do Radar se aposentam.
2. **"O Radar não vai ter uma página separada do VoePro. Ele é dentro do
   VoePro. É só um botão no menu: clico, abre a tela normalmente, igual
   todas as outras telas do VoePro."** Menu lateral do VoePro, a mesma
   casca, sem "← VoePro".
3. **O endereço oficial é `voepro.srrviagens.com.br/ofertas`.**
   `ofertas.srrviagens.com.br` só redireciona para lá e, se puder, se
   aposenta depois.
4. **O motor segue no notebook para lançar rápido**; ir para um servidor na
   nuvem é a etapa [L2](L2-motor-na-nuvem.md).

A primeira versão desta especificação (Radar como aplicação à parte,
repassada pelo VoePro com `basePath` e rewrite) caiu com a resposta 2: dava a
mesma URL, mas não o menu do VoePro. Com ela caem os riscos de cookie
repassado, de renovação dupla do token e de origem das ações.

## O objetivo, em uma frase

**O item "Radar de ofertas" do menu do VoePro abre as telas do Radar
(Passagens, Pacotes, Pedidos de busca, Valores, Saúde) como qualquer outra
tela do VoePro**, para quem tem o interruptor ligado na Equipe.

## O desenho

```
  srr-crm (VoePro, Vercel)                       srr-ofertas (Radar)
  ┌────────────────────────────────┐             ┌───────────────────────────┐
  │ menu ─► /ofertas/...            │             │ motor (notebook; L2: nuvem)│
  │ telas do Radar + guarda         │             │ schema.prisma + migrações │
  │   (código do VoePro)            │◄── cópia ───│ src/pacote/  (o pacote)   │
  │ src/radar/  pacote copiado,     │  (script)   │                           │
  │   não se edita lá               │             └─────────────┬─────────────┘
  │ cliente "ofertas" (2º Prisma),  │                           │ srr_ofertas
  │   papel só de telas, sem DDL    │                           │ (dono, migra)
  └──────────────┬─────────────────┘                           │
     crm (postgres) │  ofertas (srr_ofertas_tela)               │
                    └──────── Supabase milespro-production ─────┘
```

**Quem é dono de quê** (para não virar dois Radares):

| peça | mora em | quem muda |
|---|---|---|
| Motor, coletores, alertas, revalidador | `srr-ofertas` | sessão do Radar |
| Schema `ofertas` e **toda migração dele** | `srr-ofertas` | sessão do Radar, com o revisor |
| **O pacote**: o que as telas precisam (ler a vitrine, o preço de venda, a configuração e o catálogo de chaves, a saúde, pedir "Buscar agora"/"Conferir", gravar Valores) | `srr-ofertas/src/pacote/`, **copiado** para `srr-crm/src/radar/` por script | sessão do Radar; no VoePro **não se edita** |
| As telas (páginas, componentes, CSS), a guarda e o cliente do `ofertas` | `srr-crm/src/app/ofertas/` e `srr-crm/src/lib/` | sessão do VoePro |

**Quem grava no `ofertas` continua sendo código do Radar** (o pacote), com
uma chave do Radar. O código do VoePro só chama as funções do pacote, depois
da guarda dele. Esta é a exceção ao princípio 1 do FUSAO ("ninguém escreve no
schema do outro"), e ela precisa estar escrita lá (ver "Antes de começar").

As telas do Radar já são finas (medido em 02/11): as ações delas **só gravam
pedidos e valores no banco**; quem trabalha é o motor. Nada do motor roda
dentro de uma tela.

## Antes de começar (pré-condições do passo 1)

- **O Guardião atualiza o FUSAO**: fase 1b (de "basePath + rewrite" para
  "telas no VoePro, pacote copiado do Radar"); princípio 1 (a exceção acima);
  R7 (exceção para o pacote: não se copia código de banco entre repositórios,
  **menos** o pacote, por script, com as duas pontas no mesmo Prisma); R5
  (fecha no passo 4); R3 (uma pool a mais no VoePro); a tabela da seção 1 (o
  VoePro passa a usar dois usuários de banco); o diagrama da seção 2.
- **O Saulo responde a pergunta 5 e a 6** (abaixo).

## O que muda

### No Radar (`srr-ofertas`, esta sessão) — passo 1

1. **A saída do gerador do Prisma muda** de `src/generated/prisma` para
   **`src/generated/ofertas`**, e todo import passa a
   `@/generated/ofertas/client`. É o mesmo caminho nos dois repositórios e
   não colide com o cliente do `crm` do VoePro (que mora em
   `src/generated/prisma` e é commitado lá). **Isto mexe no motor** (ele
   importa o cliente), e o motor se atualiza sozinho do `main` (o vigia roda
   `npm ci` e o `postinstall` gera o cliente): a prova 1 inclui o motor.
2. **O pacote** (`src/pacote/`): o que as telas usam, sem Next, sem login,
   sem tela. Regras do pacote:
   - importa só de dentro dele e de `@/generated/ofertas/client`; nunca
     `@/lib/*` nem `@/generated/prisma`;
   - **recebe o cliente do banco de quem o usa** (não abre conexão sozinho);
   - as funções que gravam recebem "quem fez" como parâmetro: o **id da conta
     do Auth** (`authUserId`), e o e-mail só como texto de apoio (no VoePro o
     e-mail da pessoa pode estar vazio).
   O motor continua usando `configuracao.ts`, `preco.ts`, `alertas/regras.ts`
   e as saúdes; elas passam a morar no pacote e o motor importa de lá.
3. **As telas do próprio Radar** (`ofertas.srrviagens.com.br`) passam a usar o
   pacote: ele é provado aqui antes de ir para o VoePro.
4. **O script `scripts/exportar-pacote.mjs`**, irmão do `exportar-kit.mjs`:
   - copia `src/pacote/` para `srr-crm/src/radar/` e o `schema.prisma` para
     `srr-crm/prisma/ofertas/schema.prisma`, **reescrevendo o bloco
     `generator`** para a saída `../../src/generated/ofertas` (o caminho certo
     a partir da pasta da cópia);
   - escreve `ORIGEM.md` com o commit;
   - **recusa**: se a cópia de lá tiver mudança não commitada; se algum
     arquivo do pacote importar `@/lib/` ou `@/generated/prisma`; se o
     `prisma`/`@prisma/client` do VoePro não for o mesmo 7.10;
   - não commita, não toca banco nem rede.
5. Nenhuma migração, nenhuma tabela nova neste passo.

### No VoePro (`srr-crm`, a sessão do VoePro) — passos 2 e 3

Esta sessão **não escreve no `srr-crm`**. Os passos 2 e 3 vão como tarefa
escrita para a sessão do VoePro, com estas exigências:

6. **O segundo cliente, só do `ofertas`:**
   - um **`prisma.ofertas.config.ts`** próprio, com `schema` apontando para a
     cópia, **sem `migrations`** e com `datasource.url` vazio (falha fechada,
     como o `prisma.config.ts` do Radar). Usado só por
     `prisma generate --config prisma.ofertas.config.ts`. Assim um `migrate`
     com o `schema` do `ofertas` nunca carrega o `prisma.config.ts` do VoePro
     (que aponta para o `postgres` e para as migrações do `crm`);
   - o segundo `generate` e um `prisma validate` da cópia entram no `build` e
     no `check` do VoePro; `src/generated/ofertas` é commitado lá, como o do
     `crm`;
   - **nenhuma URL da porta 5432 do `ofertas` no VoePro**, nunca.
7. **A conexão:** variável nova **`OFERTAS_PGBOUNCER_URL`** (6543, pooler),
   só em Production, com o papel da pergunta 6. O cliente nasce **só na
   primeira consulta** (como o `src/lib/prisma.ts` do Radar), com **chave
   própria em `globalThis`** (não a `prisma` do VoePro), pool 2 por
   instância, e **nunca é importado pela casca nem pelo menu**: sem a
   variável, só as telas do Radar mostram o erro; o VoePro segue de pé.
8. **Uma regra de eslint** (`no-restricted-imports`) no VoePro: o cliente do
   `ofertas` e `@/generated/ofertas` só dentro de `src/radar/` e do arquivo
   que cria o cliente.
9. **As telas** em `src/app/ofertas/` (passagens, pacotes, buscas, valores,
   saúde), na casca do VoePro, com as abas do Radar no topo da área de
   conteúdo. Os CSS do Radar já usam as variáveis do kit (a etapa D está nos
   dois).
10. **A guarda:** interruptores novos (pergunta 5). Toda tela chama
    `exigirTela`, toda ação `exigirAcao`, antes de tocar no banco. Os
    interruptores moram no código e em `crm.usuario.ajustes`, que já existe:
    **sem migração**. Os testes de acesso do VoePro (`testar:acesso`,
    `conferir:acesso`) crescem com eles.
11. **O menu:** "Radar de ofertas" → `/ofertas`, `<Link>` normal, mesma aba,
    só para quem tem o interruptor.
12. **Nada de rota nova em `src/app/api/`** para o Radar. A leitura de prova
    do passo 2 é um script ou um bloco na tela de Saúde do Radar, com guarda.

### Depois — passo 4 (resposta 3)

13. `ofertas.srrviagens.com.br` passa a só redirecionar para
    `voepro.srrviagens.com.br/ofertas`; o painel próprio, o `/entrar`, o
    captcha e `ofertas.acesso` se aposentam; o projeto da Vercel do Radar vira
    só o redirecionamento (ou sai, se o redirecionamento for feito no DNS).
    Isso fecha o `.vercel.app` aberto (R5) e corta builds (R16).
14. **Atenção, R11:** hoje o build da Vercel do Radar é o **único caminho
    automático** das migrações do `ofertas` para a produção. Quando ele parar
    de migrar, a ordem de toda migração nova do Radar passa a ser: (a)
    `migrate deploy` na produção pela 5432 com o `srr_ofertas`, rodado pelo
    Saulo, com linha no DIARIO; (b) push para o `main` (o motor se atualiza);
    (c) exportar o pacote; (d) deploy do VoePro. Isso fica escrito no README
    do Radar antes do passo 4.

## O que não muda

- **O motor fica no `srr-ofertas`** e no notebook (R10); só muda de onde
  importa o cliente e as funções que foram para o pacote.
- **O banco:** nenhuma tabela, nenhuma migração de dados. O `ofertas`
  continua com um dono só para migração (`srr_ofertas`).
- **O MilesPro:** nada.
- **O login:** o do VoePro, sem mudança.

## Perguntas ao Saulo

**5. Um interruptor ou dois?**
- **A) Um só, "Radar":** quem tem, vê tudo e muda tudo, inclusive margem e
  milheiro em Valores.
- **B) Dois, "Radar" e "Radar: valores":** a curadoria vê, busca e confere;
  mudar margem, milheiro e regras é de quem o Saulo escolher.
- Nos dois casos, **todo Administrador do VoePro ganha os interruptores
  sozinho** (é assim que o VoePro trata o Administrador hoje).
- **Recomendação: B.** Valores muda o preço que vai para o cliente; é o mesmo
  cuidado que o VoePro já tem com Configurações.

**6. Com que chave as telas entram no banco?**
- **A) A chave do Radar de hoje (`srr_ofertas`).** Ganha: nada a preparar.
  Custa: esse papel é **dono** do schema `ofertas` e pode apagar qualquer
  tabela dele. Um erro nas telas do VoePro teria esse poder.
- **B) Uma chave só para as telas (`srr_ofertas_tela`):** lê o que as telas
  mostram e grava **só** nas filas ("Buscar agora", "Conferir") e nos
  valores; não cria, não muda e não apaga tabela. Custa: preparar o papel
  uma vez (pelo `scripts/preparar-banco.mjs`, com o Saulo, linha no DIARIO);
  tabela nova do Radar que as telas usarem precisa de permissão (a regra
  padrão do Postgres já cobre as próximas).
- **Recomendação: B.** É a mesma lógica que já separa o Radar do resto do
  banco, um degrau abaixo.

## Os passos (cada um com o "sim" do Saulo e em deploy próprio)

| passo | o quê | onde | pronto quando |
|---|---|---|---|
| 0 | `publicar/c3-e-visual` no ar (visual + "Sair" só do Radar) | Radar | já aprovado; o Saulo empurra |
| 1 | Saída `src/generated/ofertas`; o pacote; o Radar e o motor usando o pacote; o script de exportar | Radar | provas 1 e 2 |
| 1b | (pergunta 6 = B) o papel `srr_ofertas_tela`, no banco de testes e depois na produção | Saulo + Radar + Guardião | prova 3 |
| 2 | Segundo cliente, config própria, variável nova, eslint, **sem tela** | VoePro | provas 4 e 5 |
| 3 | As telas em `/ofertas` e os interruptores, **menu escondido** | VoePro | provas 6 a 10 |
| 3b | O item do menu | VoePro | a equipe clica e entra |
| 4 | Redirecionamento do domínio antigo; aposentar o painel próprio; a nova rota de migração escrita | Radar + Vercel + DNS | prova 11, depois de uma semana dos passos 3 e 3b sem queixa |

**Cada deploy leva só o seu passo.** O `master` local do VoePro está à
frente do publicado (etapa D, rodadas da 10a): os passos 2 e 3 não levam
isso junto sem lista e revisão própria. No Radar, até o passo 4, todo push
ao `main` roda `migrate deploy` na produção: conferir
`ofertas._prisma_migrations` antes e depois, e nenhuma migração nova no
`main` junto com a L (a C2-A, feriados, vem depois). Builds somados (R16):
pelo menos sete; nada de push de teste.

**Teste antes da produção:** fora da produção, o VoePro só abre no próprio
computador (`acessoDeFora`), e a prévia da Vercel dá 404. As provas 6 a 10
rodam **primeiro no computador, com o VoePro no banco de testes**, que já tem
as 9 migrações do `ofertas` e o papel do Radar (conferir antes; com a
pergunta 6 = B, o papel novo nasce primeiro lá).

## Riscos

| # | risco | grav. | como evitar |
|---|---|---|---|
| L-1 | **O gerador do `ofertas` escreve por cima do cliente do `crm`** no VoePro (os dois saem hoje em `src/generated/prisma`) | CRÍTICO | saída `src/generated/ofertas` nos dois repositórios; o script reescreve o `generator` da cópia; o revisor confere o diff do `src/generated/` do VoePro |
| L-2 | **Migração do `ofertas` pelo VoePro**, com o `postgres` e as migrações do `crm` (um `migrate` com `--schema` da cópia carrega o `prisma.config.ts` do VoePro) | CRÍTICO | `prisma.ofertas.config.ts` com URL vazia e sem migrações; nenhuma URL 5432 do `ofertas` no VoePro; o datasource do VoePro continua `["crm"]` |
| L-3 | **As telas com poder de dono** sobre o `ofertas` | ALTO | pergunta 6 = B |
| L-4 | **Tipos com o mesmo nome**: o pacote compilando contra o cliente do `crm` | ALTO | imports só por `@/generated/ofertas`; o script recusa; eslint no VoePro |
| L-5 | **O VoePro inteiro cai sem a variável nova**, ou os dois clientes se sobrescrevem no `next dev` | ALTO | cliente na primeira consulta, chave própria em `globalThis`, nunca importado pela casca |
| L-6 | **Tela sem guarda** mostra custo e margem a quem não devia | ALTO | guarda na primeira linha de toda tela e ação; prova 8 com uma conta sem o interruptor; o revisor lista toda ação nova |
| L-7 | **O motor quebra** com a mudança do passo 1 e se atualiza sozinho | ALTO | prova 1 com o motor no notebook antes do push; o vigia volta sozinho para a versão anterior se a nova cair |
| L-8 | **Conexões** (R3): uma pool a mais no VoePro, dividindo o pooler com o painel próprio do Radar até o passo 4 | MÉDIO | pool 2 por instância; prova 5 mede por usuário do banco, antes e depois, contra o teto do pooler |
| L-9 | **Dois Radares** (a cópia editada no VoePro e o original divergindo) (R12) | MÉDIO | o pacote não se edita lá; o script recusa por cima de mudança local; `ORIGEM.md` |
| L-10 | **O schema copiado fica velho** depois de uma migração do Radar | MÉDIO | migração do Radar só acrescenta; a ordem do item 14 |
| L-11 | **Deploy do VoePro levando o que não foi revisado** (R14) | MÉDIO | passos 2, 3 e 3b em deploys só com eles |
| L-12 | **Versões**: o pacote espera o mesmo Prisma 7.10 e o mesmo Next 16.3.8 | MÉDIO | o script confere a versão maior e a menor do `prisma` e do `@prisma/client` |
| L-13 | **Dois painéis por uma semana**, com regras de acesso diferentes | BAIXO | a controle confere `ofertas.acesso` e os interruptores lado a lado |

## Como provar

1. **Passo 1, no computador:** `npm run check`; o painel próprio mostra as
   mesmas ofertas, preços e parcelas de antes (mesma busca, conferida no
   banco); **o motor no notebook sobe com o código novo e faz uma passada
   ok**, com coleta gravada.
2. `node scripts/exportar-pacote.mjs <pasta>` numa cópia de teste do VoePro:
   copia, reescreve o `generator`, escreve `ORIGEM.md`; recusa por cima de
   mudança local, recusa um import proibido de propósito.
3. (pergunta 6 = B) Com o papel das telas: ler a vitrine e gravar um "Buscar
   agora" funcionam; `DROP`, `ALTER` e `DELETE` numa tabela de ofertas são
   recusados.
4. Passo 2 no computador e depois no ar: o VoePro responde igual; sem
   `OFERTAS_PGBOUNCER_URL`, o VoePro abre normalmente.
5. `pg_stat_activity` por usuário do banco, antes e depois do passo 2: o
   papel das telas aparece com no máximo 2 conexões por instância, dentro do
   teto do pooler.
6. `voepro…/ofertas` com o interruptor: as cinco abas abrem na casca do
   VoePro, com o menu lateral; números iguais aos do painel próprio.
7. Sem sessão: `voepro…/ofertas/...` vai para o `/login` do VoePro e volta
   para a tela pedida.
8. Uma conta **sem** o interruptor: não vê o item no menu; o endereço
   digitado dá "sem acesso"; uma ação chamada à mão é recusada.
9. "Buscar agora", "Conferir agora", "Conferi" e salvar em Valores pelo
   VoePro: os pedidos entram na fila com o id de quem fez, e o motor atende.
10. (pergunta 5 = B) quem tem só "Radar" vê Valores sem poder salvar.
11. Passo 4: `ofertas.srrviagens.com.br` leva a `voepro…/ofertas`; o
    `.vercel.app` do Radar não serve mais o painel.

## Como desfazer

- **Passos 3 e 3b:** "Promote" do deploy anterior do VoePro (sem build). O
  painel próprio continua de pé até o passo 4: ninguém fica sem Radar.
- **Passo 2:** idem, e tirar `OFERTAS_PGBOUNCER_URL` da Vercel do VoePro.
- **Passo 1b:** `DROP ROLE` do papel das telas (não é dono de nada).
- **Passo 1:** reverter o commit no `main`; o vigia do motor volta junto.
- **Passo 4:** religar o painel próprio na Vercel e o DNS. Por isso ele só
  vem uma semana depois dos passos 3 e 3b.
- Nenhum passo apaga dado.

## Regras desta etapa

- **Esta sessão não escreve no `srr-crm`.**
- **Revisor da fusão antes de cada commit** que toque `schema.prisma`,
  qualquer `prisma*.config.ts`, `package.json` (scripts de Prisma),
  `src/generated/`, `src/lib/acesso*`, `proxy.ts`, `next.config.ts`,
  `vercel.json`, `scripts/preparar-banco.mjs` ou qualquer `process.env` novo.
- Nada vai ao ar sem o Saulo olhando; os pushes são dele.
- Leia `node_modules/next/dist/docs/` e a documentação do Prisma 7
  (`prisma.config.ts`, `--config`) antes de escrever.

## Fora do escopo

Motor na nuvem (L2); juntar os repositórios inteiros (fase 5 do FUSAO);
cookie no domínio pai (fase 2); painel central de usuários (fase 4); a nota
(V2), o card (V4) e o Telegram (V5) — quando vierem, nascem como telas do
VoePro sobre o pacote.

## Como a revisão vai conferir

- Diff do Radar no passo 1: a saída do gerador, `src/pacote/`, os imports
  trocados (telas e motor), o script. Nenhuma migração.
- Diffs do VoePro: `prisma.ofertas.config.ts` sem migrações e com URL vazia,
  o `src/generated/ofertas` separado do `crm`, a guarda em toda tela e ação,
  a variável nova só em Production, a regra de eslint.
- As provas 1–11 refeitas; `pg_stat_activity` e `ofertas._prisma_migrations`
  antes e depois de cada deploy.
- Revisões do revisor da fusão sobre esta especificação (02/11): a primeira
  versão e esta, **OK com ressalvas**, todas incorporadas.
