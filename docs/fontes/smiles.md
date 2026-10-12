# Smiles — ficha

**Veredito: construída (V1a).** Calendário por endpoint aberto; detalhe por
endpoint chamado de dentro de uma janela do Edge. Conector:
`src/lib/coleta/fontes/smiles.ts`. Provas: `scripts/provas/smiles-detalhe.ts`.

## Acesso

| caminho | degrau | como | login/chave | proteção |
|---|---|---|---|---|
| **Calendário** `api-air-calendar-<env>.smiles.com.br/v1/airlines/calendar/month` | 2 | requisição simples | nenhum | nenhuma (não está na lista `protectURL` da própria Smiles) |
| **Busca completa** `api-air-flightsearch-<env>…/v1/airlines/search` | 4 | `fetch` de dentro de uma página do Edge aberta em smiles.com.br | chave pública `x-api-key` (lida na configuração pública `ldrelay-<env>…/sdk/evalx/…`, a mesma que o site usa) | **Akamai**: requisição simples → 406; Edge sem janela (headless) → nem dispara; Edge **com janela** → 200 |
| **Taxa de embarque** `api-airlines-boarding-tax-<env>…/v1/airlines/flight/boardingtax` | 4 | idem, com os cookies da página | — | Akamai |

- `<env>` é `green` ou `blue`: vem de `https://www.smiles.com.br/mfe-apps/check-env.txt` (o conector lê e guarda 1 h).
- **Não disfarçamos nada**: navegador comum, com janela (minimizada). Se o Akamai passar a recusar, a coleta registra "bloqueado" e a fonte fica em paz por `coleta.pausa_apos_bloqueio_min`.
- Login: **não precisa**. Nada foi feito com conta.
- Tempo: calendário ~0,5–1 s; busca completa ~6–12 s; taxa ~1,5 s; abrir o Edge ~8 s.

## O que vem

**Calendário** (por sentido, só ida, por pessoa): o **menor preço em milhas do
dia** (tarifa **Clube Smiles**), para qualquer intervalo — 6+ meses numa
chamada; com `forceCongener=true`, as parceiras. Traz também uma faixa
`priceRange`/`Quartil` (a própria Smiles classificando "melhor valor / normal /
acima da média" — vale olhar na V2). Cidade e país dos aeroportos.
**Não vem:** companhia (só "GOL" × "parceira"), voo, horário, conexões,
bagagem, taxas, assentos, preço sem Clube, **executiva** (o parâmetro `cabin` é
ignorado).

**Armadilha:** o mês cujo `startDate` não é o dia 1 volta **vazio**. O conector
sempre pede do dia 1 e descarta os dias antes.

**Busca completa** (um dia, só ida): todos os voos, com horários (hora local),
nº dos voos, conexões, duração, classe (inclusive **executiva** com
`cabin=BUSINESS`), bagagem (`free`/`quantity`), **assentos restantes** (para em
9), e por voo as tarifas: `SMILES` (normal), `SMILES_CLUB`, `SMILES_MONEY(_CLUB)`
(milhas + dinheiro) e, na GOL, `MONEY` (o preço **em reais** do mesmo voo).
Taxa: na GOL vem na tarifa (`g3.costTax`); nas parceiras, só a da companhia
(`airlineTax`) — a taxa completa sai da chamada `boardingtax`
(`totals.totalBoardingTax.money`).

## Ida e volta

Em milhas a Smiles cobra **por trecho**: o preço do ida-e-volta é a soma dos
dois (conferido no calendário: 28 dias, zero diferença entre o trecho dentro de
um ida-e-volta e o só-ida). A oferta guarda `composicao = soma_trechos`.

## Calendário (para a V2)

Sim: dia a dia, 2 chamadas por rota (ida e volta) cobrem o horizonte; o
conector divide por faixa de meses para buscar os próximos mais vezes. Todo dia
vira `preco_observado` (tipo `trecho`).

## Frescor e risco

- O calendário pode divergir da busca (ex.: o dia some ou muda); por isso as
  datas mais baratas são **detalhadas** pela busca completa, que corrige o preço.
- Risco principal: o Akamai endurecer e recusar também o Edge com janela. Plano
  B: ficar só com o calendário (taxa estimada) — o sistema já funciona assim
  para as datas não detalhadas.
- A chave pública e os endereços podem mudar; o conector lê ambos na hora.

## Configuração

`smiles.*` em Valores: pausa, prazo, combinações por mês, detalhes por hora,
detalhes por pedido, validade do detalhe, datas de executiva por mês, taxa
estimada nacional/internacional. Programa `smiles` com o milheiro e "Clube".
