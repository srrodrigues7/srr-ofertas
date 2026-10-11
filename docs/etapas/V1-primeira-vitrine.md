# Etapa V1 — Primeira vitrine

**Esforço: alto.** É a primeira vez que o sistema encontra preço de verdade.

## O objetivo, em uma frase

**Abrir o painel no computador e ver ofertas reais saindo de Brasília**, vindas
da **Smiles** e do **Melhores Destinos**, atualizando sozinhas.

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
- **Toda coleta fica registrada** (fonte, rota, quando, deu certo ou erro, quanto
  tempo) e **todo preço fica no histórico** — é o que vai dizer o "normal" de
  cada rota depois.
- As **rotas a buscar ficam em tabela**, editáveis na tela, começando por BSB
  para os destinos que o Saulo escolher.

### 3. O motor buscando sozinho

O motor da O0 passa a, a cada passada, ir às fontes em ritmo educado (poucas
buscas, espaçadas, com prazo — nada fica pendurado) e gravar o que achou.

### 4. A tela de Ofertas

A tela que o Saulo vai querer abrir todo dia:

- lista das ofertas encontradas: rota, datas, companhia, preço (reais ou
  milhas + taxas), bagagem, conexões, fonte, **há quanto tempo foi visto**;
- filtros simples (destino, fonte, mês de embarque) e ordenação por preço;
- **botão "Buscar agora"** para uma rota, sem esperar o motor;
- a tela de **Rotas**: adicionar, tirar, ligar e desligar rotas.

Ainda **sem nota, sem aprovação, sem card** — isso vem nas próximas etapas.

## Perguntas de negócio que esta etapa leva ao Saulo

Com alternativas e recomendação (`00-contexto.md`, seção 1). No mínimo:

1. **Quais destinos** saindo de BSB entram na primeira lista? E já entram
   internacionais por GRU/GIG, ou depois?
2. **Milhas aparecem na vitrine** junto com dinheiro, ou separado?
3. **Quantos meses à frente** buscar?
4. **Ida e volta, só ida, ou os dois?**

## Regras desta etapa

As do `00-contexto.md`, e especialmente: você nunca digita senha (credencial é
o Saulo quem coloca no `.env`); não contorne CAPTCHA nem proteção anti-robô;
ritmo educado; nunca reserve, compre ou emita nada.

## Fora do escopo

Nota e preço normal (V2), outras fontes (V3.x), preço de venda, aprovação e card
(V4), Telegram (V5), Vercel/GitHub/login/computador dedicado (L).

## Como a revisão vai conferir

- O Saulo abre o painel e vê ofertas reais de BSB das duas fontes.
- Deixa o motor rodando um tempo e vê as ofertas se atualizando e o histórico
  crescendo no banco.
- "Buscar agora" traz resultado na hora.
- Uma fonte fora do ar (simulada) não derruba a outra nem o motor, e o erro
  fica registrado.
- As duas fichas escritas, com o que não vem dito explicitamente.
