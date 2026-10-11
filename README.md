# SRR Ofertas — o radar de passagens da SRR Viagens

Encontra passagens extraordinariamente baratas e as entrega para uma pessoa da
equipe decidir se viram oferta no grupo de clientes. O robô propõe, a pessoa
decide e posta. O contexto completo, as regras da casa e as lições do Radar da
HUB 92 estão em [docs/etapas/00-contexto.md](docs/etapas/00-contexto.md); o
andamento, em [docs/etapas/README.md](docs/etapas/README.md).

## O desenho

```
  computador dedicado (Windows, na agência, sempre ligado)
  ┌─────────────────────────────────────────────────────┐
  │ Agendador de Tarefas → iniciar.cmd → vigia.mjs        │
  │   vigia: liga, religa e atualiza ──► motor (Node)     │
  └──────────────────────────┬──────────────────────────┘
                             │ papel srr_ofertas (só enxerga "ofertas")
                             ▼
  Supabase milespro-production — schema "ofertas"
  (o MilesPro mora em "public", o VoePro em "crm": nenhum dos dois é alcançado)
                             ▲
                             │ papel srr_ofertas
  ┌──────────────────────────┴──────────────────────────┐
  │ painel — Next.js na Vercel: ofertas.srrviagens.com.br │
  └─────────────────────────────────────────────────────┘
```

- **Motor** ([src/motor/motor.ts](src/motor/motor.ts)) — o trabalho contínuo. A
  cada `motor.intervalo_s` faz uma *passada*. Na etapa O0 a passada só prova
  que roda; a O2 pendura nela a coleta.
- **Vigia** ([instalador/vigia.mjs](instalador/vigia.mjs)) — só Node, nenhuma
  biblioteca. Liga o motor, religa se cair, para de insistir se faltar
  configuração, e atualiza sozinho a partir do ramo `main` do GitHub
  (preparando a versão nova ao lado da atual e voltando para a anterior se a
  nova cair 3 vezes nos primeiros 5 minutos).
- **Painel** ([src/app](src/app)) — só mostra e (nas próximas etapas) recebe
  decisões. **Nenhum trabalho contínuo na Vercel.** Hoje: a tela de Saúde.
- **Código comum** ([src/lib](src/lib)) — banco, configuração, trava, saúde,
  log. Painel e motor usam os mesmos arquivos.

### Pastas

| pasta | o quê |
| --- | --- |
| `src/app/` | o painel (App Router do Next 16) |
| `src/motor/` | o processo do motor |
| `src/lib/` | o que painel e motor compartilham |
| `src/lib/motor/` | trava (um motor por vez) e leitura da saúde |
| `prisma/` | schema e migrações — só o schema `ofertas` |
| `instalador/` | vigia, instalador de duplo clique, conferir, desinstalar, LEIA-ME |
| `scripts/` | preparar e conferir o banco, montar o pacote, build da Vercel |
| `scripts/provas/`, `docs/fontes/` | da etapa O1 (raio-x das fontes) |

## Regras que o código já garante

- **Um motor por vez.** A trava é uma linha em `ofertas.motor_trava` com prazo
  (`motor.trava_validade_s`), renovada a cada 20 s. Outro motor ligado espera;
  se o dono morrer, assume quando o prazo vence. Todo prazo usa o relógio do
  banco (`now()`). O motor ligado pelo vigia tem identidade fixa por
  computador (`MOTOR_ID`), então religado depois de uma queda ou de o Windows
  reiniciar ele retoma a trava na hora.
- **Falha fechada.** Sem `DATABASE_URL`, ou com chave faltando em
  `ofertas.configuracao`, o motor não sobe, diz o que falta e sai com código
  78. Não existe valor padrão no código para nada que o Saulo vá querer mudar.
- **Vigia-se produção, não só processo vivo.** A Saúde fica amarela se o motor
  bate mas a última passada deu erro.
- **Tudo tem prazo.** Cada comando do vigia (git, npm, migração, conferência,
  parar o motor) é encerrado se passar do tempo.
- **Log com teto.** Um arquivo por dia, 14 dias, no máximo 20 MB por dia.

## Rodar no computador de desenvolvimento

```bash
npm install
npm run dev
```

O `.env` aponta para o banco de **testes** (milespro-staging). Ele é gerado,
não digitado: veja "O banco" abaixo. O painel abre em <http://localhost:3000>
(ou na porta do `.claude/launch.json`).

```bash
npm run motor
```

Liga um motor aqui, no banco de testes. `npm run motor -- --conferir` só
confere `.env`, banco e configuração e sai.

## Comandos

| comando | o que faz |
| --- | --- |
| `npm run check` | schema, lint, tipos e build — rode antes de commitar |
| `npm run dev` | o painel em desenvolvimento |
| `npm run motor` | um motor rodando aqui |
| `npm run saude` | a tela de Saúde no terminal |
| `npm run banco:conferir` | confere no banco: tabelas, migrações, configuração e que o papel não alcança nada fora de `ofertas` (`-- --env .env.producao` para a produção) |
| `npm run banco:preparar -- --alvo testes\|producao --sql-em <arq>` | sorteia a senha do papel, grava a conexão no `.env`/`.env.producao` e escreve o SQL que cria papel e schema (ver abaixo) |
| `npx prisma migrate deploy` | aplica as migrações pendentes no banco do `.env` |
| `npm run pacote:instalador` | monta `pacote/SRR Ofertas/` para o pen drive do computador dedicado |

## O banco

- **Produção:** `milespro-production`, schema `ofertas`. É onde o motor e o
  painel publicado trabalham.
- **Testes:** `milespro-staging`, schema `ofertas`. É onde as sessões de
  construção testam e onde as versões de rascunho da Vercel (Preview) rodam.
- **O papel `srr_ofertas`** é dono só do schema `ofertas`: não lê nem escreve
  em `public` (MilesPro) nem em `crm` (VoePro), não cria schema, e tem
  `statement_timeout` de 60 s. O usuário `postgres` é membro dele — é por ele
  que o VoePro vai ler as ofertas.

### Preparar um banco (uma vez)

O Supabase não mostra a senha principal do banco depois de criada, e ninguém
deve digitá-la em chat. Por isso o papel é criado assim:

1. `npm run banco:preparar -- --alvo producao --sql-em sala.sql` sorteia a senha
   do papel, grava a conexão em `.env.producao` e escreve `sala.sql`, que leva
   só o **verificador SCRAM** da senha (o Postgres confere a senha com ele, mas
   ninguém entra usando ele).
2. Rode `sala.sql` como administrador (SQL Editor do Supabase, ou a integração
   do Supabase da sessão de construção).
3. `DATABASE_URL=… npx prisma migrate deploy` (ou deixe a Vercel aplicar).

Rodar de novo **troca a senha** do papel: o motor e a Vercel precisam receber a
conexão nova.

### Migrações — atenção

- O papel não pode criar schema, e a migração **não pode** ter
  `CREATE SCHEMA` (quem cria é o passo acima).
- O papel não pode criar banco, então `prisma migrate dev` (que precisa de um
  banco-sombra) **não funciona**. Para gerar uma migração nova, com o `.env`
  apontando para o banco de testes já em dia:

  ```bash
  npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script -o prisma/migrations/$(date -u +%Y%m%d%H%M%S)_nome/migration.sql
  ```

  Confira que tudo saiu qualificado (não pode imprimir nada):

  ```bash
  grep -nE '(TABLE|INDEX) "[a-z_]+"' prisma/migrations/*/migration.sql | grep -v '"ofertas"\.'
  ```

  E aplique com `npx prisma migrate deploy`.
- **Configuração nova:** a migração que cria a chave em `ofertas.configuracao`
  já insere o valor decidido com o Saulo. O código não tem valor padrão.

## Ambientes e publicação

| onde | ramo | banco | quem aplica a migração |
| --- | --- | --- | --- |
| desenvolvimento | ramo da etapa | testes | você, `prisma migrate deploy` |
| Vercel Preview | ramo da etapa | testes | o build (`scripts/vercel-build.mjs`) |
| Vercel Production | `main` | produção | o build |
| computador dedicado | `main` | produção | o vigia, antes de trocar de versão |

A migração é idempotente e o Prisma usa uma trava própria, então o build da
Vercel e o vigia podem aplicá-la sem se atropelar. **Só entra no `main` o que o
Saulo aprovou** — e o que entra no `main` chega sozinho ao computador dedicado
em até 10 minutos.

Variáveis da Vercel: `DATABASE_URL` (sessão, 5432, usada no build para migrar)
e `PGBOUNCER_URL` (transação, 6543, usada pelo painel), cada uma com o valor de
produção em *Production* e o de testes em *Preview*.

## O computador dedicado

Instalado com o pacote do pen drive (`npm run pacote:instalador`). O passo a
passo para o Saulo está em [instalador/LEIA-ME.txt](instalador/LEIA-ME.txt).
Tudo fica em `C:\SRR-Ofertas`:

| arquivo | o quê |
| --- | --- |
| `iniciar.cmd` | ligado pelo Agendador ("SRR Ofertas - Motor", como SISTEMA, ao iniciar e a cada 5 min); religa o vigia se ele sair |
| `vigia.mjs` | o vigia (não se troca sozinho: mudou, rode o instalador de novo) |
| `.env` | conexão de produção, ramo, intervalo de atualização (só administradores leem) |
| `repo/` | o clone do GitHub, acessado por uma *deploy key* só de leitura (`chave/`) |
| `versoes/<commit>/` | a versão atual e a anterior, cada uma com seu `node_modules` |
| `estado.json` | versão atual, anterior, recusadas |
| `logs/` | `vigia-AAAA-MM-DD.log` e `motor-AAAA-MM-DD.log` |

No Windows, o Node põe o motor numa "caixa" que morre com o vigia: se o vigia
for encerrado à força, o motor vai junto (não sobra órfão), e o próximo vigia
retoma a trava em segundos.

## Versões fixadas

A pilha é a do VoePro, para os dois se juntarem sem atrito, com uma exceção:
**Next 16.3.8** em vez de 16.3.4 — a 16.3.4 tem falhas de segurança publicadas
(uma crítica) e este painel fica aberto na internet. Prisma 7.10.0 fixado de
propósito. CSS Modules, nada de Tailwind.
