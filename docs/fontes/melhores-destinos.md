# Melhores Destinos — ficha

**Veredito: construída (V1a).** Conector: `src/lib/coleta/fontes/melhores-destinos.ts`.

## Acesso

Degrau 2: o "mural" de passagens achadas nas últimas 24 h, pelo endpoint
aberto que a própria página inicial usa. Sem login, sem chave, sem proteção
vista. ~0,3–1 s por chamada.

- `GET passagensaereas.melhoresdestinos.com.br/api/v1/twd/web/categories?from_iata_code=BSB`
  → categorias (Brasil, Estados Unidos, Europa — com subcategorias —, América
  do Sul…) → cidades (~136 saindo de BSB).
- `GET …/twd/web/itinerary_prices/{ORIGEM}/{DESTINO}?month=AAAA-MM&min_stay=N&max_stay=M`
  → o **menor preço de cada um dos 12 meses** + as **datas de um mês** (sem
  `month`, do mês mais barato). Aceita código de aeroporto ou de cidade
  (GRU = SAO).
- Lista de origens: `…/api/v1/airports/origins` (192).

## O que vem

Por par de datas: ida, volta, estadia, **preço ida e volta real em reais, por
pessoa**, companhia (código), tipo de bagagem (`checked_luggage`,
`carry_on_luggage_only`, `personal_item_luggage`, `luggage_not_specified`),
programa de milhas (quase sempre vazio), site onde foi achado (Zupper, Decolar,
CVC, ViajaNet, site da companhia) e o link.

**Não vem:** horário, nº do voo, conexões, duração, assentos, executiva
(`booking_class` é ignorado), parcelas, quando exatamente aquele preço foi
visto (só "nas últimas 24 h"; a categoria traz `cheapest_itinerary_price_found_at`).

## Ida e volta, calendário, frescor

- Ida e volta **real** (o par vendido junto): `composicao = ida_volta`.
- Calendário: por mês, 12 meses à frente; dia a dia para um mês por chamada.
  Vai para `preco_observado` (tipos `mes` e `ida_volta`).
- É preço público de site de venda, de até 24 h atrás: pode ter sumido. Serve
  de **sinal**; a equipe confirma na consolidadora antes de postar.

## Preço (decisão do Saulo, V1a)

Entra como **custo** e soma a margem (como milhas), com as parcelas do link.

## Risco

Endpoint interno sem contrato: pode mudar sem aviso. Plano B: a página
`melhoresdestinos.com.br` (degrau 3). Ritmo: `md.pausa_ms` entre chamadas,
varredura a cada `md.intervalo_horas`.

## O que mais o MD tem (não usado)

Posts editoriais de promoção (WordPress), inclusive **emissões com milhas**
("Brasília–Buenos Aires por 32 mil milhas Smiles o trecho") — texto, não dado
estruturado. Candidato a uma V3.x se valer a pena.
