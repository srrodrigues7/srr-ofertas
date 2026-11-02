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
| V1b  | [Vitrine: pacotes](V1b-vitrine-pacotes.md) — Cativa e Hoteldo: investiga em paralelo à V1a, depois pluga os pacotes no molde dela | O0 (investigar), V1a (plugar) | alto | **aprovada**; **a vitrine da Cativa está quebrada desde 22/10** (o site mudou de formato): plano de correção C1 no fim deste arquivo, espera o "sim" |
| V2   | [A nota](V2-a-nota.md) — réguas de preço bom (boa/imperdível), preço normal da rota, preferências de voo, nota 0–100 com o motivo, imperdíveis em destaque | V1b | alto | **aberta** |
| V3a  | [Investigar Pátria, Azul Viagens e Expedia](V3a-investigar-patria-azul-expedia.md) — só investigação | — | alto | **encerrada** — as três seguradas pelo Saulo |
| V3.x | Uma fonte por vez, da lista do Saulo — investigar, plugar e ver na tela | V1 | médio (alto se a fonte for difícil) | esperando |
| V4   | [Aprovação, card e legenda](V4-card-e-aprovacao.md) — aprovar com conferência, código de rastreio, arte e legenda prontas para postar (em paralelo com a V2) | V1b | alto | **aberta** |
| V5   | Robô do Telegram — aviso de oferta de nota alta, atalho para aprovar | V4 | médio | esperando |
| V6   | [Alertas do WhatsApp](V6-alertas-whatsapp.md) — cada alerta do grupo "Alerta Passagens CPM" vira oferta, com preço pelo milheiro da SRR | V1b | alto | **aprovada** (30/10, no main). Na produção, 0 ofertas até agora: **não é defeito** (nada novo no grupo desde sexta 30/10; ver C2 no fim deste arquivo). Prova com o grupo de verdade: primeiro dia útil, 03/11 |
| L0   | [Painel no ar](L0-painel-no-ar.md) — o painel publicado na Vercel, com o login do MilesPro e a lista de liberados, no banco de **produção**; motor segue no computador do Saulo | V6 | médio (subiu para alto: login e produção) | **construída e publicada** (01/11, `ofertas.srrviagens.com.br`; publicação conduzida pelo Guardião da fusão). **Atenção: o "Sair" do Radar desloga de todos os sistemas** (C3, no fim deste arquivo) |
| L    | [Radar dentro do VoePro](L-radar-no-voepro.md) — `voepro.srrviagens.com.br/ofertas`, com o login do VoePro (fase 1b do FUSAO) | L0 | alto | **especificação escrita** (02/11); espera as respostas do Saulo e o "sim" do plano |
| L2   | Ligar o resto — motor num computador dedicado, sempre ligado; avisos de saúde no celular | L0 | alto | esperando (proposta na spec da L, pergunta 4) |
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
O0 ─► V1a + V1b ─┬─► V2 ─┐
                 ├─► V4 ─┴─► V5
                 └─► V3.x (fontes seguradas pelo Saulo)
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

- ~~**Projeto irmão**~~ **superada em 31/10/2026.** Palavras do Saulo: "eu não
  enxergo o radar como um terceiro sistema, é uma ferramenta dentro do VoePro;
  a pessoa dá um clique no menu do Radar e ele aparece". O código continua
  neste repositório e o papel de banco `srr_ofertas` continua (segurança
  técnica), mas o destino é `voepro.srrviagens.com.br/ofertas`, com o mesmo
  usuário do VoePro e do MilesPro. Mapa e riscos da fusão:
  `C:SERSSAULOPROGRAMINGusaousao.md`.
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

**Bloqueio aéreo junto com hotel (Cativa).** O Saulo (12/10): o bloqueio
ganha muito mais sentido **ligado a um resort ou hotel**. Na fase 2 ele entra
sozinho, na aba "Passagens"; ligar ao hotel é a melhoria. O bloqueio já vem
de graça na leitura do viajandocomdesconto, com preço por data e lugares.
Duas melhorias possíveis: (a) no pacote pronto,
dizer "mais datas com voo de bloqueio a partir de R$ X"; (b) montar **resort +
bloqueio** pela aba "Monte Pacote" do portal da Cativa — bem mais consultas e
mais risco para a conta, decidir com números na mesa.

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
8. **Motor órfão no Windows:** parar o `npm run motor` (ou o processo pai) **não derruba o `node` filho** — o motor continua vivo, segurando a trava (visto em 14/10, processo de ~750 MB). No computador dedicado, o vigia e o desinstalador precisam encerrar a **árvore** de processos (`taskkill /T`), e o README deve ensinar a parar o motor de verdade.

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

**Decisão final do Saulo para a fase 2 (confirmada por ele em 13/10/2026):**
o painel de ofertas tem **duas abas** (a V1a está fazendo a divisão):
**"Pacotes"** recebe os pacotes prontos da Cativa; **"Passagens"** recebe os
**bloqueios aéreos da Cativa** (ida e volta, com assentos restantes e "emitir
até"), ao lado das passagens da Smiles e do Melhores Destinos. Isto substitui
a anotação de 12/10, que tirava os bloqueios da vitrine. "Bloqueio + hotel"
continua em **No radar**, como melhoria futura.

### V1b — fase 2: a Cativa na vitrine e o revalidador (entregue só no computador, 14/10/2026)

**Decisões do Saulo nesta fase:** preço de pacote e bloqueio = **total por
pessoa com a taxa** (as parcelas sobre o total); e-mail da operação no
**Gmail**; até a V2, o robô confere sozinho as **3 mais baratas de cada
destino** + botão **"Conferir agora"**; saídas = **BSB tudo + internacional de
GRU/GIG**. A **Hoteldo ficou de fora** (sem chave de API — decisão do Saulo
via sessão de controle): nada construído, nenhum aviso dela na tela.

**O que existe** (detalhes em [cativa.md](../fontes/cativa.md) e
[revalidador-cativa.md](../fontes/revalidador-cativa.md))

- **Banco** (migração `20261015015437_cativa`, **aplicada só no banco de
  testes**): fonte `cativa` (operadora, sem margem), `conferencia_pedido` (a
  fila do "Conferir agora", com trava contra clique duplo), `fonte_acesso` (o
  estado do login do robô) e 12 chaves novas (`cativa.*`, `revalidador.*`).
- **Coletor:** `src/lib/coleta/fontes/cativa.ts` + `src/lib/coleta/pacotes.ts`
  (irmão de `passagens.ts`), chamado pelo motor depois das passagens.
  `npm run cativa` roda uma leitura à mão.
- **Revalidador:** `src/lib/revalidador/` — o robô no portal (Edge do Windows,
  invisível, `playwright-core` 1.63.0), o leitor do código no Gmail
  (`imapflow` 2.0.6, só leitura) e o organizador, chamado pelo motor depois da
  coleta. Sem as credenciais fica **desligado** e a Saúde diz o que falta.
- **Painel:** pacotes agrupados pelo destino do pacote (não pelo aeroporto);
  "aéreo incluso", "criança grátis", "(com taxa de R$ X)"; botão "Conferir
  agora" nas ofertas de fonte com portal; "emitir até" no relógio de Brasília
  (corrigido: mostrava a hora de Greenwich; quando a fonte só dá o dia, mostra
  só o dia); a linha do voo não mostra mais "null paradas". Saúde: bloco
  **Operadoras**.
- **Regra nova no `gravar.ts`:** conferência que corrigiu o preço vale sobre
  o preço velho que a fonte da vitrine ainda repete (evita o vaivém).

**Provado no banco (e na tela)**

- Leitura da Cativa: 216 pacotes e 781 bloqueios na vitrine (BSB + GRU
  internacional), 1 requisição, ~30 s; "mudou?" funcionando (página igual =
  não baixa de novo). Exemplos: Enotel all inclusive 17–24/11 R$ 9.949 (10x
  da Cativa), agrupado em Porto de Galinhas, Nordeste, praia; GOL BSB–Recife
  R$ 719 com taxa, horários, 20 assentos, "emitir até".
- Motor com o código novo: passada 47 ok com "Cativa: vitrine lida" e o
  revalidador atendendo o "Conferir agora" ("falta configurar o login do
  robô"); passada 48 sem a Cativa (só vence de 3 em 3 h).
- Revalidador: 16 testes das leituras com o texto real do portal; o Edge
  invisível abre o portal e acha os campos de login.
- `npm run check` passa.

**Ficou de fora / atenção**

- **O revalidador não rodou de verdade no portal**: falta o Saulo (1) criar o
  usuário do robô (Profissionais → Adicionar, Vendedor agência, e-mail da
  operação), (2) criar a senha de app do Gmail da operação e (3) pôr as 4
  linhas no `.env` (modelo no `.env.example`). A tela do código (`auth.xhtml`)
  nunca foi vista por dentro: o primeiro login pode pedir ajuste.
- **Motor órfão no Windows:** parar o terminal do motor da V1a deixou o
  processo vivo (9676) segurando a trava; a sessão de controle encerrou à
  mão. Para a etapa L: o vigia/instalador precisa garantir que não sobra
  motor órfão.
- Bloqueio parcela em **6x sem juros** (condição da Cativa para passagem
  aérea, lida no orçamento dela); pacote em 10x.
- **"Abrir na Cativa"** abre o orçamento da saída (pacote e datas certos), mas
  com UM hotel: nas saídas de 2–3 hotéis, as outras linhas abrem o orçamento
  com o hotel da Cativa (ver a ficha). A tela diz "por pessoa · quarto duplo"
  / "por pessoa · ida e volta" no preço e nas parcelas.
- Pacotes com mais de um destino (Cartagena + San Andrés, Peru + Colômbia)
  ficam fora: a Cativa não diz o destino.
- **Produção:** a migração `cativa` ainda não foi aplicada lá.

**Para a V2 saber**

- Os bloqueios da Cativa vão para `preco_observado` (ida_volta, R$, por par
  de datas): calendário de preço normal nas rotas com bloqueio.
- Pacote não grava histórico ainda (o preço depende do hotel); se a V2 quiser
  "preço normal" de pacote, a chave natural é destino do pacote + regime +
  noites + mês.
- O revalidador confere "as N mais baratas por destino": troque essa escolha
  (`enfileirarAutomaticas` em `revalidador.ts`) por "as N de nota mais alta".

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

### V6 — Alertas do WhatsApp (entregue só no computador, 30/10/2026)

**Decisões do Saulo nesta etapa**

- **O radar lê o arquivo do monitor; o monitor não é tocado** (nenhum arquivo
  dele foi editado, nada foi instalado nele, ele não foi reiniciado).
- Só **Smiles, Azul e LATAM**; o **Azul Pelo Mundo tem milheiro próprio**
  (programa separado). Origem: BSB sempre; GRU/GIG só internacional.
- **Uma oferta por mês de ida, com todas as datas** (ida do mês + todas as
  voltas depois) — o cliente escolhe a combinação.
- **O preço é o nosso** (milheiro + margem). Sem a taxa em reais, o preço sai
  "R$ X **+ taxas**" e a equipe confere a taxa antes de postar. O valor em
  reais que o grupo anuncia é **só referência da equipe**. (O Saulo chegou a
  sugerir usar o valor do grupo; com a regra do TSM na mesa, escolheu "o nosso
  + taxas a conferir".)
- Conferência: Smiles econômica pelo **robô** (calendário aberto da Smiles);
  Azul, LATAM e Smiles executiva pelo **"Conferi"** da equipe.

**O que existe** (ficha em [`docs/fontes/alerta-cpm.md`](../fontes/alerta-cpm.md))

- **Banco** (3 migrações, **só no banco de testes**, escritas à mão — ver
  abaixo): `alerta_mensagem` (cada mensagem do grupo, com resultado e motivo),
  `alerta_ponte` (o último contato com o monitor), `alerta_origem`,
  `alerta_programa` (nome no alerta → programa nosso; vazio = fora),
  `fonte.taxas_a_conferir`, fonte `alerta_cpm`, programa `azul_pelo_mundo`
  (milheiro vazio), 7 chaves `alertas.*`, ~60 aeroportos do Brasil e país e
  região de ~45 destinos estrangeiros dos alertas.
- **Código** em `src/lib/alertas/`: `ponte.ts` (lê o arquivo do monitor,
  `MONITOR_WHATSAPP_PASTA` no `.env`), `leitor.ts` (texto → dados, puro, sem
  IA), `regras.ts` (o que vira oferta), `alertas.ts` (a passada: ponte, leitor,
  validade, conferência), `conferencia.ts` (robô no calendário da Smiles e o
  "Conferi" à mão), `saude.ts`. O motor chama `processarAlertas` como a
  primeira etapa depois da coleta de passagens. `npm run alertas` roda sem o
  motor (`--vigiar` = só a ponte, para computadores separados;
  `--ler-de-novo`; `--conferir`) e imprime o relatório.
- **Painel:** na vitrine, a oferta de alerta mostra as datas ("2 datas de ida:
  13, 20/11 · voltas: …"), "+ taxas", "o grupo CPM vende a R$ X (referência)",
  "Conferir agora" (Smiles econômica) e **"Conferi"** (quem, milhas, taxa;
  "Esgotou"). Valores: bloco **Alertas do WhatsApp** (origens e programas; ao
  salvar, os alertas recentes são relidos na hora). Saúde: bloco **Alertas do
  WhatsApp** (hoje: recebidos, viraram oferta, fora de origem, fora de
  programa, não entendidos; avisos de ponte parada, monitor sem sinal,
  WhatsApp desconectado e silêncio no horário do grupo).

**Provado no banco (e na tela)**

- Os **416 alertas** guardados (07 a 29/10): **0 não entendidos**; 178 fora
  de origem, 121 fora de programa, 3 fora de classe, 3 sem datas futuras, 111
  passariam (9 dentro das 24 h viraram 26 ofertas; 102 já vencidos).
- **Ponta a ponta com o motor**: numa cópia do arquivo do monitor (pasta
  temporária) entrou um alerta "novo" (BSB→Cancún, Smiles); na primeira
  passada a ponte o trouxe, viraram 5 ofertas (uma por mês) e o robô conferiu
  as 5 no calendário da Smiles (4 ok, 1 com o preço Clube atualizado). Motor
  desligado e conferido: nenhum `node` sobrou.
- Robô nas 25 ofertas Smiles econômica: 4 ok, 9 com preço mudado, 1 esgotada,
  5 sem selo por falta da taxa, 6 com o calendário vazio naquela hora.
- "Conferi" pela tela (GRU→Toronto, Azul Pelo Mundo): resultado ok,
  "conferido à mão por …", taxa gravada; relida depois de mudar uma regra em
  Valores, a conferência e a taxa continuaram.
- Origem VCP adicionada e tirada em Valores: a regra valeu na hora.
- `npm run check` passa.

**Para quem juntar com a V2 (a sessão de controle pediu)**

- **Migrações escritas à mão**: o banco de testes já tem as colunas e tabelas
  da V2 (`nota`, `selo`, `nota_calculo`, `regua_excecao`…), e um `migrate
  diff` contra ele mandaria apagá-las. As da V6 são
  `20261030030754_alertas_whatsapp`, `20261030031726_alertas_seguranca` e
  `20261030033020_alertas_lugares`; **não as reescreva** ao juntar. As da V2
  (`20261016…`) têm data anterior e ainda não estão nesta pasta: ao juntar, as
  duas convivem (tabelas e colunas diferentes).
- Arquivos que as duas mexem (quem juntar primeiro fica como base):
  - `src/lib/coleta/molde.ts` — etiqueta `alerta` em `ETIQUETAS`; campo
    opcional `variante` em `OfertaNova`, que entra no fim da `chaveDaOferta`.
  - `src/lib/ofertas/vitrine.ts` — `ItemVitrine.alerta` (datas e referência,
    lidos de `dados_fonte.alerta`) e a função `dadosDoAlerta` no fim.
  - `src/app/_componentes/Vitrine.tsx` — import de `./Alerta`; contagem de
    datas do grupo; "+ taxas" no cabeçalho, no custo, na venda e nas parcelas;
    as datas do alerta na 1ª coluna; os botões de conferência do alerta.
  - `src/lib/configuracao.ts` — 7 chaves `alertas.*` no catálogo e
    `CHAVES_DOS_ALERTAS` no fim.
  - `src/motor/motor.ts` — import de `alertas` e a etapa
    `alertas.processarAlertas` como a 1ª do laço (antes dos pacotes); a V2
    põe a nota no mesmo laço: **a nota deve vir depois dos alertas**.
  - `src/lib/revalidador/revalidador.ts` — o revalidador da Cativa só pega
    pedidos de ofertas da Cativa (antes pegava qualquer um da fila).
  - `scripts/provas/*-aberto.ts` — o mesmo `export {};` que a V2 pôs
    (idêntico, junta sem conflito).
- Tocados só aqui: `prisma/schema.prisma` (modelos `Alerta*`,
  `Fonte.taxasAConferir`, `Programa.alertaNomes`), `src/lib/ofertas/preco.ts`
  (`Preco.maisTaxas`), `src/lib/coleta/gravar.ts` (`podeSerAprovada`),
  `src/app/acoes.ts`, `src/app/saude/page.tsx`, `src/app/valores/page.tsx`.

**Para a V2 (a nota) saber**

- Oferta de alerta: `fonte_id = 'alerta_cpm'`, etiqueta **`alerta`** (o
  empurrão na nota é da V2), `detalhe = 'mes'` com `ida`/`volta` **vazias** —
  as datas estão em `dados_fonte.alerta.datasIda`/`datasVolta`.
- `vista_em` = a hora em que o **grupo postou** (a validade conta dali).
- Os alertas **não** gravam `preco_observado` (amostra viciada em preço baixo).

**Para a V4 (aprovação e card) saber**

- **`podeSerAprovada` mudou de assinatura**: pede também `milhas` e
  `taxasBrl`; oferta em milhas **sem taxa** nunca é aprovada. A taxa entra
  pelo "Conferi" (`conferirAMao` em `src/lib/alertas/conferencia.ts`; o botão
  está em `src/app/_componentes/Alerta.tsx`, para a V4 pôr onde quiser).
- Pedido de conferência da aprovação (`motivo = 'aprovacao'` em
  `conferencia_pedido`) de oferta de alerta é atendido pela V6: Smiles
  econômica pelo calendário; as outras recebem "não deu — confira à mão".
- Card, "mês e janela": `dados_fonte.alerta.datasIda` (todas as datas do mês)
  e, depois da conferência do robô, `milhasPorDiaIda`/`milhasPorDiaVolta`
  (milhas Clube de cada data) para o "N datas a este preço".
- **Nada de `dados_fonte.alerta` vai para a arte nem para a legenda**:
  `cpmBrl` (preço do grupo), `idaTexto`/`voltaTexto` (texto deles) e
  `taxaOutraMoeda` são só da equipe. A companhia (`companhia_nome`) pode ir.

**Ficou de fora / atenção**

- **O monitor de WhatsApp do Saulo está parado** desde 29/10 às 21:07 (o
  processo não existe). Não foi religado (decisão do Saulo). Sem ele, nada
  novo chega; a Saúde avisa.
- **Falta o Saulo preencher** em Valores o milheiro de **Azul Pelo Mundo,
  Azul Fidelidade e LATAM Pass**; até lá, essas ofertas aparecem com "falta
  preço do milheiro".
- A prova "alerta novo aparece sozinho" foi feita com uma **cópia** do
  arquivo do monitor; a prova com o grupo de verdade precisa do monitor
  ligado num dia útil.
- Em computadores separados (etapa L), a ponte roda com `npm run alertas --
  --vigiar` no computador do monitor; não há instalador para isso ainda.
- O monitor guardou uma mensagem **sem o id do WhatsApp** (29/10): a ponte dá
  um id próprio; se o monitor algum dia guardar a mesma com o id, ela vira
  "repetida" (as ofertas não duplicam, a chave é a mesma).
- O calendário da Smiles confere a data e o preço "a partir de" em qualquer
  companhia, não o voo exato do alerta.
- **Produção:** as migrações da V6 não foram aplicadas lá.

### L0 — Painel no ar (construída 30–31/10/2026; publicação em andamento)

**Decisões do Saulo nesta etapa** (mudaram a especificação)

- **Nada de senha única.** "Eu não quero nada segmentado": a pessoa entra no
  Radar com **o mesmo e-mail e a mesma senha do MilesPro** (o Supabase Auth do
  projeto de **produção**, `milespro-production`). Os usuários pertencem ao
  futuro painel central (`app.srrviagens.com.br`); hoje moram no MilesPro só
  porque a central não existe.
- **Lista de liberados, provisória.** Além da senha certa, a conta tem de
  estar em `ofertas.acesso` (e-mail, ligado, quem liberou, quando), editada
  em **Valores → Quem entra no Radar**. **Não é cadastro de pessoa: não
  acrescente campos.** Se aposenta quando o acesso vier do VoePro.
- **Banco de PRODUÇÃO hoje** (escolhido na caixinha, contra a recomendação):
  a decisão da O0 ("produção para o publicado") volta a valer já. A vitrine
  da produção nasce vazia e enche conforme o motor colhe.
- **Endereço:** `ofertas.srrviagens.com.br` como **ponte** ("cria só o link
  dele dentro do nosso domínio"), e um item "Radar" no menu do VoePro
  apontando para ela. O definitivo é `voepro.srrviagens.com.br/ofertas`.
- O VoePro foi ao ar em 31/10 em `voepro.srrviagens.com.br`; o Guardião da
  fusão (outra sessão) conduziu os passos do Saulo e revisou o diff.

**O que existe**

- `src/proxy.ts` (nesta versão do Next o `middleware` virou `proxy`): roda
  antes de tudo. Sem sessão do Auth, **toda tela e toda ação** voltam para
  `/entrar` (303). Sem as variáveis do porteiro, nada abre além de `/entrar`,
  que diz o que falta (falha fechada). Não confere a lista (sem banco no proxy).
- `src/lib/acesso/acesso.ts`: `quemEntrou()` (sessão + lista),
  `exigirAcesso()` na **primeira linha de cada ação** de `src/app/acoes.ts`
  (19 de 19), `exigirAcessoNaTela()` em cada tela, logo depois de
  `connection()`. **Ação ou tela nova tem de chamar um dos dois.**
- `src/lib/acesso/supabase.ts`: os clientes do `@supabase/ssr` (cookies).
- `/entrar` (`src/app/entrar/`): marca da SRR, captcha da Cloudflare
  (Turnstile — o Auth de produção exige; `captchaToken` no
  `signInWithPassword`), recados para senha errada, conta não liberada e
  captcha. Conta com senha certa e fora da lista: a sessão é fechada na hora.
- Cabeçalho: o e-mail de quem entrou e "Sair".
- Valores: liberar, desligar, religar, tirar. Ninguém desliga a própria conta.
- Migração `20261031015024_acesso` (só `ofertas`; RLS ligada; semente com
  `saulo.rodrigues@gmail.com`). Aplicada no banco de **testes**; na produção
  entra no primeiro deploy, junto com as 7 migrações do Radar que só estavam
  nos testes (vitrine, conferência, smiles_sem_navegador, cativa, alertas ×3).
  Revisadas pelo Guardião: nada fora do schema `ofertas`.
- `package.json`: Node `24.x` (a Vercel oferece 24). `.vercelignore`: a
  publicação pela linha de comando não leva `.env*` nem `.claude/` (as cópias
  de trabalho de outras sessões, cada uma com o seu `.env`). `tsconfig` e
  `eslint` também deixaram de ler `.claude/`.

**Variáveis na Vercel** (projeto `srr-ofertas`, só Production; nomes, nunca valores)

| variável | o que é | segredo? |
|---|---|---|
| `DATABASE_URL` | produção, porta 5432, usuário `srr_ofertas.<ref>` — o build roda `prisma migrate deploy` com ela | sim |
| `PGBOUNCER_URL` | produção, porta 6543 (`pgbouncer=true`) — o painel usa em funcionamento | sim |
| `NEXT_PUBLIC_SUPABASE_URL` | o Auth de produção | não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a chave pública do Auth (anon/publishable) | não |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | a chave pública do captcha (a do MilesPro/VoePro) | não |

As duas primeiras saem do `.env.producao` gerado na O0 (`scripts/preparar-banco.mjs`).
**A `DATABASE_URL` nunca com o usuário `postgres`**: a tabela de migrações do
Prisma cairia em `public`, em cima da do MilesPro. O `.env` local também
ganhou as três `NEXT_PUBLIC_*` (documentadas no `.env.example`).

**Provado (no computador, banco de testes)**

- Sem porteiro: `/`, `/valores`, `/saude`, `/buscas`, `/pacotes` e um POST de
  ação → 303 para `/entrar` (com `?de=` nas telas); `/entrar` mostra o que
  falta e nenhum formulário; logo e robots continuam abrindo.
- `npx prisma migrate deploy` no banco de testes, que já tem migrações da V2
  que a pasta não tem: aplicou só a `acesso`, sem reclamar.
- `npm run check` passa.

**Ficou de fora / para a etapa L**

- O teste do **login de verdade** (Auth de produção + captcha) só se faz no
  endereço publicado: o captcha só aceita os endereços cadastrados no widget
  da Cloudflare (`ofertas.srrviagens.com.br`; `localhost` e o `.vercel.app`
  não estão). Ver "Publicação — onde parou" abaixo.
- **Radar dentro do VoePro:** `basePath '/ofertas'` aqui + rewrite no
  `next.config` do VoePro; acesso vindo do cadastro do VoePro (`crm.usuario`);
  `ofertas.acesso` e `/entrar` se aposentam.
- **Cookie:** em outro endereço o cookie é outro; entrar no Radar não entra
  no VoePro até ele estar em `/ofertas`.
- **O `.vercel.app` do Radar** fica aberto com a mesma porta (só o login muda
  de endereço); proteção extra dele é da L (R5 do FUSAO.md).
- **Toda troca da `DATABASE_URL` de Production** passa pelo revisor da fusão
  antes: o build roda `migrate deploy` no banco que ela apontar.
- O motor do computador do Saulo precisa apontar para a produção (a linha
  `DATABASE_URL` do `.env` dele) e ser reiniciado; os pedidos de "Buscar
  agora" e "Conferir agora" pela internet só são atendidos com ele ligado.
- Backup: o automático do MilesPro está quebrado desde 08/10 (R17); antes
  desta publicação o Saulo baixou um completo (~00:10 de 31/10).

**Publicação — concluída (01/11/2026)**

O caminho foi o do VoePro (GitHub + importação na Vercel), conduzido pelo
Guardião da fusão, em vez da CLI prevista na especificação.

| item | estado |
|---|---|
| Repositório | `srrodrigues7/srr-ofertas` (privado); `main` = `f77af8a` (igual ao ramo `l0/painel-no-ar`) |
| Endereço | **https://ofertas.srrviagens.com.br** (CNAME no Registro.br, domínio verificado no projeto `srr-ofertas`) |
| Deploy de Production | `dpl_Gx5Jxtcj…` **READY**, funções em São Paulo (`gru1`) |
| `srr-ofertas.vercel.app` | segue atrás da Vercel Authentication (login da Vercel antes do nosso) |
| Auth de produção | Redirect URL `https://ofertas.srrviagens.com.br/**`; Site URL intocada |
| Turnstile | hostname `ofertas.srrviagens.com.br` no widget (o captcha só carregou depois disso) |
| Proteção | sem sessão, `/valores` (e toda rota, e as ações por POST) vão para `/entrar` |
| Login do Saulo pelo domínio | **ok** (01/11, manhã) |
| Banco | produção: 9 migrações do Radar; sementes iguais às do teste (abaixo) |
| Motor | no notebook do Saulo (`srrlaptop`), `.env` apontando para a produção; a conexão antiga ficou em `.env.testes` |

**Sementes da produção conferidas antes do motor (01/11):** `configuracao`
tem as 43 chaves do catálogo do código (`src/lib/configuracao.ts`) — o teste
tem 64 porque guarda as 21 chaves da nota (`nota.*`, `grupo.limite_dia`) das
migrações da V2, que não estão neste `main` e que nenhum código publicado lê;
quando a V2 entrar, o `migrate deploy` do build as semeia. `lugar` tem 167
(68 + 99 das migrações); o resto o motor grava sozinho ao coletar.
`busca` 27, `margem` 4, `parcela_taxa` 1, `alerta_origem` 3,
`alerta_programa` 27, `fonte` 4, `programa` 5, `faixa_busca` 3: iguais ao
teste.

**Primeira passada na produção (02/11, 02:45Z):** passada 1 `ok` em 115 s;
9 de 327 tarefas (as outras 318 entram nas passadas seguintes, normal num
banco vazio); 150 ofertas, 653 preços, lugares de 167 para 264. A ponte leu
449 mensagens do grupo; 200 alertas lidos, nenhum virou oferta (todos
filtrados: fora de origem, vencidos, fora de programa). A Cativa dá
"o site mudou de formato?" — já dava no teste desde 23/10; não é da
publicação. O revalidador só trabalha das 7h às 23h.

**Não testado na L0 (tentado em 02/11, ~03:00Z):**

- *"Buscar agora" pelo domínio:* precisa de alguém com sessão no Radar. O
  Chrome usado pela sessão de construção não tinha sessão, e ela não digita
  senha. Gravar o pedido direto na fila da produção foi barrado pela
  permissão da sessão. Para o Saulo: entrar em
  `https://ofertas.srrviagens.com.br/buscas`, apertar "Buscar agora" em
  qualquer busca ligada e, em até uns 2 minutos, ver a coluna "Último
  “Buscar agora”" mudar de "na fila" para feito. Quem conferir no banco olha
  `ofertas.busca_agora` (status e resumo).
- *"Conferir agora":* não há como testar ainda. O botão só aparece em
  ofertas da Cativa (coleta quebrada desde 23/10) e dos alertas do WhatsApp
  (nenhum virou oferta na produção até agora). Testar quando a primeira
  oferta de uma dessas fontes aparecer.
- A mensagem de conta não liberada com a conta real de outra pessoa.

**O que a etapa do `/ofertas` precisa** (o Radar em
`voepro.srrviagens.com.br/ofertas`, uma sessão só para isso):

- *Neste repositório:* `basePath: "/ofertas"` no `next.config.ts`;
  `experimental.serverActions.allowedOrigins: ["voepro.srrviagens.com.br"]`
  (as ações chegam com Origin do VoePro); no `proxy.ts`, montar o
  redirecionamento com `pedido.nextUrl.clone()` (o `new URL("/entrar", …)` de
  hoje perde o basePath); a logo (`<img src="/logo-srr.png">`) e o matcher
  do proxy conferidos com o prefixo; um redirecionamento de `/` para
  `/ofertas` (com `basePath: false`) para o domínio próprio não dar 404.
- *No VoePro (pela sessão do VoePro):* rewrite de `/ofertas` e
  `/ofertas/:path*` para `https://ofertas.srrviagens.com.br/ofertas/…` — nunca
  para o `.vercel.app`, que está atrás do login da Vercel; o proxy do VoePro
  deixar `/ofertas` passar; o item de menu como `<a>`, não `<Link>` (troca de
  aplicação é navegação completa).
- *Login único (confirmado pelo Guardião da fusão em 02/11):* o VoePro guarda
  a sessão no cookie padrão do `@supabase/ssr` (projeto de produção, sem nome
  nem domínio próprio, path `/`; o `proxy.ts` dele é quem renova). Sob a
  rewrite, o Radar recebe o mesmo cookie `sb-unhzbeevczoxgwyfxxnv-auth-token`,
  e quem entrou no VoePro entra direto. O `/entrar` do Radar passa a mandar
  para o `/login` do VoePro com a volta para `/ofertas`.
- *Quem entra:* a lista `ofertas.acesso` continua (só e-mails liberados, sem
  dados de pessoa) até o painel central `app.srrviagens.com.br`.
- Esforço estimado: médio. Primeiro o Radar com basePath publicado
  (`ofertas.srrviagens.com.br/ofertas` funcionando), depois o rewrite e o menu
  no VoePro. A etapa é aberta pela sessão de controle com o Saulo; o Guardião
  revisa o diff (basePath, allowedOrigins, proxy) antes do deploy.

---

### Controle do Radar — 02/11/2026 (nova sessão de controle)

A sessão de controle anterior parou de responder; esta a substituiu. Três
entregas, **nada publicado, nada na produção** (só leituras no banco).

**1. O visual da etapa D (kit da SRR) — ramo `l-visual/kit-srr`, espera o "sim"**

- O kit do VoePro foi copiado pelo script dele (`src/kit/`, origem em
  `src/kit/ORIGEM.md`: VoePro `488cafa`, ramo `etapa-D/rodada-4`). **O kit não
  se edita aqui**: muda no VoePro e copia de novo.
- Layout raiz sem `next/font/google` (Plus Jakarta Sans servida pelo projeto;
  o build não depende do Google, que derrubou um build do VoePro em 02/11);
  tema e cor pelos cookies `srr_tema`/`srr_cor`; sem escolha, claro e verde,
  mesmo com o Windows no escuro. Lua e paleta no cabeçalho. Texto sobre a cor
  usa `--sobre-acento`; cantos do kit. `npm run check` passa.
- Fotos antes/depois em `docs/etapas/fotos/l-visual/` (no ramo do visual),
  **só da tela de entrada**: as telas de dentro pedem login, que não funciona
  no computador (o captcha só aceita o endereço publicado e o `.env` local não
  tem as chaves do porteiro). Um desvio temporário de login, só para as fotos,
  foi barrado pela permissão da sessão e **não foi contornado**. Decisão do
  Saulo pendente: liberar esse desvio local (nunca commitado), ver numa prévia
  publicada depois do "sim", ou olhar ele mesmo.
- O ramo do visual saiu do `main` (`f77af8a`); este README está no ramo
  `l/spec-e-correcoes`, que saiu do `l0/painel-no-ar` (3 commits de README à
  frente do `main`). Os dois juntam sem conflito (arquivos diferentes).

**2. A especificação da etapa L** — [L-radar-no-voepro.md](L-radar-no-voepro.md).
Radar em `voepro.srrviagens.com.br/ofertas` pelo desenho "multi-zones" do
Next (basePath aqui, rewrite no VoePro). Quatro perguntas ao Saulo (quem
entra, como aparece, o domínio antigo, separar a L2). Revisada pelo revisor
da fusão: OK com ressalvas, todas incorporadas. Esforço proposto:
**alto** (era xalto para o pacote inteiro; sem o motor e os avisos, que vão
para a L2, nada apaga dado e a volta leva minutos).

**3. As correções registradas (C1, C2) e uma achada na revisão (C3)** — diagnóstico feito, construção espera
o "sim".

#### C1 — A vitrine da Cativa (V1b) quebrada desde 22/10

**Esforço: médio.** Conector existente, formato conhecido; o risco é só a
Cativa mudar de novo.

*O que se vê:* toda leitura da Cativa termina em "Não achei os pacotes na
página da Cativa — o site mudou de formato?". No banco de testes, a primeira
falha é de **22/10 à noite**; na produção, todas as 20 leituras desde que o
motor chegou lá (02/11, 02:47Z) falharam. Resultado: **nenhum pacote e nenhum
bloqueio da Cativa na vitrine publicada**, e o botão "Conferir agora" não tem
oferta onde aparecer.

*A causa (conferida em 02/11 na página de verdade):* o viajandocomdesconto
**tirou os dados de dentro da página**. Antes, o HTML trazia os blocos
`const PACOTES = [...]`, `window.__PVOO_PAYLOAD = {...}`, `PV_SNAPSHOT` e
`DEST_FIX`. Agora a página (0,5 MB) só traz o esqueleto e carrega cinco
arquivos do próprio site, `/_s/<código>.js`, e os blocos estão lá:

| arquivo | tamanho | o que tem |
|---|---|---|
| `/_s/…?n=3` | 3,3 MB | `PACOTES` (481 pacotes, 1.769 saídas, 107 de BSB) e `DEST_FIX` |
| `/_s/…?n=1` | 0,8 MB | `__PVOO_PAYLOAD` (10.822 bloqueios, gerado em 02/11) |
| `/_s/…?n=0` | 1,3 MB | `PV_SNAPSHOT` (criança grátis por hotel) |

**Os campos são os mesmos** (pacote, saída, hotel; bloqueios com `blob`,
`mapa`, `ger` e três campos novos de dólar que não usamos). O site responde
normalmente ao nosso robô (identificado como "SRRViagens-RadarOfertas"), sem
anti-robô; está atrás da Cloudflare, mas sem desafio. O conector
(`src/lib/coleta/fontes/cativa.ts`) só procura dentro do HTML, então não acha.

*O plano (nada construído):*

1. `lerVitrineCativa`: depois de baixar a página, achar os
   `<script src="/_s/…">` **do próprio site** (nunca de outro endereço; no
   máximo 8; no máximo 15 MB somados), baixar cada um com o mesmo robô, prazo
   e contador de requisições, e procurar os mesmos marcadores na soma página +
   arquivos. Se um dia os dados voltarem para dentro da página, continua
   funcionando (procura na página primeiro).
2. **Cache por nome de arquivo:** o nome `/_s/<código>.js` muda quando o
   conteúdo muda. Arquivo com o mesmo nome não se baixa de novo; a pergunta
   "mudou?" da página (`Last-Modified`) continua. Na prática: uma leitura
   grande por dia (o site republica de manhã), o resto são perguntas de
   poucos bytes.
3. Mensagem de erro mais útil: dizer **qual** bloco faltou e **onde** se
   procurou (página e quantos arquivos), para a próxima mudança da Cativa
   ser diagnosticada pela tela de Saúde.
4. Teste com recortes da página e dos arquivos de hoje (guardados em
   `scripts/provas/`, só alguns pacotes, sem os 5 MB): os dois formatos, o
   antigo e o novo, dão o mesmo resultado.
5. Provas: `npm run cativa` (conta pacotes e bloqueios, BSB e GRU
   internacional); uma passada do motor com "Cativa: vitrine lida"; no banco,
   `ofertas.oferta` com `fonte_id = 'cativa'` ativas (pacotes e passagens);
   o Saulo confere três pacotes contra o site. **No banco de testes primeiro.**
   Na produção só com o "sim" dele, porque o motor do notebook já escreve lá.
6. Fora deste conserto (anotado): depois de erro, o motor tenta de novo a
   cada 30 minutos (regra geral do `nucleo.ts`, de propósito); com a página
   sem mudança cada tentativa é uma pergunta pequena, então fica como está.

*Sem pergunta de negócio:* a escolha é técnica e não muda nada que o Saulo
veja além de os pacotes voltarem.

#### C2 — Alertas do WhatsApp (V6): 0 ofertas na produção

**Esforço: baixo.** Não há defeito no Radar; há uma prova pendente e um
ajuste pequeno no alarme.

*O que se vê:* desde que o motor chegou à produção (02/11, 02:45Z), nenhum
alerta virou oferta. A dúvida vinha da noite de 01/11 ("olhar amanhã").

*O que o banco e os arquivos mostram (02/11, ~09:40):*

- **A ponte está viva**: leu o arquivo do monitor às 09:38, a cada minuto,
  sem erro. O monitor de WhatsApp está ligado (processo de 01/11, 07:50),
  conectado, os dois grupos "monitorando", histórico completo.
- **O grupo não postou nada desde sexta, 30/10, 17:05** (última mensagem no
  arquivo do monitor). Depois veio o fim de semana e hoje é feriado
  (Finados). O grupo posta em dia útil, das 9h às 20h; o monitor diz "1 lida,
  0 novas" a cada sincronização, o que bate com silêncio, não com perda.
- **Todas as 449 mensagens foram entendidas** (0 "não entendido"): 192 fora
  de origem, 130 fora de programa, 121 vencidas, 3 fora de classe, 3 sem
  datas. As que passariam nos filtros já tinham mais de 24 h (a validade)
  quando o motor chegou à produção, então viraram "vencido". No banco de
  testes, as mesmas regras transformaram 9 alertas frescos em 26 ofertas.
- Os milheiros de Azul Fidelidade, Azul Pelo Mundo e LATAM Pass já estão
  preenchidos na produção (02/11, ~02:42), então as ofertas desses programas
  sairão com preço.

*O plano:*

1. **Prova no primeiro dia útil (03/11, ~11h):** conferir no banco
   `ofertas.alerta_mensagem` com `resultado = 'oferta'` e `ofertas.oferta`
   ativas com `fonte_id = 'alerta_cpm'`. Se, com dois ou mais alertas novos de
   BSB (ou GRU/GIG internacional) em Smiles/Azul/LATAM, nada virar oferta, aí
   sim reabrir o diagnóstico com o motivo gravado em cada mensagem.
2. **O alarme de silêncio não conhece feriado:** a Saúde trata como "dia útil"
   tudo que não é sábado nem domingo (`src/lib/alertas/saude.ts`), então hoje
   vai acusar "silêncio no horário do grupo" sem motivo. Pergunta ao Saulo:
   - **A)** uma lista de feriados em Valores (nacionais e do DF já
     preenchidos; ele acrescenta os outros). Ganha: alarme confiável. Custa:
     uma tabela pequena e uma tela.
   - **B)** deixar como está: em feriado, a Saúde mostra o aviso amarelo e a
     equipe ignora. Custa: aviso falso uns 10 dias por ano.
   - **Recomendação: A**, depois da L (cria migração; ver C3), e é pouco
     e evita que a equipe aprenda a ignorar o alarme.
3. **Fora do Radar, para o Saulo saber:** o monitor de WhatsApp parou sozinho
   em 29/10 às 21:07 (o próprio diagnóstico dele aponta a suspensão do
   Windows) e só voltou quando foi reaberto à mão. Reabrir sozinho ao acordar
   o computador é uma pergunta que o monitor já fez ao Saulo e está sem
   resposta. O Radar não mexe no monitor (decisão de 30/10); a Saúde do Radar
   avisa quando ele para.

#### C3 — O "Sair" do Radar desloga a pessoa de todos os sistemas (achado em 02/11)

**Esforço: baixo. Gravidade: alta. Já vale no Radar publicado.**

*Achado pelo revisor da fusão ao revisar a spec da L, conferido no código:*
`src/app/entrar/acoes.ts` chama `supabase.auth.signOut()` sem escopo (linhas
34 e 43). Na biblioteca do Supabase usada aqui, o padrão é o escopo
**global**: encerra **todas** as sessões da conta. Como a conta é a mesma do
MilesPro e do VoePro, quem aperta "Sair" no Radar (ou "Sair e tentar com
outra conta" na tela de não liberada) é deslogado do MilesPro e do VoePro,
em todos os computadores e celulares. O VoePro já usa `scope: "local"`.

*O plano:* trocar as duas chamadas para `signOut({ scope: "local" })` (só a
sessão deste navegador). Mudança de auth: passa pelo revisor da fusão antes
do commit e vai ao ar com o "sim" do Saulo. Prova no endereço publicado:
entrar no Radar e no MilesPro no mesmo navegador e no MilesPro pelo celular,
apertar "Sair" no Radar, e o MilesPro continua conectado nos dois.
**Recomendação: fazer antes de qualquer outra coisa da L**, num deploy só
com isso. Até lá, aviso à equipe: não usar o "Sair" do Radar, só fechar a aba.

*Ordem com as outras correções:* C3 primeiro (sem migração). A C2-A (feriados)
cria uma tabela, e o build do Radar roda `migrate deploy` na produção a cada
deploy: ela vai depois da L, com revisão própria, nunca no mesmo `main` que
os deploys da L.
