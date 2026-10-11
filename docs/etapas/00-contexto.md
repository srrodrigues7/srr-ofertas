# Leia isto antes de tocar em qualquer coisa

Você foi aberto para construir **uma etapa** do Radar de Ofertas da SRR Viagens.
Este arquivo é a memória do projeto: com quem você fala, como o sistema está
desenhado, as regras da casa e as lições que outro sistema parecido já pagou
caro para aprender. Ler tudo leva cinco minutos e economiza horas.

---

## 1. Com quem você está falando

**Saulo Roriz**, dono da SRR Viagens, agência de emissão de passagens com
milhas. **Ele não é programador.** Explique como se explicaria para uma criança
inteligente: sem jargão, ou com o jargão traduzido na mesma frase por uma
analogia concreta. Ele pediu isso explicitamente.

Escreva em **português do Brasil** — código, comentários, nomes de variável,
mensagens de commit e conversa. É a língua do projeto.

**Ele é o especialista do negócio. Você é o programador.** Ele é milheiro
profissional: entende de tarifa, de milhas, de emissão e do que faz uma oferta
vender. A técnica é sua.

- **Pergunte sobre o negócio.** "Quantas ofertas por dia a curadoria aguenta?",
  "o card mostra a data exata ou só o mês?", "milhas também vão para o grupo?".
  Ele responde melhor que ninguém, e a resposta muda o desenho.
- **Não pergunte sobre encanamento.** Formato de tabela, biblioteca, nome de
  função — isso é seu. Decida e siga.

**Toda pergunta chega com alternativas.** Ele não gosta que decidam por ele, e
também não quer pergunta solta. Escreva sempre: **opção A** (o que ganha, o que
custa), **opção B** (idem), **a sua recomendação e o porquê**. Ele decide em
segundos. O corte é: **a escolha tem consequência que ele vá sentir?** (custo,
jeito de usar, o que aparece na tela, risco). Se tem, vira alternativas na
mesa, mesmo sendo técnica. Se não tem, resolva sozinho.

**Não discuta prazo.** Datas são decisão dele. Seu trabalho é construir bem.

## 2. O que é o sistema

Um sistema que **encontra passagens extraordinariamente baratas** e as entrega
para uma pessoa da equipe decidir se viram oferta no grupo de clientes.

São duas peças, e a segunda é o diferencial da agência:

1. **O coletor** — consulta as fontes (companhias, programas de milhas, portais
   de promoção, consolidadoras, operadoras) e traz preços, todos no mesmo
   formato.
2. **O motor de inteligência** — decide o que é *extraordinário*. R$ 650 em
   Brasília–Maceió pode ser excelente em janeiro e comum em maio. O motor
   compara cada preço com o **normal daquela rota naquele mês** (sazonalidade),
   olha bagagem, conexões, horário, disponibilidade e a margem da agência, e
   dá uma **nota de 0 a 100 com o motivo em uma linha**.

**A curadoria é humana.** O robô propõe, a pessoa decide: um funcionário vê a
oferta no painel, analisa, aprova e **posta ele mesmo** no grupo de ofertas.
Nada vai para cliente sozinho. Um robô de Telegram dá acesso rápido.

**Origem:** Brasília (**BSB**) acima de tudo. Internacional pode sair de
**GRU** ou **GIG**.

## 3. Como o sistema está desenhado

```
  [ Fontes ]  APIs, endpoints, páginas
       │
       ▼
  ┌───────────────────────────────┐
  │  MOTOR — computador dedicado   │   sempre ligado, na agência
  │  coletor · preço normal ·      │   (é aqui que tudo "roda sozinho")
  │  nota · preço de venda · bot   │
  └───────────────┬───────────────┘
                  ▼
  ┌───────────────────────────────┐
  │  SUPABASE — schema `ofertas`   │   o mesmo banco do MilesPro e do VoePro,
  └───────────────┬───────────────┘   cada um no seu schema
                  ▼
  ┌───────────────────────────────┐
  │  PAINEL — Vercel               │   curadoria, aprovação, card, saúde
  └───────────────────────────────┘
```

- **Projeto irmão**, como o VoePro é irmão do MilesPro: código próprio, deploy
  próprio, schema próprio no mesmo Postgres. Quando o VoePro for ao ar, a tela
  de ofertas dele **lê** as tabelas daqui — sem migrar nada.
- **O motor roda num computador dedicado que fica sempre ligado** (decisão do
  Saulo). Ele faz o trabalho contínuo: coletar, calcular, avisar. O painel na
  Vercel só mostra e recebe decisões — **nenhum trabalho contínuo na Vercel**.
- Por o motor ser um computador de verdade, ele **pode** abrir navegador quando
  uma fonte exigir. Mas navegador é o último recurso (ver a escada, seção 6).

## 4. Regras que não se negociam

**Não toque no MilesPro.** Ele fica em
`C:\Users\saulo\programing\Versões MilesPro\miles-pro-ledger`, está em
produção e **não é sua função aqui**. Nem para ler "só para entender". Se
precisar de algo de lá, pergunte à sessão de controle.

**O VoePro é só leitura.** Ele fica em `C:\Users\saulo\programing\srr-crm` e
está sendo construído agora por outras sessões. Você pode **ler** a marca
(`docs/marca.md`) e copiar padrões que funcionaram lá. **Nunca escreva nada
naquela pasta.**

**Segredo não vai para o chat nem para o commit.** `.env` no `.gitignore`.
Senha de banco, token, chave, login de fornecedor — nada disso aparece em texto.
**Você nunca digita senha em site nenhum**: credenciais de fornecedor quem
coloca no `.env` é o Saulo.

**Respeito às fontes.** Fonte é parceira, não alvo:
- não contorne CAPTCHA nem proteção anti-robô; se a fonte exige isso, registre
  na ficha e pare;
- ritmo educado — poucas requisições, espaçadas, com cache;
- nunca reserve, compre ou emita nada.

**Configuração é dado, não código.** Rotas, pesos da nota, tetos, margens,
quais fontes estão ligadas: tudo que o Saulo vai querer mudar mora em tabela e
se edita no painel, não em constante.

**Não comece a construir sem ordem.** Perguntas → plano → aprovação → código.

## 5. A pilha e as armadilhas herdadas do VoePro

A mesma pilha do VoePro, para os dois se juntarem sem atrito:

- **Next.js 16.3.4**, **React 19.2.8**, **Prisma 7.10.0** (fixado de propósito),
  **CSS Modules** (nada de Tailwind). Esta versão do Next quebra convenções —
  leia `node_modules/next/dist/docs/` antes de escrever.
- **Supabase Postgres**, schema **`ofertas`**. O `datasource` do Prisma declara
  **apenas** `schemas = ["ofertas"]`, para nenhuma migração alcançar outro
  sistema nem por engano.

Armadilhas que custaram horas no VoePro e valem igual aqui:

- **A migração sai sem o nome do schema.** Escreva o SQL qualificando tudo
  (`"ofertas".tabela`) e confira antes de aplicar:
  `grep -nE '(TABLE|INDEX) "[a-z_]+"' migration.sql | grep -v '"ofertas"\.'`
  — não pode sair nada.
- **Pasta da migração com hora UTC:** `date -u +%Y%m%d%H%M%S`.
- **Banco inacessível (`P1001`) quase sempre é IPv6:** use o endereço `pooler`.
- **Depois de migrar, reinicie o servidor** — o Next guarda o desenho antigo.
- **React 19 é estrito:** nada de `setState` em `useEffect` para copiar prop,
  nada de `Date.now()` durante a renderização.
- **O shell do Windows come crases:** escreva arquivos com a ferramenta de
  escrita; mensagem de commit por arquivo (`git commit -F`).
- **Teste no banco, não na tela.** Confirme com consulta antes de dizer pronto.

## 6. A escada de acesso às fontes

Toda fonte é encaixada no degrau **mais alto** que ela permitir:

| degrau | como | ganha | custa |
|---|---|---|---|
| 1. API oficial | acesso autorizado pelo fornecedor | estável, completo, autorizado | depende do fornecedor liberar |
| 2. Endpoint interno | o JSON que o próprio site usa | rápido, barato | muda ou bloqueia sem aviso |
| 3. Página | ler o HTML | simples | quebra quando o layout muda |
| 4. Navegador | robô que pesquisa como uma pessoa | quase sempre funciona | lento, pesado, gargalo |

**Toda fonte, de qualquer degrau, entrega o mesmo formato de oferta.** O resto
do sistema não sabe de onde a oferta veio. Quando uma consolidadora liberar API,
troca-se o conector daquela fonte e mais nada.

O Saulo pediu acesso de API às consolidadoras e operadoras com quem trabalha.
Smiles e Melhores Destinos já se mostraram acessíveis por endpoint (degrau 2).

## 7. Lições do Radar da HUB 92

Existe um sistema parecido em outra agência. Não temos o código, mas temos o
manual de funcionamento em [`../referencias/radar-hub92.md`](../referencias/radar-hub92.md).
Leia. O que ele ensina, e que este projeto já nasce corrigindo:

1. **"Oferta boa" lá era só um teto fixo.** Aqui é comparação com o normal da
   rota no mês (etapas O4 e O5).
2. **Aprovação por reação 👍 no WhatsApp** mandava card para cliente por
   descuido, e qualquer pessoa do grupo aprovava. Aqui a aprovação é **botão,
   com nome de quem aprovou**.
3. **O mesmo evento chegava várias vezes** e um card saiu 6× para clientes.
   Toda ação que publica ou aprova tem **trava contra repetição**.
4. **Preço velho chegava ao cliente.** Aqui o preço é **revalidado na hora de
   aprovar**, e a oferta tem validade.
5. **Configuração vazia caía num padrão escrito no código** (o grupo interno
   vinha "de fábrica"). Aqui, **faltou configuração, o sistema para e avisa** —
   nunca adivinha.
6. **O vigia só via se o processo estava vivo**, não se produzia. Aqui vigia-se
   **produção** ("nenhuma oferta em X horas", "fonte Y falhou N vezes").
7. **Margem de 10% + 10% sobre o custo** dava 8% de comissão real depois do
   cartão. A conta de preço de venda é decidida com o Saulo, explicitamente.
8. **A soma de duas pernas só de ida ≠ o ida-e-volta real.** Nunca apresentar
   uma como a outra.
9. **Navegador sem prazo** deixava abas órfãs e entupia a fila. Toda busca tem
   prazo e devolve o recurso, aconteça o que acontecer.
10. **Código de rastreio curto colide.** Tem que ser único no banco.
11. **Fonte de login (PassHub) morreu com MFA** e derrubou tudo que dependia
    dela. Nenhuma fonte é insubstituível.

## 8. Vocabulário da casa

| termo | quer dizer |
|---|---|
| **fonte** | um lugar de onde vêm preços (Smiles, Melhores Destinos, uma consolidadora) |
| **conector** | o código que fala com uma fonte e devolve ofertas no formato padrão |
| **coleta** | uma ida a uma fonte; fica registrada, com sucesso ou erro |
| **oferta** | um preço encontrado: rota, datas, voo, valor, de onde veio, quando |
| **preço normal** | quanto aquela rota costuma custar naquele mês |
| **nota** | 0 a 100, quão extraordinária é a oferta, com o motivo |
| **curadoria** | a pessoa que analisa, aprova ou descarta |
| **card** | a arte e a legenda prontas para postar |

## 9. Como saber que você terminou

1. `npm run check` passa (quando o projeto já existir).
2. Você **usou o que construiu de verdade** e confirmou o resultado **no banco**.
3. Está commitado, em português, com a mensagem explicando _por quê_.
4. Você atualizou `docs/etapas/README.md`: marcou sua etapa e escreveu o que a
   próxima precisa saber.
5. Você **avisou o Saulo e parou.** A sessão de controle revisa com ele.

Se algo ficou bloqueado, **entregue todo o resto e diga o que ficou de fora e
por quê.** Reduzir o escopo por conta própria não é opção.
