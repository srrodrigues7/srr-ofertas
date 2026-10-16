# Ficha — Azul Viagens

_Etapa V3a. Investigado em 14–15/10/2026, sem login (o Saulo confirmou que a
busca da Azul Viagens é aberta; o login da agência só é preciso para reservar)._

**Veredito: depois** (o Saulo segurou a fonte em 15/10/2026). **Quando
voltar: só pela API oficial do Juniper — pedido pronto no fim.** A busca do
site é aberta para pessoas e devolve um JSON riquíssimo (voo com número e
horário, hotel com estrelas e regime, preço por pessoa), mas **está protegida
pelo anti-robô da Akamai (Bot Manager)**: por programa, a primeira busca passou
e as seguintes ficaram presas sem resposta. Pela regra da casa, **não é caminho
para robô**. O site roda no **Juniper**, um motor de reservas que tem **API
oficial de pacotes** (busca + conferência de preço ao vivo), com documentação
pública. Quem libera o acesso é a própria Azul Viagens — texto do pedido no fim.

Prova: `node scripts/provas/azul-viagens-aberto.ts`.

---

## Quem é

Operadora da Azul Linhas Aéreas. Vende **pacote aéreo + hotel** (com voo Azul),
hospedagem, ingressos, carro, traslado, seguro, cruzeiros (Krooze) e circuitos
(Europamundo). Vende direto ao cliente final e por agências (mais de 4 mil
agências emitem com ela, segundo a imprensa do setor); a SRR tem cadastro.

## Os caminhos, comparados

| caminho | degrau | o que dá | custa / risco | veredito |
|---|---|---|---|---|
| **vitrine da página inicial** ("Punta Cana a partir de R$ 5.984", "Maceió aéreo + hotel a partir de R$ 1.926"…) | 3 | ~12 destaques com preço "a partir de" e o link da busca | é a mesma página protegida pela Akamai; preço é de uma data escolhida pela Azul, não de BSB | **não usar** |
| **menu "Bloqueios"** (Saída de Aracaju, Belém, Goiânia, Recife…, 30 cidades) | 3 | busca de pacotes com voo bloqueado por cidade de saída | **não há "Saída de Brasília"** hoje; mesma proteção | **não usar** (e não cobre BSB) |
| **busca de pacotes** (`/packages/results.aspx` → `/packages/ashx/results.ashx`, o JSON que o próprio site usa) | 2 | tudo (ver "O que vem") | **Akamai Bot Manager**: o site carrega o sensor dele em toda página e entrega os cookies de vigilância (`bm_sz`, `bm_s`…); por programa a 1ª busca passou e as seguintes ficaram **presas 60 s sem resposta** enquanto o `robots.txt` respondia em 0,4 s | **não é caminho para robô** |
| **área da agência** (`agencias.azulviagens.com.br`, login de agente) | 4 | a mesma busca, provavelmente com a comissão da agência | mesmo sistema, mesma Akamai; o Saulo diz que o login só é preciso para reservar | **não automatizar** |
| **API do Juniper** (JP WebService, XML) | 1 | **busca de pacotes** (`PackageAvail`), **conferência de preço e vaga** (`PackageCheckAvail`), conteúdo (destinos, pacotes, hotéis); também hotel, voo, traslado, ingresso avulsos | depende de a Azul Viagens pedir ao Juniper a integração para a SRR; ambiente de testes antes; IP do computador do motor cadastrado | **o caminho, quando voltar** |

O `robots.txt` **libera** robôs (só esconde modelos de página `*.hbs`) — não é
ele que barra, é a Akamai.

## O que vem (o que o site mostra na busca, visto no navegador)

Busca feita como uma pessoa: **BSB → Maceió, 18 a 23/02/2027, 2 adultos, 1
quarto**. Resultado: **55 hotéis**, de **R$ 5.178 a R$ 23.696** (para os dois,
com aéreo). Os campos vêm do JSON `results.ashx`:

| campo | vem? | como |
|---|---|---|
| origem, destino | sim | IATA e cidade; códigos internos do Juniper (`originID`, `destinationID`) |
| datas | sim | **data exata** de ida e de volta; noites. Há um calendário "outras datas disponíveis" (`getFeaturedDates`) |
| **preço** | sim | **por pessoa** e **do pacote** ("PREÇO POR PESSOA R$ 2.553,17 · PREÇO DO PACOTE R$ 5.106,34"); por hotel: total, base e **taxas separadas** (ex.: R$ 5.106,34 + R$ 171,98) |
| **aéreo do pacote** | sim | companhia (Azul), **número do voo**, horários, conexões, classe tarifária e base tarifária (ex.: AD4148 BSB-CNF 19:20 + AD4604 CNF-REC + AD4556 REC-MCZ; volta AD4290 + AD4673) |
| **bagagem** | sim | "não incluída" / incluída, por trecho; filtro "franquia de bagagem" na busca |
| **classe** | sim | Econômica / Executiva na busca (`cabinType`) |
| hotel | sim | nome, endereço, bairro, coordenadas, descrição, fotos |
| **estrelas** | sim | `categoryID` 2 a 5 (o resumo da busca conta hotéis por estrela) |
| **regime** | sim | por opção de quarto: "Somente quarto", "Café da manhã", "Half Board" (meia pensão), **All Inclusive**… (o resumo traz os totais por regime) |
| tipo de quarto | sim | "Quarto standard com uma cama de casal e um sofá-cama" |
| **cancelamento** | sim | reembolsável ou não, por opção |
| vagas | **não confiável** | `availableRooms: 999` (não informa) |
| **parcelas** | só na vitrine | os destaques da página inicial anunciam "10x" (ex.: Orlando "a partir de 10x R$ 316,30"); a busca não mostra parcelas (aparecem no pagamento) — o número de parcelas sem juros precisa vir da API ou de configuração |
| **pontos TudoAzul** | sim | a busca pode exibir o valor **em pontos** ("Exibir valores em: Reais / Pontos") — interessante para quem paga pacote com pontos |
| comissão / RAV | **não** (sem login) | os campos de comissão vêm zerados; o preço é o **público, de venda** |
| quando foi cotado | ao vivo | `availOrigin: resultsCache` — o próprio site usa um cache curto |

### Características para casar com o gosto do cliente

| característica | vem? | de onde |
|---|---|---|
| regime | **sim** | por opção de quarto (All Inclusive incluso) |
| estrelas | **sim** | categoria 1–5 |
| praia ou cidade | indireto | bairro/zona ("Pajuçara", "Jatiúca", "Ponta Verde") e coordenadas; a vitrine separa "Destinos Azul", "Caribe", "Nordeste" |
| região / país / cidade | **sim** | árvore de zonas do Juniper (país, estado, cidade, bairro) |
| criança | **sim** | a busca pede idade das crianças; o preço muda |
| tipo de quarto | **sim** | nome do quarto |
| companhia aérea | **sim** | sempre Azul (é a operadora da Azul) |

## Busca por mês? Calendário?

**Não por mês.** A busca é por **data exata**; o site mostra "outras datas
disponíveis" num calendário (só disponível/não disponível, sem preço). Para o
preço normal da V2, cada data custa uma busca. Pela API do Juniper vale o mesmo
(busca por data), mas sem anti-robô e com limite combinado.

## Preço de venda? (a RAV)

Sem login, o preço é o **público, de venda** (comissão zerada no JSON). Na
operadora a RAV vem embutida (decisão do Saulo): **o preço da Azul Viagens é a
venda**, `aplica_margem = false`. Pela API, o Juniper devolve preço e (se a
Azul configurar) a comissão da agência — perguntar no pedido.

## Dá para conferir o preço ao vivo (revalidador)?

**Pela API, sim:** `PackageCheckAvail` confere pacote, produtos, vaga e preço
de uma opção (o `RatePlanCode` que a busca devolve). **Pelo site, não** (é o
caminho protegido).

## Risco e plano B

| risco | plano B |
|---|---|
| a Azul Viagens não libera a API | fica fora do robô; pacotes vêm da Cativa (e, quando houver, de outras operadoras com API) |
| a API do Juniper não traz o mesmo preço do site (canal diferente) | comparar na homologação: buscar o mesmo pacote no site (pessoa) e na API |
| integração XML dá trabalho | o conector é um só para qualquer operadora em Juniper (ver abaixo) |

## O que se reaproveita

- **Juniper é usado por muitas operadoras.** O conector da API do Juniper
  serve para qualquer operadora que rode nele, trocando endereço e usuário.
  Para saber se outra operadora do Saulo usa Juniper: o rodapé do site diz
  "Powered by Juniper", ou o endereço tem `.aspx` e `/packages/results.aspx`.
- O formato da oferta de pacote é o mesmo da Cativa (`tipo = 'pacote'`, hotel,
  regime, noites, preço por pessoa, voo).

## Pedido — texto para o Saulo mandar ao executivo de contas da Azul Viagens

> Olá, [nome]. Aqui é o Saulo, da SRR Viagens (Brasília), agência cadastrada
> com vocês. Estamos montando um sistema interno que acompanha as ofertas de
> **pacotes da Azul Viagens saindo de Brasília** (Nordeste, resorts, Caribe)
> para divulgarmos mais para os nossos clientes — e queremos fazer isso pela
> **integração oficial**, e não lendo o site.
>
> Vimos que a plataforma de vocês é o **Juniper**, que tem a API de
> distribuição (JP WebService). Vocês liberam para a SRR um acesso **só de
> consulta**? Precisaríamos de:
> 1. **usuário de API (XML)** para busca de pacotes (`PackageAvail`) e
>    conferência de preço e disponibilidade (`PackageCheckAvail`) — sem reserva
>    nem emissão;
> 2. o **ambiente de testes** e, depois, o de produção (a Juniper pede o IP
>    fixo do nosso servidor e um contato técnico — passamos na hora);
> 3. os **limites de uso** (consultas por minuto/dia);
> 4. como vem o preço para a agência: preço público, comissão e parcelamento.
>
> A reserva e a emissão continuam com a gente, pelo site de vocês, como hoje.
> Obrigado!

## Prova de captura

```
node scripts/provas/azul-viagens-aberto.ts
```

Mostra: o `robots.txt` liberando, a página com o sensor da Akamai e os cookies
de vigilância, o "Powered by Juniper" e a documentação pública da API de
pacotes respondendo. **Não faz busca de pacote** — não insistimos num caminho
protegido.

Resultado em 15/10/2026: robots.txt 200 (libera), página inicial 200 com o
sensor `/akam/…` e os cookies `bm_mi, bm_s, bm_so, bm_sz`, "Powered by
Juniper", documentação da API 200.
