# Smiles — ficha

**Veredito: construída (V1a), só o calendário.** Conector:
`src/lib/coleta/fontes/smiles.ts`.

## Acesso

| caminho | degrau | situação |
|---|---|---|
| **Calendário** `api-air-calendar-<env>.smiles.com.br/v1/airlines/calendar/month` | 2 | **em uso.** Requisição simples, sem login nem chave, sem proteção (não está na lista `protectURL` da configuração pública da própria Smiles). ~0,5–1 s. |
| **Busca completa** `api-air-flightsearch-<env>…/v1/airlines/search` | — | **bloqueada pelo Akamai — NÃO USAR.** Requisição simples recebe 406. |
| **Taxa de embarque** `api-airlines-boarding-tax-<env>…/v1/airlines/flight/boardingtax` | — | **bloqueada pelo Akamai — NÃO USAR.** |

- `<env>` é `green` ou `blue`: vem de `https://www.smiles.com.br/mfe-apps/check-env.txt`.
- **Por que não se usa a busca completa:** na investigação, um Edge com janela
  conseguia fazer a busca de dentro da página. Mas escolher um jeito de acesso
  *porque* ele passa pela proteção anti-robô é contorná-la, e a regra da casa
  proíbe (`00-contexto.md`, seção 4). Esse caminho foi removido do sistema (revisão
  da sessão de controle, 12/10/2026).
- Login: não precisa para o calendário.

## O que vem (calendário)

Por sentido, só ida, por pessoa: o **menor preço em milhas do dia** (tarifa
**Clube Smiles**), para qualquer intervalo — 6+ meses numa chamada; com
`forceCongener=true`, as parceiras. Traz também `priceRange`/`Quartil` (a
própria Smiles classificando "melhor valor / normal / acima da média" — vale
olhar na V2) e cidade/país dos aeroportos.

**Não vem:** companhia (só "GOL" × "parceira"), voo, horário, conexões,
bagagem, **taxas** (usamos a **taxa estimada** de Valores, e a tela avisa),
assentos, preço sem Clube, **executiva** (o parâmetro `cabin` é ignorado).

**Armadilha:** o mês cujo `startDate` não é o dia 1 volta **vazio**. O conector
pede sempre do dia 1 e descarta os dias antes.

## Ida e volta

Em milhas a Smiles cobra **por trecho**: o ida-e-volta é a soma dos dois
(conferido: 28 dias, zero diferença entre o trecho dentro de um ida-e-volta e o
só-ida). A oferta guarda `composicao = soma_trechos`.

## Calendário (para a V2)

Dia a dia, 2 chamadas por rota (ida e volta) cobrem o horizonte, divididas por
faixa de meses. Todo dia vira `preco_observado` (tipo `trecho`).

## Frescor e risco

- O calendário é um resumo: o dia pode ter sumido na hora de emitir, e a taxa é
  estimada. A equipe confirma na Smiles antes de postar.
- Endpoint sem contrato: pode mudar. Plano B: o acesso oficial (abaixo).

## O caminho legítimo para o detalhe: pedir acesso à Smiles

Texto pronto para o Saulo mandar (canal de agências/parceiros da Smiles, ou o
contato comercial que a SRR já tiver):

> Olá, equipe Smiles.
>
> Sou Saulo Roriz, da SRR Viagens, agência de Brasília que emite passagens com
> milhas Smiles para os nossos clientes. Estamos montando um painel interno para
> a nossa equipe acompanhar a disponibilidade de emissões Smiles (datas, voos,
> milhas e taxas) e oferecer aos clientes as melhores opções — o que aumenta as
> emissões feitas pela Smiles.
>
> Hoje usamos apenas o calendário público de preços. Gostaríamos de saber se a
> Smiles tem um programa de acesso para agências ou parceiros (API ou acesso
> autorizado à busca de voos e às taxas de embarque), quais são as condições e
> como solicitar. O uso seria só consulta, em volume baixo (algumas dezenas de
> buscas por hora), sem reserva automática.
>
> Fico à disposição para conversar.
> Saulo Roriz — SRR Viagens

## Configuração

`smiles.*` em Valores: pausa entre requisições, prazo, combinações por mês,
taxa estimada nacional e internacional. Programa `smiles` com o milheiro e "Clube".
