# Etapa O0 — Fundação

**Esforço: alto.** Tudo que vem depois se apoia aqui; errar o desenho agora
custa refazer depois.

## O objetivo, em uma frase

Deixar a casa de pé: **o motor rodando sozinho no computador dedicado, o banco
preparado, o painel publicado com login — e a prova de que os três conversam.**
Nenhuma fonte, nenhuma oferta ainda.

## O que entregar

### 1. O projeto

- Next.js com a mesma pilha do VoePro (ver `00-contexto.md`, seção 5): mesmas
  versões, CSS Modules, lint estrito, script `npm run check`.
- **Duas partes no mesmo repositório**, compartilhando o código de negócio:
  - **o painel** — o app Next, publicado na Vercel;
  - **o motor** — um processo Node que roda no computador dedicado.
  O código que os dois usam (acesso ao banco, regras) mora num lugar só. A
  organização das pastas é decisão sua; documente no README do projeto.
- `.env.example` documentado, `.env` no `.gitignore`.

### 2. O banco

- Schema **`ofertas`** no Supabase, com o Prisma limitado a ele.
- As primeiras tabelas são só as da casa, não as de negócio:
  - **a trava e o batimento do motor** — o motor registra "estou vivo, rodando
    a passada N" e só uma instância roda por vez (se dois motores subirem, um
    espera). Trava com prazo: se o motor morrer no meio, a próxima assume. O
    VoePro tem esse padrão em `automation_run` — leia lá, copie a ideia.
  - **o registro de cada passada** — começou, terminou, deu erro, quanto tempo.
  - **configuração** em tabela (chave/valor), para o que o Saulo for querer
    mudar sem deploy.
- Atenção às armadilhas de migração do `00-contexto.md`.

### 3. O motor no computador dedicado

- Um processo que fica de pé, faz uma "passada" a cada intervalo configurável e
  registra o batimento. Nesta etapa a passada não faz nada além de provar que
  roda.
- **Religa sozinho**: se o processo cair, volta; se o computador reiniciar,
  volta sem ninguém fazer nada.
- **Falha fechada:** sem configuração obrigatória (banco, etc.), ele não sobe e
  diz claramente o que falta.
- Log em arquivo com rotação (não enche o disco).
- Um passo a passo **escrito para o Saulo** de como instalar e conferir o motor
  na máquina, em linguagem dele.

### 4. O painel na Vercel

- Projeto novo na Vercel, publicado.
- **Login.** Ninguém de fora vê nada.
- Uma tela só por enquanto: **Saúde** — "o motor bateu há X segundos, última
  passada às HH:MM, N passadas hoje", em verde, amarelo (atrasado) ou vermelho
  (parado). É a prova de que motor → banco → painel conversam.
- A marca segue o VoePro (`C:\Users\saulo\programing\srr-crm\docs\marca.md`,
  **só leitura**).

### 5. Documentação

- `README.md` do projeto: o desenho, como rodar o painel, como rodar o motor,
  comandos.
- Atualizar `docs/etapas/README.md` com o que a O2 precisa saber.

## Perguntas de negócio que esta etapa leva ao Saulo

Sempre com alternativas e recomendação (ver `00-contexto.md`, seção 1). No
mínimo:

1. **Qual banco**: o Supabase de testes (`milespro-staging`, onde o VoePro está
   hoje) ou o de produção (`milespro-production`)? O radar vai trabalhar de
   verdade, mas o de produção é onde o MilesPro mora.
2. **Login**: o mesmo login que a equipe já usa no MilesPro (o Supabase é o
   mesmo, então os usuários podem ser os mesmos) ou um cadastro próprio do
   radar? Quem da equipe acessa o painel?
3. **O computador dedicado**: qual sistema (Windows? Mac?), onde fica, como é a
   internet e a energia (tem nobreak?), e como você vai acessá-lo para instalar
   — o Saulo vai ter que fazer passos lá, então o passo a passo depende disso.
4. **Repositório no GitHub**: criar um repositório novo (privado) para o
   projeto, como o VoePro tem? A Vercel publica a partir dele.
5. **Nome**: "Radar de Ofertas" como nome interno, ou outro?

Pergunte o que mais for necessário — mas só o que tem consequência que ele vá
sentir.

## Fora do escopo

Fontes, conectores, ofertas, nota, Telegram, card. Nada disso entra aqui.

## Como a revisão vai conferir

- O motor rodando na máquina dedicada, e **voltando sozinho** depois de ser
  derrubado e depois de reiniciar o computador.
- Dois motores ligados ao mesmo tempo: só um trabalha.
- O motor sem configuração: não sobe, e diz por quê.
- O painel publicado, pedindo login, e a tela de Saúde mudando de cor quando o
  motor é parado.
- Nenhuma tabela fora do schema `ofertas`.
