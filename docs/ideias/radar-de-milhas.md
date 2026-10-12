# Ideia para o futuro — o Radar de Milhas

Registrada em 11/10/2026, na conversa que desenhou o Radar de Ofertas. **Não é
etapa deste projeto.** Está aqui para o que aprendemos agora ser reaproveitado
quando chegar a vez dele.

## O que é

Um radar **interno** de promoções e oportunidades com milhas, para a operação
de milhas da SRR (o lado do MilesPro). Não vai para cliente: avisa o Saulo e a
equipe quando surge uma oportunidade de comprar, transferir ou acumular barato.

Os sistemas da SRR são um só conjunto — MilesPro (milhas), VoePro (agência),
Radar de Ofertas — e este seria mais um, conversando com os outros.

## O que ele procuraria (exemplos)

- **Bônus de transferência** — Livelo, Esfera e outros bancos para Smiles,
  LATAM Pass, Azul Fidelidade: o percentual, a faixa por clube, o prazo.
- **Compra de pontos com desconto** — Livelo, Esfera, os próprios programas.
- **Clubes** — promoções de assinatura, bônus de entrada.
- **Acúmulo em parceiros** — pontos por real em lojas, shopping dos programas.
- **Promoções de resgate** — tarifas reduzidas, milhas + dinheiro.
- **Mercado de milhas** — o preço do milheiro na compra e na venda (balcões).
- **Cartões** — bônus de adesão.

## A régua: o custo final do milheiro

Toda oportunidade vira **um número só: quanto custa o milheiro no fim da
conta.** Ex.: comprar Livelo a R$ 35 o mil e transferir com 100% de bônus dá
Smiles a R$ 17,50 o mil. Esse número é comparado com:

- o **preço de venda** do milheiro (quanto a SRR vende) → a margem;
- o **custo atual** de reposição;
- o **histórico** daquela promoção (o "normal" de cada programa).

## O que se reaproveita do Radar de Ofertas

| peça do Radar de Ofertas | no Radar de Milhas |
|---|---|
| o **motor** no computador dedicado (passadas, trava, religar sozinho) | igual |
| o **registro de cada coleta** e a tela de **Saúde** | igual |
| a **escada de acesso** às fontes (API > endpoint > página > navegador) e as regras de respeito às fontes | igual |
| **conectores** que traduzem cada fonte para um formato padrão | o formato muda: "oportunidade" em vez de "oferta" |
| **réguas de preço bom** com "boa" e "imperdível", configuráveis | por programa: "milheiro Smiles bom até R$ X, imperdível até R$ Y" |
| **preço normal pelo histórico** (a sazonalidade) | o normal de cada tipo de promoção — bônus de 80% é bom ou comum? |
| **Telegram** com destaque para imperdível | igual, só para a equipe |
| **o e-mail da agência lido pelo sistema** (pensado para códigos de login) | os programas anunciam promoção por e-mail — vira fonte |

Fontes prováveis: os sites e aplicativos dos programas, blogs especializados,
o e-mail da agência, os balcões de milhas.

## O que só o MilesPro sabe — e faz a diferença

Cruzando com o MilesPro, o radar diria não só "tem bônus de 100%", mas
"**vocês têm saldo Livelo em tais contas para aproveitar**, rende tanto". Isso
exige a ligação com o MilesPro (o mesmo tema da etapa M do VoePro).

## O que o Radar de Ofertas faz agora para facilitar

O **núcleo** — motor, registro de coletas, saúde, alertas — não deve saber que
o que coleta é passagem. Assim ele serve aos dois radares sem ser reescrito.
