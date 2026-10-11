# Etapa V1a — Primeira vitrine: passagens

**Esforço: alto.** É a primeira vez que o sistema encontra preço de verdade, e
o molde de oferta criado aqui é usado por todas as fontes que vierem.

## O objetivo, em uma frase

**Abrir o painel no computador e ver ofertas reais de passagem saindo de
Brasília**, vindas da **Smiles** e do **Melhores Destinos**, atualizando
sozinhas, com custo e preço de venda.

A primeira vitrine tem duas metades que andam juntas: esta (passagens) e a
**V1b** (pacotes: Cativa e Hoteldo). A V1b investiga as operadoras enquanto
você constrói, e depois pluga os pacotes **no molde e na tela que você
criar**. Por isso o molde precisa nascer pronto para pacote também (ver
seção 2).

## Por que esta etapa existe assim

O Saulo trabalha melhor vendo o sistema funcionar e indo uma peça por vez — foi
assim com as extensões do MilesPro: uma funcionando, depois a outra, depois
ligar tudo. Então esta etapa vai **direto ao ponto**: investigar a fonte,
plugar e **mostrar na tela**, no mesmo movimento. Estrutura de publicação
(Vercel, GitHub, login, instalação no computador dedicado) fica para o fim, numa
etapa própria de "ligar tudo".

Tudo roda **local**: o painel com `npm run dev` e o motor num terminal, em cima
do que a O0 deixou pronto (leia "O que cada etapa deixou pronto" no
`README.md`).

## O que entregar

### 1. Investigar e plugar Smiles e Melhores Destinos

Para cada uma, no navegador do app: fazer uma busca de verdade saindo de BSB,
observar as requisições de rede, achar de onde vêm os preços e encaixar no
degrau mais alto da escada (`00-contexto.md`, seção 6). As duas já se sabe que
respondem por endpoint interno.

Uma **ficha curta** por fonte em `docs/fontes/<fonte>.md`: como se acessa, o que
vem e o que **não** vem (bagagem? conexões? assentos? ida-e-volta real ou só
pernas? preço ao vivo ou cache?), limites observados, risco. A lista completa
de perguntas está em [O1-raio-x-das-fontes.md](O1-raio-x-das-fontes.md) — use
como checklist, sem burocracia.

Em especial: **a fonte dá o preço dia a dia de uma rota para os próximos
meses (calendário)?** Isso alimenta a nota da etapa seguinte.

### 2. Guardar o que encontrou

- Um formato único de oferta no schema `ofertas` — o mesmo para as duas fontes
  e para todas as que vierem. Pense nele como o molde do sistema inteiro.
  **Ele tem que caber pacote** (aéreo + hotel, regime como all inclusive,
  noites, preço por pessoa, parcelas sem juros da operadora) e **executiva**,
  além de passagem econômica. Documente o molde no `README.md` das etapas: a
  V1b vai encaixar os pacotes nele.
- Guarde os detalhes do voo que a nota da V2 vai usar: **horários de saída e
  chegada, direto ou com conexão (e quantas), duração, bagagem, classe,
  assentos restantes** — o que a fonte der.
- **Toda coleta fica registrada** (fonte, rota, quando, deu certo ou erro, quanto
  tempo) e **todo preço fica no histórico** — é o que vai dizer o "normal" de
  cada rota depois.
- As **rotas a buscar ficam em tabela**, editáveis na tela, começando por BSB
  para os destinos que o Saulo escolher.

### 3. O motor buscando sozinho

O motor da O0 passa a, a cada passada, ir às fontes em ritmo educado (poucas
buscas, espaçadas, com prazo — nada fica pendurado) e gravar o que achou.

### 4. A tela de Ofertas

A tela que o Saulo vai querer abrir todo dia. É a **visão da equipe** (mostra
tudo, inclusive de onde veio) e é usada **no computador** — desenhe para tela
grande. A mensagem para o grupo de clientes é outra coisa, e vem na V4.

- lista das ofertas encontradas: rota, datas, companhia, classe, custo e
  **preço de venda** (com parcelas), milhas + taxas quando for o caso,
  bagagem, conexões, horários, **fonte**, **há quanto tempo foi visto**;
- filtros simples (destino, fonte, mês de embarque) e ordenação por preço;
- **botão "Buscar agora"** para uma rota, sem esperar o motor;
- a tela de **Rotas**: adicionar, tirar, ligar e desligar rotas.

Ainda **sem nota, sem aprovação, sem card** — isso vem nas próximas etapas.

### 5. Configuração (tudo editável na tela, nada fixo no código)

Decisões do Saulo, já tomadas:

- **Destinos:** uma tela onde o Saulo cadastra os destinos principais. Ele vai,
  mais adiante, levantar na base de clientes quais são os preferidos — então a
  lista muda, e quem muda é ele, na tela.
- **Milhas viram reais.** Uma tela de valores com o **preço do milheiro por
  programa** (Smiles, LATAM Pass, Azul Fidelidade…) — o Saulo só preenche.
  Oferta em milhas mostra o custo em reais: `milhas ÷ 1000 × preço do milheiro
  + taxas`. Assim milhas e dinheiro ficam comparáveis na mesma lista.
- **Margem só em milhas.** Oferta de consolidadora/operadora/companhia já tem a
  RAV embutida: o preço dela é o de venda. Em milhas, **uma margem por tipo**
  (nacional, internacional, executiva, pacote…), cada uma com **percentual e
  valor mínimo em reais — vale o maior dos dois**. Ex.: 15% e R$ 150 → custo
  R$ 400 leva R$ 150; custo R$ 3.000 leva R$ 450.
- **Parcelas.** Em milhas, a venda é cobrada por link de pagamento, que cobra
  taxa: uma **tabela de taxa (%) por número de parcelas**, configurável, e o
  sistema mostra o valor da parcela. Quando a fonte já oferece parcelas sem
  juros, mostre as dela.
- **Horizonte de busca:** configurável, **pelo menos 8 meses**, com **mais
  atenção aos primeiros meses** — os meses próximos são buscados com mais
  frequência que os distantes. A frequência por faixa de meses também é
  configuração.
- **Ida e volta é a prioridade.** Só ida pode existir, mas não é o foco.
- **Classes: econômica e executiva.**
- **Internacional** pode sair de GRU ou GIG, além de BSB.
- **Login de programa de milhas:** se a Smiles (ou outro) exigir login para
  buscar, deixe um lugar na configuração para o Saulo inserir a conta de acesso.
  Ele acha que não vai precisar.

## Perguntas de negócio que esta etapa leva ao Saulo

Com alternativas e recomendação (`00-contexto.md`, seção 1). As perguntas
gerais do projeto o Saulo já respondeu na bateria da sessão de controle (o que
ficou decidido está no `README.md`); pergunte só o que for específico desta
etapa e ainda estiver em aberto.

## Regras desta etapa

As do `00-contexto.md`, e especialmente: você nunca digita senha (credencial é
o Saulo quem coloca no `.env`); não contorne CAPTCHA nem proteção anti-robô;
ritmo educado; nunca reserve, compre ou emita nada.

## Fora do escopo

Pacotes (V1b, em paralelo), réguas de preço bom, nota e preço normal (V2),
outras fontes (V3.x), aprovação e mensagem para o grupo (V4), Telegram (V5),
Vercel/GitHub/login/computador dedicado (L).

## Como a revisão vai conferir

- O Saulo abre o painel e vê ofertas reais de BSB das duas fontes.
- Deixa o motor rodando um tempo e vê as ofertas se atualizando e o histórico
  crescendo no banco.
- "Buscar agora" traz resultado na hora.
- Uma fonte fora do ar (simulada) não derruba a outra nem o motor, e o erro
  fica registrado.
- As duas fichas escritas, com o que não vem dito explicitamente.
