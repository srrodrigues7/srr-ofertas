# Etapa V2 — A nota

**Esforço: alto.** É o motor de inteligência — o diferencial da agência. Regra
nova, configuração rica, e um erro aqui põe oferta comum no topo ou esconde a
imperdível.

## O objetivo, em uma frase

Para cada oferta da vitrine, **dizer se ela é comum, boa ou imperdível — e
por quê, em uma linha** — e pôr as melhores no topo.

## Por que isso importa

Preço sozinho não diz nada: R$ 650 em Brasília–Maceió é ótimo em janeiro e
comum em maio. Sem uma referência, ninguém sabe se a oferta é boa. A nota dá
essa referência de dois jeitos, que se completam.

## O que entregar

### 1. As réguas de preço bom (o Saulo configura)

Decisões do Saulo (ver "Bateria de perguntas" no `README.md`):

- Cada régua tem **dois degraus: "boa até R$ X" e "imperdível até R$ Y"**.
- **Preço fechado por pessoa**, não por diária.
- A régua vale para um **tipo** (Aéreo econômica, Aéreo executiva, Pacote,
  All inclusive…) e um **onde** (região, país ou cidade — "América do Sul",
  "Argentina", "Buenos Aires", "Nordeste", "Santiago").
- **A mais específica vence**: Buenos Aires vence Argentina, que vence América
  do Sul, que vence "qualquer lugar".
- **A tela é de seleção rápida**, como o Saulo descreveu: ele digita "América
  do Sul", escolhe na lista (fica como um botão selecionado), clica em "Aéreo",
  e informa os dois valores. O cadastro `Lugar` da V1a (cidade, país, região,
  estilo) é a base da lista.

### 2. O preço normal da rota (o sistema aprende)

Para cada rota, mês de embarque e classe, **quanto aquilo costuma custar**:

- **Agora:** o calendário de preços futuros que as fontes já dão (o mesmo
  mês, os meses vizinhos, os outros dias). A Smiles inclusive manda uma faixa
  própria ("melhor valor / normal / acima da média") — veja na ficha.
- **Com o tempo:** o histórico (`preco_observado`), que cresce a cada passada.
- Uma oferta **muito abaixo do normal** ganha pontos, mesmo sem régua.
- **Falsa promoção:** preço que subiu antes de "cair" para o normal não é
  oferta. O histórico denuncia.

### 3. Preferências de voo (o Saulo configura)

Pontos a mais ou a menos, cada um um campo na tela:

- **horários que ninguém quer** (ex.: saída ou volta entre 0h e 5h) perdem
  pontos — os bloqueios da Cativa estão cheios de volta às 4h45;
- **voo direto** ganha de conexão;
- bagagem incluída, poucos assentos (urgência), prazo de emissão perto.

Para pacote: regime (all inclusive), categoria do hotel, noites.

O Saulo aceitou simplificar se algo for complexo demais: **o importante é
gerar resultado.** Comece pelo que mais pesa (régua + normal + horário) e
deixe o resto como ajuste.

### 4. A nota e o motivo

- Uma **nota de 0 a 100** e um **selo**: comum · boa · **imperdível**.
- **O motivo em uma linha**, que a curadoria lê e entende: *"38% abaixo do
  normal para janeiro · voo direto · imperdível pela régua Nordeste"*.
- Guardada na oferta e recalculada quando o preço, a régua ou o normal mudam.

### 5. Na vitrine

- Ordenar por nota (padrão) e filtrar por selo.
- **Imperdíveis com destaque** visual forte — decisão do Saulo, vale para o
  painel e, depois, para o Telegram.
- O **limite de ofertas por dia** para o grupo é configuração (o Saulo quer
  muitas). A V2 marca as candidatas; quem publica é a V4.

## Como esta etapa convive com a V4

A V4 (card, legenda e aprovação) corre **em paralelo**. O contrato entre as
duas: **a V2 grava na oferta a nota, o selo e o motivo; a V4 só lê.** Combine
os nomes dos campos cedo e escreva no `README.md` das etapas assim que
decidir — a V4 vai usar. Evite mexer nas mesmas telas: a V2 cuida da vitrine
(Passagens e Pacotes) e das telas de réguas e preferências; a V4 cria telas
novas.

## Perguntas de negócio que esta etapa leva ao Saulo

Só o que muda o que vai ser construído, na caixa de seleção. Prováveis: como
pesar régua contra normal quando discordam; quais preferências de voo entram
primeiro; se oferta "boa" já aparece no destaque ou só a imperdível.

## Fora do escopo

Card, legenda, aprovação e publicação (V4); Telegram (V5); gosto do cliente
(no radar, futuro).

## Como a revisão vai conferir

- O Saulo cadastra réguas na tela de seleção rápida e vê as ofertas mudarem
  de selo.
- Cada oferta tem nota e motivo legível.
- Um voo de volta às 4h45 perde para um de horário bom, com o motivo dizendo
  isso.
- As imperdíveis se destacam na vitrine.
