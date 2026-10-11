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

| #    | Etapa | Depende de | Estado |
| ---- | ----- | ---------- | ------ |
| O0   | [Fundação](O0-fundacao.md) — projeto, banco, motor de pé, painel no ar | — | **entregue, só local — em revisão** (a parte de ligar tudo ficou para depois, por decisão do Saulo) |
| O1   | [Raio-x das fontes](O1-raio-x-das-fontes.md) — uma ficha por fonte, com prova de captura | — | **aberta** |
| O2   | Formato da oferta e coletor — o molde único, o agendador, o histórico, Smiles e Melhores Destinos rodando | O0, O1 | esperando |
| O3.x | Um conector por fonte (em paralelo, uma sessão por fonte) | O2 | esperando |
| O4   | Preço normal da rota — o normal de cada rota em cada mês (sazonalidade) | O2 | esperando |
| O5   | Motor de inteligência — nota 0–100, motivo, filtros, falsa promoção, ranking | O4 | esperando |
| O6   | Preço de venda — margem, milheiro, parcelamento, taxas | O2 | esperando |
| O7   | Painel de curadoria — lista pela nota, aprovar/descartar, revalidação na aprovação | O5, O6 | esperando |
| O8   | Card e legenda — arte e texto prontos para postar, código de rastreio | O7 | esperando |
| O9   | Robô do Telegram — aviso de oferta de nota alta, atalho para aprovar | O7 | esperando |
| O10  | Saúde do sistema — produção por fonte, erros, alertas | O3 | esperando |
| O11  | Resultado — card ligado à venda no VoePro, para o motor aprender | VoePro no ar | esperando |

```
O0 ─┐
    ├─► O2 ─┬─► O3.x ─► O10
O1 ─┘       ├─► O4 ─► O5 ─┐
            └─► O6 ───────┴─► O7 ─┬─► O8
                                  └─► O9
```

## O escopo de cada uma, em uma frase

- **O0** deixa a casa de pé: o projeto, o schema `ofertas`, o motor rodando no
  computador dedicado e se religando sozinho, o painel publicado com login, e a
  prova de que os três conversam.
- **O1** descobre, fonte por fonte, o melhor jeito de buscar preço, o que cada
  uma entrega e o risco — e prova com um teste que funciona.
- **O2** define o formato único de oferta e o coletor que vai às fontes no
  ritmo certo e guarda tudo.
- **O3.x** encaixa cada fonte nova no formato.
- **O4** calcula o preço normal de cada rota em cada mês.
- **O5** dá a nota e escolhe as melhores.
- **O6** calcula por quanto vender.
- **O7** é onde a pessoa da curadoria trabalha.
- **O8** gera o que vai ser postado.
- **O9** avisa no celular.
- **O10** avisa quando algo para.
- **O11** fecha o ciclo com o que vendeu.

## Decisões do Saulo já tomadas

- **Projeto irmão** (não dentro do VoePro): mesmo Supabase, mesma Vercel,
  código e deploy próprios.
- **Trabalho contínuo num computador dedicado** que fica sempre ligado.
- **Curadoria manual:** funcionário vê, analisa, aprova e posta no grupo.
- **Origem BSB** acima de tudo; internacional pode sair de GRU ou GIG.
- **Uma pessoa dedicada** à curadoria nos picos (Black Friday).
- **Fontes:** a lista do Saulo está chegando; Smiles e Melhores Destinos já se
  sabe que respondem por endpoint. Pedidos de API feitos às consolidadoras.

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
