# Ficha — Expedia TAAP

_Etapa V3a, investigação interrompida em 15/10/2026 por decisão do Saulo. A
parte logada não foi observada. Interesse da SRR: **hotel e resort fora do
Brasil** (Cancún, Punta Cana, Orlando, Europa)._

**Veredito: depois.** O Saulo quer ser lembrado dela no futuro.

**O que se achou:** o TAAP (o programa de afiliados da Expedia para
agências; o agente ganha **comissão** sobre o preço, então o preço mostrado é
o de venda) **não é caminho para robô**:
- **nada sem login** — a busca manda para a tela de entrada;
- o **login tem CAPTCHA** (Arkose);
- o `robots.txt` da Expedia **proíbe robôs** em `/Hotel-Search`,
  `/Flights-Search`, `/MultiItemCheckout` (pacote)… (o do TAAP responde 403);
- a plataforma **desafia programas**: uma página de termos respondeu 429
  "Você é ou não um robô? Mostre que você é uma pessoa."

**O caminho, quando voltar:** a **Rapid API** da **Expedia Partner Solutions**
— hotéis do mundo todo com preço e disponibilidade ao vivo, estrelas, regime,
cancelamento e um "price check" que serviria de revalidador. **Expectativa
baixa:** a Expedia aprova caso a caso e não publica os critérios (relatos:
receita, volume, site de vendas); agência que só quer consultar pode ouvir
"não". A **API de back-office do TAAP** (jun/2026) só traz as reservas já
feitas — não serve ao radar (talvez ao VoePro, um dia).

Prova: `node scripts/provas/expedia-taap-aberto.ts` (quatro consultas leves:
robots.txt, busca que exige login, login com desafio, documentação da Rapid).

## Pedido — texto para o Saulo mandar à Expedia, quando quiser

_(pelo gerente de contas do TAAP, se houver; senão, pelo formulário de
parceiros da Expedia Partner Solutions)_

> Olá. Aqui é o Saulo, da SRR Viagens (Brasília), agência afiliada ao Expedia
> TAAP. Vendemos muito **hotel e resort fora do Brasil** e estamos montando um
> sistema interno que acompanha preços para divulgarmos ofertas aos nossos
> clientes — sempre reservando pelo TAAP. Queremos fazer isso pela
> **integração oficial**, e não lendo o portal:
> 1. a SRR pode ter acesso à **Rapid API** (ou outra API da Expedia Partner
>    Solutions) **só para consulta de preço e disponibilidade de hotéis**, com
>    as tarifas de agente do TAAP?
> 2. quais os requisitos e o processo de aprovação para uma agência no Brasil?
> 3. há ambiente de testes, limite de uso e custo?
> 4. as reservas continuam pelo TAAP, com a nossa comissão normal?
>
> Obrigado!
