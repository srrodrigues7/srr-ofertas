# As etapas da construção

O Radar de Ofertas é construído **uma etapa por vez**, cada uma num chat
próprio, com contexto limpo. Este arquivo é o painel de controle: onde cada
etapa está e o que a próxima precisa saber.

## Como funciona

1. A **sessão de controle** escreve a especificação da etapa e cria a tarefa
   para um agente novo.
2. O agente lê [00-contexto.md](00-contexto.md) e a especificação, **leva ao
   Saulo as perguntas de negócio** (sempre com alternativas e recomendação) e
   **apresenta um plano detalhado**.
3. **O Saulo aprova o plano.** Nada é construído antes disso.
4. O agente constrói, testa, commita, atualiza este arquivo e **para**.
5. **A sessão de controle revisa com o Saulo**: lê o diff, roda o que foi
   feito, confere no banco.
6. **O Saulo aprova o resultado.** Só então a próxima etapa é aberta.

Nenhuma etapa começa sozinha. Nenhuma etapa pula a fila. Etapas sem dependência
entre si podem correr em paralelo, cada uma na sua sessão.

## Quadro

**O jeito do Saulo trabalhar:** ver o sistema achando oferta primeiro, uma
peça funcionando por vez, e só no fim ligar a estrutura (Vercel, GitHub, login,
computador dedicado). Por isso a ordem abaixo põe ofertas na tela o quanto
antes e deixa "ligar tudo" para o final. Tudo roda local até lá.

| #    | Etapa | Depende de | Esforço | Estado |
| ---- | ----- | ---------- | ------- | ------ |
| O0   | [Fundação](O0-fundacao.md) — projeto, banco, motor e tela de Saúde, **rodando local** | — | alto | **aprovada** (a parte de publicar ficou para a L) |
| V1a  | [Vitrine: passagens](V1a-vitrine-passagens.md) — Smiles e Melhores Destinos buscando, passagens reais de BSB na tela, com custo, venda e parcelas; o molde de oferta | O0 | alto | **aprovada** (só no computador) |
| V1b  | [Vitrine: pacotes](V1b-vitrine-pacotes.md) — Cativa e Hoteldo: investiga em paralelo à V1a, depois pluga os pacotes no molde dela | O0 (investigar), V1a (plugar) | alto | **fase 1 aprovada; fase 2 aberta** |
| V2   | A nota — preço normal de cada rota em cada mês, nota 0–100 com o motivo, as melhores no topo | V1 | alto | esperando |
| V3a  | [Investigar Pátria, Azul Viagens e Expedia TAAP](V3a-investigar-patria-azul-expedia.md) — só investigação, uma ficha por fonte | — | alto | **encerrada — fontes seguradas pelo Saulo** (as três: "depois"; caminho e pedido em cada ficha) |
| V3.x | Uma fonte por vez, da lista do Saulo — investigar, plugar e ver na tela | V1 | médio (alto se a fonte for difícil) | esperando |
| V4   | Da oferta ao post — aprovar/descartar com revalidação, card e legenda | V2 | alto | esperando |
| V5   | Robô do Telegram — aviso de oferta de nota alta, atalho para aprovar | V4 | médio | esperando |
| L    | Ligar tudo — Vercel, GitHub, login, motor instalado no computador dedicado, alertas de saúde | quando o Saulo quiser | xalto | esperando |
| R    | Resultado — card ligado à venda no VoePro, para o motor aprender | VoePro no ar | alto | esperando |

**Os níveis de esforço** (o mesmo critério do VoePro):

| nível | quando |
| ----- | ------ |
| baixo | trabalho mecânico: trocar texto, cor, nome |
| médio | construir parecido com o que já existe; a receita é conhecida |
| alto | modelo de dados novo, regra nova, coisa que quebra torto se errar |
| xalto | erro custa dado, dinheiro ou segurança, e não tem volta fácil |
| máximo | só quando o alto já tentou e não deu conta |

O L é **xalto** porque é onde o sistema sai do computador e fica exposto na
internet com login — errar ali abre o sistema.

```
O0 ─► V1a + V1b ─┬─► V2 ─► V4 ─► V5
                 └─► V3.x (uma fonte por vez, enquanto o resto anda)
                                        L  (quando o Saulo decidir)
```

O [O1-raio-x-das-fontes.md](O1-raio-x-das-fontes.md) deixou de ser etapa: o
raio-x agora acontece dentro de cada V1/V3.x, e aquele arquivo é o checklist do
que investigar em cada fonte.

## O escopo de cada uma, em uma frase

- **O0** deixa a casa de pé no computador: projeto, schema `ofertas`, motor e
  tela de Saúde.
- **V1a** põe passagens reais na tela (Smiles e Melhores Destinos) e cria o molde de oferta.
- **V1b** põe pacotes reais na mesma tela (Cativa e Hoteldo).
- **V2** diz quais delas são extraordinárias, e por quê.
- **V3.x** traz cada fonte nova, uma de cada vez.
- **V4** transforma a oferta aprovada em post pronto.
- **V5** avisa no celular.
- **L** publica e instala tudo para rodar sozinho.
- **R** fecha o ciclo com o que vendeu.

## Decisões do Saulo já tomadas

- **Projeto irmão** (não dentro do VoePro): mesmo Supabase, mesma Vercel,
  código e deploy próprios.
- **Trabalho contínuo num computador dedicado** que fica sempre ligado.
- **Curadoria manual:** funcionário vê, analisa, aprova e posta no grupo.
- **Origem BSB** acima de tudo; internacional pode sair de GRU ou GIG.
- **Uma pessoa dedicada** à curadoria nos picos (Black Friday).
- **Fontes:** a lista do Saulo está chegando; Smiles e Melhores Destinos já se
  sabe que respondem por endpoint. Pedidos de API feitos às consolidadoras.

### Bateria de perguntas da sessão de controle (11/10/2026)

- **Volume para o grupo: muitas ofertas por dia**, e o **limite diário é
  configuração** no painel.
- **O que é "preço bom" é configuração, por padrão de oferta.** O Saulo quer
  dizer, por exemplo: "resort all inclusive, até R$ 10 mil por pessoa",
  "América do Sul, até R$ X", "Lisboa, até R$ Y". Sem uma referência
  configurada não dá para saber se a oferta é boa. É parecido com o teto da
  HUB 92, mas mais rico.
- **Pacotes entram no escopo** (o exemplo do Saulo é resort all inclusive), não
  só passagem.
- **Next.js do VoePro** (16.3.4 tem alerta de segurança; aqui usamos 16.3.8):
  atualizar **antes do VoePro ir para o ar**, não agora.
- **Réguas de preço bom:** cada régua tem **dois degraus, "boa" e
  "imperdível"**, e as imperdíveis ganham **destaque** no painel e no Telegram.
  A tela é de seleção rápida: o Saulo digita "América do Sul", escolhe na lista
  (fica como um botão selecionado), clica em "Aéreo", e informa a faixa. Vale
  para região, país ou cidade ("Argentina · Aéreo", "Buenos Aires · Aéreo",
  "Santiago · Pacote"). A mais específica vence. **Preço fechado por pessoa**,
  não por diária.
- **Preferências de voo entram na nota** (V2), configuráveis: horários que
  ninguém quer (ex.: madrugada) perdem pontos; direto ganha de conexão. O Saulo
  aceita simplificar se for preciso — o que importa é gerar resultado.
- **Pacotes já na primeira vitrine.** Fontes, nesta ordem: **Cativa e
  Hoteldo** (as operadoras com que mais trabalham), depois **Pátria** (parceria
  começando) e **Azul Viagens** (têm cadastro).
- **Operadoras: explorar todos os caminhos** — páginas abertas de ofertas (sem
  login), busca por requisição, e **login automático** com as credenciais do
  Saulo (ele coloca na configuração; código de verificação pode ser lido do
  e-mail conectado da agência).
- **Login em programa de milhas** (se a Smiles ou outro exigir): deixar pronto
  um lugar na configuração para o Saulo inserir a conta de acesso. Ele acha que
  não vai precisar.
- **Datas na mensagem do grupo: mês e janela** ("março, várias datas a partir
  de R$ X"), só quando houver um mínimo configurável de datas naquele preço.
- **Duas visões:** a da equipe mostra tudo, inclusive **de onde veio** a oferta;
  a mensagem do grupo **não mostra a fonte**, mas **mostra a companhia aérea**.
- **Margem só em milhas.** Oferta de consolidadora ou operadora já tem a RAV
  embutida — o preço dela é o de venda. Em milhas: **uma margem por tipo**
  (nacional, internacional, executiva, pacote…), cada uma com **percentual e
  valor mínimo em reais; vale o maior dos dois**.
- **Milheiro:** o Saulo informa o preço de cada programa e o sistema faz a
  conta (milhas ÷ 1000 × preço + taxas). Sem mais distinções.
- **Parcelamento:** destacar as parcelas — é o que o cliente olha. Oferta de
  operadora/consolidadora: mostrar as **parcelas sem juros que a fonte
  oferece**. Oferta em milhas (cobrada por link de pagamento): **tabela
  configurável de taxa por número de parcelas**, e o sistema calcula a parcela.
- **Internacional por GRU/GIG:** a mensagem diz só **"saindo de São Paulo"**
  (ou Rio).
- **Classes: econômica e executiva.**
- **Curadoria trabalha no computador** — o painel é desenhado para tela grande.

## No radar — ideias do Saulo para depois

**Busca para o cliente (o motor a serviço do consultor).** O cliente chega com
um pedido ("Lisboa em março, casal, até R$ 8 mil"); o consultor registra o
pedido e o motor (a) busca na hora em todas as fontes e devolve as melhores
opções, e (b) se não houver nada bom, **fica vigiando** e avisa o consultor
quando aparecer um preço dentro do que o cliente quer. Com o VoePro no ar, o
pedido nasce do negócio no funil e o alerta vira tarefa no card.

**O que isso exige desde já (V1a):** o "o que buscar" é uma **lista de pedidos
de busca** — destino, janela de datas, pessoas, classe, preço-alvo opcional e
**quem pediu** (hoje sempre a agência) — e não uma lista fixa de destinos. Assim
a ideia vira uma etapa nova sem refazer o coletor.

**Ofertas personalizadas por gosto do cliente.** Muitos clientes têm gosto
fixo — por exemplo, os que adoram resort e querem oferta o ano inteiro. O
consultor registra o **perfil de gosto** (tipo de viagem, regime, regiões,
épocas, quem viaja); o motor **cruza cada oferta encontrada com os perfis** e
avisa "isto combina com estes clientes", para o consultor mandar uma mensagem
pessoal. É o pedido de busca permanente. O perfil mora no VoePro (etiquetas do
cliente, etapa 12 — Relacionamento); a entrega por mensagem depende da etapa 9
do VoePro (WhatsApp). O Saulo confirmou: **é para buscar isso também.**

**O que isso exige desde já (V1a e V1b):** cada oferta guarda as
**características que permitem casar com um gosto** — tipo (passagem/pacote),
regime (all inclusive, café…), região/país/cidade, praia ou cidade, categoria
do hotel, se aceita criança, classe — de forma consultável (campos ou
etiquetas), não só como texto de descrição.

**Promoções que chegam por e-mail e WhatsApp.** Fornecedores mandam ofertas
para a agência (e-mail, listas de WhatsApp, PDF de tarifário). Ler a caixa de
e-mail da agência é um caminho legítimo mesmo quando o site do fornecedor tem
anti-robô. O Saulo (V3a, 15/10) quer deixar para um segundo momento: "acho que
dá pra tirar coisas boas daqui".

---

## O que cada etapa deixou pronto

_(cada etapa acrescenta aqui, ao terminar, o que a próxima precisa saber)_

### O0 — Fundação (entregue só no computador, 11/10/2026)

**Mudança de rumo do Saulo no fim da etapa:** ele prefere ver o sistema
encontrando ofertas antes de plugar a estrutura. Então a O0 fecha **rodando
local** — nada foi publicado na Vercel, nenhum repositório foi criado no
GitHub, nada foi instalado no computador dedicado. Todo o código dessa parte
existe e foi testado aqui; só não foi ligado. Lista completa no fim desta
seção.

**Decisões do Saulo nesta etapa**

- Banco: **produção** (`milespro-production`) para o motor e o painel
  publicados; as sessões de construção testam no banco de **testes**
  (`milespro-staging`). Os dois já têm a sala pronta (ver abaixo).
- Nome: **SRR Ofertas**. Endereço: **`ofertas.srrviagens.com.br`** (domínio
  na HostGator).
- Login: **nenhum por enquanto** (só o Saulo usa). Ficou escrita a regra:
  **antes de qualquer tela com custo, margem, fonte ou botão, entra a
  proteção** (senha única ou o login do VoePro, quando existir — a etapa 8
  do VoePro ainda não começou). O painel está fora dos buscadores
  (`robots`), o que não é proteção.
- Computador dedicado: Windows, Wi-Fi, energia cai às vezes, sem nobreak
  (recomendado um). Instalação por **pen drive com instalador de duplo
  clique** (sem Claude Code lá).
- Atualização do motor: **automática**, só do ramo `main` (onde só entra o
  que o Saulo aprovou), com volta sozinha para a versão anterior.
- Semáforo: passada a cada 60 s; amarelo após 3 min sem sinal; vermelho após
  10 min. Tudo em `ofertas.configuracao`.

**O que existe** (detalhes no [README do projeto](../../README.md))

- **Banco**, nos dois projetos do Supabase: o papel **`srr_ofertas`**, dono só
  do schema `ofertas` — conferido no banco (`npm run banco:conferir`): não lê
  nem escreve nada em `public` (MilesPro) nem em `crm` (VoePro), não cria
  schema nem banco, consulta de no máximo 60 s. Tabelas (migração
  `20261011033011_fundacao`, aplicada nos dois):
  `motor_trava` (uma linha; quem trabalha, até quando, batimento, contador de
  passadas), `motor_instancia` (cada motor que subiu), `passada` (cada
  passada: começo, fim, duração, ok/erro), `motor_evento` (subiu, assumiu,
  perdeu, parou, sem configuração, aviso do vigia) e `configuracao`
  (chave/valor com descrição; 5 chaves). Na produção as tabelas estão vazias.
- **Motor** (`src/motor/motor.ts`): uma passada por intervalo, que hoje só
  prova que roda (`SELECT 1`). **É aqui que a O2 pendura a coleta** — a função
  `passada()`, no lugar do `SELECT 1`.
- **Trava** (`src/lib/motor/trava.ts`): um motor por vez, renovada a cada
  20 s, prazo de `motor.trava_validade_s` (180 s), relógio do banco.
- **Configuração** (`src/lib/configuracao.ts`): catálogo das chaves válidas;
  sem valor padrão no código. Chave nova = migração que já insere o valor.
- **Vigia** (`instalador/vigia.mjs`) e **instalador** (`instalador/*.ps1`,
  `*.cmd`, `LEIA-ME.txt`) prontos, para quando for ligar tudo.
- **Painel**: a tela de Saúde em `/`, com a marca do VoePro, atualizando a
  cada 10 s, no claro e no escuro, no computador e no celular.

**Como rodar localmente** (banco de testes)

1. `npm install`. O `.env` já existe neste computador (aponta para o banco de
   testes). Em outro computador: `npm run banco:preparar -- --alvo testes
   --sql-em sala.sql`, rodar o `sala.sql` como administrador — **isso troca a
   senha do papel no banco de testes** —, e `npx prisma migrate deploy`.
2. Painel: `npm run dev` → <http://localhost:3000>.
3. Motor, noutro terminal: `npm run motor`. Ctrl+C desliga com calma.
4. No terminal: `npm run saude`.

**Provado no banco (e na tela), não só no código**

- Dois motores ao mesmo tempo: só um trabalhou; derrubado o primeiro à
  força, o segundo assumiu sozinho em 3 min (o prazo da trava).
- Sem `.env`: o motor não sobe e diz "Falta no arquivo .env: DATABASE_URL"
  (código 78). Chave apagada da configuração com o motor rodando: ele para e
  diz qual chave falta; o vigia espera 5 min e, com a chave de volta, o motor
  volta sozinho.
- Num "computador dedicado de mentira" (pasta temporária + cópia do
  repositório fazendo papel de GitHub): o vigia preparou a 1ª versão em 1 min,
  religou o motor derrubado em 5 s, instalou sozinho duas versões novas e, com
  uma **versão quebrada de propósito**, voltou sozinho para a anterior depois
  de 3 quedas e a marcou para nunca mais tentar. Com a identidade fixa
  (`MOTOR_ID`), o motor religado retoma a trava em 1 s.
- Motor parado: a Saúde ficou amarela aos 3 min e vermelha aos 10 min.
- `npm run check` passa.

**Para a O2 saber**

- **Migração nova:** o papel não pode criar banco, então `prisma migrate dev`
  não funciona. Use `npx prisma migrate diff --from-config-datasource
  --to-schema prisma/schema.prisma --script -o prisma/migrations/<UTC>_nome/migration.sql`
  com o `.env` no banco de testes, confira o `grep` do schema, e
  `npx prisma migrate deploy`. **Nunca** ponha `CREATE SCHEMA` na migração.
  Para a produção: `set -a; . ./.env.producao; set +a; unset PGBOUNCER_URL;
  npx prisma migrate deploy` (até a Vercel e o vigia fazerem isso sozinhos).
- **`"type": "module"`** no package.json: scripts `.ts` podem usar `await` no
  topo; scripts `.mjs` continuam iguais.
- O cliente do Prisma (`src/lib/prisma.ts`) só nasce na primeira consulta: o
  build não precisa de banco, e o motor confere o `.env` antes de importar
  qualquer coisa do banco (veja os `await import` no começo de `principal()`).
- A passada não pode passar de `motor.trava_validade_s` sem batimento — o
  batimento é independente (a cada 20 s), mas se a coleta travar o processo
  (laço síncrono), a trava vence. Coleta com prazo, sempre (lição 9).
- **Next 16.3.8**, não 16.3.4: a 16.3.4 tem falhas de segurança publicadas
  (uma crítica, em `next/og`). Vale avisar a sessão do VoePro.
- `npm audit` ainda aponta 3 itens em ferramentas de desenvolvimento do
  Prisma 7.10.0 (fixado de propósito); nenhum vai para o painel.

**Deixado para a etapa de ligar tudo**

1. **GitHub:** criar o repositório privado `srr-ofertas`, `git remote add
   origin`, enviar `main` (o login é do Saulo, pela janela do Git).
2. **Vercel:** projeto `srr-ofertas` na conta Pro, ligado ao GitHub; variáveis
   `DATABASE_URL` e `PGBOUNCER_URL` (Production = `.env.producao`; Preview =
   banco de testes), postas pelo comando da Vercel sem passar por chat. O build
   já está pronto (`vercel.json` → `scripts/vercel-build.mjs`, que migra).
3. **Domínio:** `ofertas.srrviagens.com.br` no projeto da Vercel + a linha CNAME
   na HostGator (o Saulo adiciona).
4. **Computador dedicado:** `npm run pacote:instalador` (precisa do GitHub) →
   pen drive → "Instalar SRR Ofertas" → colar a chave de leitura no GitHub →
   passo da BIOS ("ligar quando a energia voltar") e teste de reiniciar sem
   entrar no Windows. Conferir pelo atalho "Conferir SRR Ofertas".
5. **Provas que só a máquina real dá:** voltar sozinho depois de reiniciar o
   computador e depois de tirar da tomada; Wi-Fi conectando antes do login;
   o Agendador religando o `iniciar.cmd`. Instalador, conferir e desinstalar
   foram conferidos na sintaxe e por partes (chave de leitura, regras da
   tarefa), mas **não rodaram de ponta a ponta** — isso mexe no Windows.
6. **Login / senha do painel:** obrigatório antes de qualquer tela com custo,
   margem, fonte ou botão (O6/O7).
7. **Senha do papel na produção:** está em `.env.producao`, só neste
   computador. Se esse arquivo se perder, rode de novo `banco:preparar --alvo
   producao` (gera senha nova) e o SQL.

### V1a — Vitrine: passagens (entregue só no computador, 11–12/10/2026)

**Decisões do Saulo nesta etapa**

- Custo em milhas Smiles pela tarifa **Clube** (caixa "Clube" do programa, em Valores).
- Smiles **por endpoint**: só o **calendário aberto**, com **taxa estimada**
  (Valores) e aviso na tela. A busca completa e a taxa de embarque ficam atrás
  do Akamai; o caminho pelo Edge com janela foi **removido na revisão** (usar um
  acesso porque ele passa pela proteção é contorná-la — regra da casa). O
  caminho legítimo é pedir acesso à Smiles: texto pronto em `docs/fontes/smiles.md`.
- Preço do **Melhores Destinos é custo + margem** (como milhas), com as parcelas do link.
- Parcelas: tabela editável; começa com **4× "sem juros" com 10% embutidos**
  (total = venda × 1,10).
- Da sessão de controle: "o que buscar" é uma lista de **pedidos de busca** (com
  dono — hoje "agencia"); a oferta guarda **características consultáveis**
  (etiquetas, regime, estilo…); o **núcleo do coletor é genérico** (não sabe
  que coleta passagem).

**O que existe**

- **Fichas:** `docs/fontes/smiles.md`, `melhores-destinos.md`, `README.md`.
  Migração `…_smiles_sem_navegador`: tira as chaves do detalhe, desliga os 2
  pedidos de executiva (nenhuma fonte dá executiva hoje) e tira da vitrine o que
  veio pela busca completa.
- **Banco** (migração `20261012020244_vitrine`, **aplicada só no banco de
  testes**): `fonte`, `programa`, `lugar`, `busca` (pedidos), `faixa_busca`,
  `margem`, `parcela_taxa`, `coleta`, `oferta` (o molde), `preco_observado`
  (histórico), `busca_agora` (fila do botão) + 23 chaves novas em
  `configuracao`. Cadastro inicial: 2 fontes, 4 programas (**milheiro vazio**:
  quem preenche é o Saulo), 3 faixas (10 meses), margens 15%/R$ 150, 4×10%,
  ~70 lugares, 27 pedidos (15 nacionais de BSB, 10 internacionais de GRU, 2 de executiva).
- **Coletor** (`src/lib/coleta/`): `nucleo.ts` (genérico: executar, registrar
  em `coleta`, vencimento por escopo, pausa de fonte que bloqueia),
  `passagens.ts` (as tarefas), `fontes/smiles.ts`, `fontes/melhores-destinos.ts`,
  `gravar.ts` (o único caminho até o banco), `molde.ts`.
- **Motor:** cada passada (até `coleta.max_segundos_por_passada`) atende o
  "Buscar agora" e depois o que venceu — o mais atrasado (medido em
  intervalos) primeiro, meses próximos antes. Acorda em segundos quando alguém
  aperta "Buscar agora".
- **Painel:** a vitrine em duas abas (`src/app/_componentes/Vitrine.tsx`):
  `/` **Passagens** (filtros de classe e companhia; coluna "Voo" com companhia,
  classe, bagagem, horários/conexões quando a fonte dá, assentos restantes e
  "emitir até"; botões "ver voos" que abrem a busca já preenchida na fonte e no
  Google Flights — só link para a pessoa, o sistema não lê nada de lá) e
  `/pacotes` **Pacotes** (filtros de regime e noites; colunas de hotel, regime,
  ocupação e aéreo; vazia até a V1b). Agrupadas por rota + mês, com custo,
  venda, parcelas, fonte, conferência, "visto há", Buscar agora · `/buscas` (pedidos: adicionar,
  ligar/desligar, tirar, Buscar agora) · `/valores` (milheiro, margens, parcelas,
  faixas, fontes, ritmo) · `/saude` (a da O0). **Sem senha**: antes de publicar,
  a L protege — as ações que gravam estão em `src/app/acoes.ts`.
- `npm run coletas` mostra as últimas coletas e o tamanho da vitrine.

**Provado no banco (e na tela)**

- Primeira hora: ~560 ofertas, ~2.400 preços no histórico, zero erro. Mural do
  MD de BSB: 136 destinos.
- "Buscar agora" BSB→Salvador: 13 buscas em 92 s (3 calendários Smiles, 10
  meses do MD); clicar de novo não duplica (índice único parcial).
- Depois da revisão: passada sem navegador, calendários da Smiles ok
  (ex.: BSB→REC jan–mar, a partir de 27.700 milhas + taxa estimada).
- Dois motores ligados (sem querer: no Windows, parar o `npm` não derruba o
  processo filho): só um trabalhou, o outro esperou a vez. **Desligue o motor
  com Ctrl+C no terminal dele.**
- `RADAR_SIMULAR_FALHA=smiles`: cada coleta da Smiles registrou erro, o MD
  seguiu (69 coletas ok) e as passadas continuaram "ok".
- `npm run check` passa.

**O molde de oferta (`ofertas.oferta`) — para a V1b, a V2 e a V3.x**

Uma linha = uma coisa vendável, **por pessoa**, como foi vista por último. Toda
fonte entrega `OfertaNova` (`src/lib/coleta/molde.ts`) e grava por
`gravarOfertas` (`gravar.ts`) — nunca por outro caminho.

| grupo | campos | observação |
|---|---|---|
| identidade | `chave` (única), `fonte_id`, `busca_id`, `coleta_id`, `tipo` (passagem/pacote), `detalhe` (mes/dia/voo) | chave = fonte·tipo·origem·destino·classe·datas (pacote soma hotel·regime·adultos·crianças): vista de novo, atualiza |
| rota | `origem`, `destino` (+ cidade, UF, país, região), `internacional` | o que a fonte não diz, `gravar` completa pelo cadastro `lugar` |
| quando | `mes` ("2027-03", obrigatório), `ida`, `volta`, `noites`, `composicao` (ida_volta · soma_trechos · so_ida) | nunca apresentar soma de pernas em dinheiro como ida e volta |
| preço | `programa_id` + `milhas` (+ `milhas_normal`) + `taxas_brl` (+ `taxas_estimadas`) **ou** `preco_brl`; `preco_referencia_brl`; `parcelas_fonte` | por pessoa, ida + volta |
| voo | `classe`, `companhias[]`, `companhia_nome`, `bagagem` (+ qtd); ida/volta: saída, chegada (hora local do aeroporto, `timestamp` sem fuso), paradas, duração, voos; `assentos` | o que a fonte não der fica `null` |
| **pacote** | `hotel_nome`, `hotel_categoria`, `regime` (all_inclusive · pensao_completa · meia_pensao · cafe · sem_refeicao), `adultos`, `criancas`, `aceita_crianca`, `estilo` | **a V1b preenche aqui**; `tipo = 'pacote'`, `composicao = 'ida_volta'` |
| gosto do cliente | `etiquetas[]` (índice GIN): direto, bagagem, executiva, milhas, internacional, o regime, o estilo | `etiquetasDeduzidas()` acrescenta as óbvias; a fonte pode pôr outras (palavras fixas) |
| conferência (revalidação) | `conferida_em`, `conferencia_resultado` (ok · mudou · esgotou · nao_deu), `conferencia_anterior`, `conferencia_valor`, `conferencia_variacao` (%), `conferencia_motivo`, `localizador` (JSON para achar a mesma oferta de novo na fonte), `emitir_ate` | grave só por `registrarConferencia()` (`gravar.ts`): esgotou → sai da vitrine; mudou → atualiza o preço e marca a variação; não deu → sem selo. `podeSerAprovada()` só aceita ok/mudou (a V4 usa). Se a coleta vê preço diferente, o selo antigo cai. Migração `…_conferencia` (só no banco de testes) |
| vida | `vista_primeira_em`, `vista_em`, `detalhada_em`, `ativa`, `fornecedor`, `link`, `dados_fonte` | `desativarAusentes()` tira da vitrine o que a fonte, buscada de novo, não mostrou; a faxina tira o que passou de `ofertas.validade_horas` |

**Preço** (`src/lib/ofertas/preco.ts`, `precificar()` — use sempre esta):
custo (milhas ÷ 1000 × milheiro + taxas, ou o preço em R$) → venda (se a fonte
`aplica_margem`: custo + o maior entre % e mínimo da margem do tipo — nacional,
internacional, executiva, **pacote**; se não, venda = preço da fonte) →
parcelas (as da fonte, se ela oferece e não aplica margem; senão "N× sem
juros" pela tabela). Faltou valor → `faltas[]`, e a tela diz o quê.

**Para a V1b plugar os pacotes**

- Fonte em `ofertas.fonte` (migração): `tipo = 'operadora'`,
  `aplica_margem = false` (RAV embutida → o preço é a venda); `parcelas_fonte`
  em cada oferta.
- **Bloqueio aéreo da Cativa entra como PASSAGEM**: `tipo = 'passagem'`,
  `composicao = 'ida_volta'`, `assentos`, `emitir_ate`, voos em
  `ida_voos`/`volta_voos`, e o `localizador` com o voo. Pacote: `localizador`
  com código do pacote, origem, destino, datas e hotel.
- Conector em `src/lib/coleta/fontes/`; tarefas no padrão de `passagens.ts` (ou
  num `pacotes.ts` irmão sobre `nucleo.ts`), chamado pelo motor ao lado de
  `coletarPassagens`. Escopos próprios (`pac:…`).
- A aba **Pacotes** já existe (`tipo = 'pacote'`), com colunas de hotel,
  categoria, regime, ocupação e aéreo, e filtros de regime e noites: basta gravar
  as ofertas no molde. Os **bloqueios aéreos** vão como `tipo = 'passagem'` e
  aparecem em Passagens, com assentos e "emitir até" visíveis e "(da fonte)" nas
  parcelas da operadora.
- `docs/fontes/README.md` nasceu aqui; a V1b acrescenta as linhas dela.

**Para a V2 (nota)**

- Histórico em `preco_observado`, um registro por item por dia (menor e último
  do dia): `trecho` (Smiles, cada dia, cada sentido, milhas Clube), `ida_volta`
  e `mes` (MD, R$). O calendário da Smiles também manda `priceRange`/`Quartil`
  (a faixa "normal" dela) — não guardado ainda; ver a ficha.
- Preferências de voo: `ida_saida`/`volta_saida` (hora local), paradas,
  duração, bagagem — só nas ofertas `detalhe = 'voo'`.

**Para a V3.x (fonte nova):** ficha em `docs/fontes/`, conector que devolve
`OfertaNova`/`PrecoNovo`, tarefas com escopo e intervalo, linha em `fonte`.
Requisição sempre por `pedirJson` (prazo, contagem, "bloqueado" em 403/406/429).

**Ficou de fora / atenção**

- Pedido com destino **país/região** existe na tabela, mas o motor só busca
  destino **cidade** por enquanto.
- **Executiva: nenhuma fonte dá hoje** (o calendário da Smiles e o MD são
  econômica). Os pedidos de executiva ficam guardados e desligados; voltam com
  uma fonte nova (V3.x) ou com o acesso oficial da Smiles.
- Smiles sem horário, voo, conexões, bagagem nem taxa real: as ofertas dela são
  `detalhe = 'dia'` com taxa estimada. As preferências de voo da V2 só valem
  para fontes que derem esses campos.
- O mural do MD (descoberta além dos pedidos) guarda a lista de cidades **na
  memória do motor**: religado, ele varre o mural de novo antes.
- **Produção:** a migração `vitrine` ainda não foi aplicada lá.
- **Falta o Saulo preencher o milheiro Smiles** (Valores): sem ele, as ofertas
  em milhas aparecem com "falta preço do milheiro" e vão para o fim da lista.

### V1b — Pacotes, fase 1 parte A: investigar sem login (11/10/2026)

**Decisões do Saulo:** primeiro todos os caminhos **sem login**; o login vem
depois (parte B). Na Hoteldo a SRR compra o **pacote aéreo + hotel montado
lá**. Na Cativa, trazer **pacotes e bloqueios aéreos** (o bloqueio entra como
**passagem** no molde da V1a). Destinos de teste: **resorts do Nordeste**.

**O que se achou** (fichas em [`docs/fontes/cativa.md`](../fontes/cativa.md) e
[`docs/fontes/hoteldo.md`](../fontes/hoteldo.md)):

- **Cativa — construir já**, pelo site aberto **viajandocomdesconto.com** (o
  link que o Saulo trouxe). Uma página estática de 5 MB traz em JSON **todos**
  os pacotes (467; cada saída com até 3 hotéis, regime, preço **por pessoa em
  quarto duplo**, taxa, **10x sem juros**) e **todos os bloqueios aéreos**
  (10.871 ida-e-volta reais, com assentos, companhia, horários e prazo de
  emissão). Sem login, sem anti-robô. De BSB para o Nordeste hoje: 127
  opções de pacote (14 all inclusive) e 782 bloqueios. O preço é o público,
  de venda (RAV embutida — confirmar na parte B) e pode ter semanas: **a
  revalidação na aprovação precisa do portal logado ou da API**.
- **Hoteldo — nada sem login.** É a rede B2B da Despegar; o site recusa
  programas (403 + "verificação do dispositivo") e o `robots.txt` proíbe
  robôs em pacotes/hotéis. Caminho recomendado: **API oficial (XML)**. Robô no
  login é arriscado (a Despegar barra programas).
- **Textos de pedido de API** prontos nas duas fichas, para o Saulo mandar.

**Provas** (rodam direto no Node 24, sem instalar nada, sem banco):
`node scripts/provas/cativa-vitrine.ts` (opções `--origem`, `--regiao
todas`, `--tipo pacotes|bloqueios`, `--so-ai`, `--json`) e
`node scripts/provas/hoteldo-aberto.ts`.

**Para a parte B e a fase 2 saberem**

- O bloqueio da Cativa é um ida-e-volta de verdade, com preço por data:
  serve de **calendário** para o preço normal (V2) nas rotas onde há
  bloqueio. O pacote tem **uma** data com preço + "outras datas" sem preço.
- Pacote = pacote × saída × **hotel** (o preço é por hotel). O molde da V1a
  precisa caber: hotel, regime, noites, preço por pessoa em quarto duplo,
  taxa, parcelas da fonte, o que inclui, "cotado em", política de criança.
- O conector deve perguntar "mudou?" (`ETag`) em vez de baixar 5 MB toda
  vez, e avisar na Saúde se a página parar de ser republicada.
- Características de gosto do cliente (pedido da sessão de controle): a
  Cativa dá regime e criança grátis por hotel; **não** dá estrelas nem tipo
  de quarto (só duplo). Tabela completa na ficha.
- Ainda **não** existe `docs/fontes/README.md` (resumo de todas as fontes):
  a V1a também investiga fontes; quem juntar faz o resumo, para não colidir.

### V1b — Pacotes, fase 1 parte B: portal logado e caminho comercial (11/10/2026)

**Decisões do Saulo:** o viajandocomdesconto é **canal oficial da Cativa** e
vira a fonte principal; os **bloqueios entram na vitrine** junto com os
pacotes (como passagem ida e volta, com assentos e prazo); conferir preço
**não pode ser manual** — revalidador automático; **usuário só do robô** no
portal; quando a oferta muda: **esgotou sai, preço mudou atualiza e marca**;
na Hoteldo, só observar o portal e buscar o caminho comercial.

**O que se achou** (fichas [cativa.md](../fontes/cativa.md),
[hoteldo.md](../fontes/hoteldo.md) e o desenho
[revalidador-cativa.md](../fontes/revalidador-cativa.md)):

- **Cativa, portal do agente (Infotravel):** login com código por e-mail às
  vezes (cookie de "dispositivo conhecido"), sessão cai em ~58 min parada. O
  Saulo pode criar o usuário do robô em *Profissionais → Adicionar*. O portal
  é JSF antigo: **sem chamada de dados limpa**. Busca de pacote só por **data
  exata** (~20 s; estrelas, regime, tipo de quarto, quartos disponíveis,
  preço por pessoa com taxas). Tela **Bloqueios de voo** confere uma rota
  inteira num período (~5 s, com lugares disponíveis e deadline).
- **Medido:** os bloqueios do viajandocomdesconto **batem exatamente** com o
  portal; o pacote Enotel 17–24/11 estava **4% mais caro** no portal. O
  revalidador é necessário para pacote.
- **Revalidador — recomendação: A) navegador-robô agora** (único seguro para
  pacote no portal JSF), **C) API Infotravel quando a Cativa liberar**. O
  resultado e o "quando" são iguais nas três alternativas. **Não houve prova
  de revalidação** nesta fase: o login tem código por e-mail e o usuário do
  robô ainda não existe — fica para a fase 2, com o Saulo pondo as
  credenciais no `.env`.
- **Divulgação da SRR na Cativa:** artes PNG prontas com a marca da SRR,
  por embarque — guardar para a **V4** (card).
- **Hoteldo:** existe **API B2B oficial com documentação pública**
  (api-docs.despegar.com: hotéis com estrelas, regime, tipo de quarto,
  idade das crianças, comissão e "tarifa pública mínima"; voos; um serviço
  de variação de preço; e um **MCP** para agentes de IA). **Pacote pela API
  ainda não existe** ("em desenvolvimento"). O portal (inclusive o endereço
  da SRR) tem anti-robô DataDome e `robots.txt` proibindo a busca: **não é
  caminho para robô**. Texto do pedido ao gerente comercial pronto, com o
  volume de emissão da SRR em branco para o Saulo preencher.

**Para a fase 2 saber**

- O molde da V1a precisa guardar, por oferta: quando foi conferida, preço
  conferido, resultado (ok / mudou / esgotou / não deu), variação; e o que
  acha a oferta no portal (código do pacote — vem no link de orçamento —,
  origem, destino, datas, hotel; para bloqueio, o voo).
- Um **de-para de destinos** viajandocomdesconto → lista do portal (233
  destinos saindo de BSB).
- O navegador-robô é dependência nova (Chrome do robô, ~150 MB) no
  computador do motor.
- Do Saulo, antes de ligar o revalidador: o usuário do robô criado no portal
  com o e-mail da operação; usuário e senha no `.env`; e acesso de leitura à
  caixa desse e-mail (provedor + senha de aplicativo), para o robô ler o
  código.

### V3a — Investigar Pátria, Azul Viagens e Expedia TAAP (15/10/2026)

**Decisões do Saulo:** na Pátria interessam **passagens**; na Expedia, **hotel
e resort fora do Brasil**; na Azul Viagens não precisa de login para buscar.
No meio da etapa (via sessão de controle): **Pátria fica para depois** (é
consolidadora, a tarifa é a mesma do Melhores Destinos e a homologação na
Wooba não compensa agora), **Expedia TAAP também**, e por fim **Azul Viagens
também** — **a V3a foi encerrada com as três fontes seguradas pelo Saulo**
(veredito "depois" em todas; o caminho e o texto do pedido ficaram em cada
ficha, para quando ele quiser retomar). Ler e-mail/WhatsApp de promoções:
segundo momento (está em "No radar").

**O que se achou** (fichas em `docs/fontes/`):

- **Azul Viagens — depois; quando voltar, pedir a API do Juniper.** O site roda no Juniper. A busca
  de pacote é aberta para gente e devolve um JSON completo (BSB→Maceió,
  18–23/02/2027: 55 hotéis, R$ 5.178 a R$ 23.696 para dois, voo Azul com
  número e horários, estrelas, regime, preço por pessoa e do pacote, taxas,
  bagagem, cancelamento, valor em pontos TudoAzul). **Mas tem o anti-robô da
  Akamai:** por programa, a 1ª busca passou e as seguintes ficaram presas 60 s
  sem resposta. **Não é caminho para robô.** O Juniper tem **API oficial de
  pacotes** (`PackageAvail` busca; `PackageCheckAvail` confere preço e vaga =
  revalidador), documentação pública em api-edocs.ejuniper.com; quem pede a
  integração ao Juniper é a Azul Viagens. **Texto do pedido pronto** na ficha.
  O menu "Bloqueios" da Azul não tem saída de Brasília hoje.
- **Pátria — depois.** Consolidadora; portal Travellink com reCAPTCHA; o
  caminho é a API Travellink da Wooba (homologação + credencial da Pátria).
  Ficha curta com o que já se sabe e os motivos para retomar.
- **Expedia TAAP — depois.** Nada sem login, login com CAPTCHA (Arkose),
  robots.txt proibindo as buscas, e a plataforma desafia programas (429 "Você
  é ou não um robô?"). Caminho: Rapid API da Expedia Partner Solutions
  (aprovação caso a caso, expectativa baixa). Pedido guardado na ficha.

**Provas** (Node 24, sem instalar nada, sem banco):
`node scripts/provas/azul-viagens-aberto.ts`,
`node scripts/provas/expedia-taap-aberto.ts`,
`node scripts/provas/patria-wooba.ts` (parte aberta hoje; com a credencial no
`.env`, busca voos — essa parte foi escrita pela documentação e **não rodou**
contra a API).

**Para a V3.x da Azul Viagens saber (se o Saulo retomar e a API chegar)**

- Fonte `tipo = 'operadora'`, `aplica_margem = false` (preço público de venda;
  confirmar na API se vem comissão). Pacote no molde da V1b (`tipo =
  'pacote'`, hotel, estrelas, regime, noites, adultos/crianças) com o voo do
  pacote em `ida_voos`/`volta_voos` (a Azul dá número, horário e conexões).
- Busca por **data exata**, não por mês: cobrir poucas datas por pedido, com
  teto combinado com a Azul.
- Parcelas: a busca não traz; ver na API ou deixar como configuração.
- Na homologação, comparar o mesmo pacote no site (pessoa) e na API.
- A API do Juniper é XML (SOAP); a `pedirJson` de hoje só faz GET de JSON —
  o conector precisa de um irmão para XML/POST, no mesmo padrão (prazo,
  contagem, "bloqueado").
- Um conector Juniper serve a **qualquer operadora em Juniper** ("Powered by
  Juniper" no rodapé).

**Ficou de fora / atenção**

- Parte logada da Expedia e da Pátria: não observada (as duas saíram da etapa).
- Nenhuma das três tem caminho legítimo para robô hoje: **nada novo entra na
  vitrine** por esta etapa. Os textos dos pedidos estão prontos nas fichas;
  mandar ou não é decisão do Saulo.
