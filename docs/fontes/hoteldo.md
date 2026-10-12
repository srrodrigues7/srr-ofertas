# Ficha — Hoteldo

_Etapa V1b, fase 1: parte A (sem login) e parte B (caminho comercial + portal
logado só observado, o Saulo entrando). Investigado em 11/10/2026._

**Veredito: construir só pela API oficial — pedir já.** A Hoteldo é grande
fornecedor da SRR, e **existe um caminho comercial legítimo e documentado**:
a **API B2B da Despegar** (dona da Hoteldo), com documentação pública e
contato comercial para o Brasil. **Robô no portal, não:** o portal usa
proteção anti-robô (DataDome) e o `robots.txt` proíbe robôs justamente na
busca — não contornamos.

Prova: `node scripts/provas/hoteldo-aberto.ts`.

---

## Quem é

A Hoteldo é a rede **só para agências (B2B)** do grupo **Despegar/Decolar**
(também chamada BestDay). Vende hotel, aéreo, traslado, passeios, ingressos e
o **pacote aéreo + hotel** que a SRR compra. A busca e a reserva acontecem na
plataforma **e-agencias.com**; a SRR tem um endereço próprio lá
(`ag00057124-hoteldo.e-agencias.com`, que aparece como "SRR Viagens").

## Os caminhos, comparados

| caminho | degrau | o que dá | custa / risco | veredito |
|---|---|---|---|---|
| páginas abertas (`hoteldo.com.br`) | — | nada de preço: só apresentação e cadastro | programa leva **403**; navegador passa por "verificação do dispositivo" | **não existe** |
| endereço da SRR (`ag00057124-hoteldo.e-agencias.com`) | — | é a **vitrine da agência na plataforma**, mas **fechada**: sem login manda para a tela de entrada | anti-robô **DataDome**; `robots.txt` proíbe robôs em `/search`, `/trip`, `/packages`, `/pacotes`, `/hotels`, `/flights`, `/login`… | **não é caminho para robô** |
| portal logado (o Saulo entrando) | 4 | a busca completa (ver "Parte B") | por trás há chamadas de dados internas (`/s-accommodations/api/…`, `/pkg-loader/api/…`), mas **protegidas pelo DataDome** e nos caminhos que o `robots.txt` proíbe; usar seria contornar a proteção — **não fazemos**. E é o acesso que emite | **não automatizar** |
| **API B2B Despegar/Hoteldo** | 1 | **documentação pública**: [api-docs.despegar.com](https://api-docs.despegar.com/docs/ecosystem) — hotéis, voos, atividades, seguro, conteúdo (geografia, hotéis, regimes), reserva e pós-venda; acesso por **chave de API** com ambiente de testes e de produção; limite por **requisições por minuto** (1 requisição com 100 hotéis conta 1) | precisa da Hoteldo liberar a chave; **pacote pronto ainda não existe na API** ("em desenvolvimento", diz a própria documentação); a homologação pede provas de um site de reservas (ver abaixo) | **pedir já** |
| **MCP da Despegar** (o protocolo que agentes de IA usam) | 1 | busca de voos e de hotéis por destino, disponibilidade — pensado para agentes como o Claude | credenciais de teste pelo gerente de conta | **pedir junto**: pode ser o jeito mais rápido de começar |
| Decolar afiliados | — | programa de afiliados para o site do cliente final; não é o preço da Hoteldo e parece inativo | — | **não serve** |

## O que a API oferece (da documentação pública)

- **Hotéis — busca de disponibilidade** por destino, até **100 hotéis por
  consulta**, até **540 dias à frente**, até 30 noites, até 4 quartos, até 8
  pessoas por quarto, **idade de cada criança** (0–17). Devolve: hotel,
  **estrelas**, **tipo de quarto**, **regime** (com subcódigos; catálogo de
  regimes no serviço "meal-plans"), cama, preço total com impostos, taxas
  pagas no destino à parte, **política de cancelamento** (reembolsável ou
  não), e — importante para preço de venda — **comissão** e a **"tarifa
  pública mínima"** (`binding_public_rate`: o menor preço pelo qual se pode
  vender). **Não devolve** quantos quartos restam.
- **Voos — disponibilidade** e bagagem.
- **"Price Jump"**: um serviço que detecta variação de preço de um produto —
  serve de revalidador oficial.
- **Pacote aéreo + hotel: não tem ainda** ("cars, insurance, shopping cart,
  and packages are in progress"). Montar voo + hotel pela API **não é** o
  preço do pacote do portal: no portal, o pacote tem um desconto próprio
  ("Seu ganho R$ 1.191"). Ou seja, até a API de pacote sair, a API dá
  **hotel** (resorts all inclusive!) e **voo** com preço certo, e o pacote
  precisa esperar.
- **Homologação:** para liberar produção, a Despegar pede provas de **como a
  informação aparece no site do parceiro** e reservas de teste no ambiente de
  testes. Nosso uso é **só consulta, interno** — **é preciso perguntar** se há
  uma chave só de consulta sem essa homologação de site.
- **Contatos (página "Support" da documentação):** suporte técnico
  `supportxml@hoteldo.com`; **novos clientes no Brasil: a representante
  comercial listada lá** (Aline Sobreira).

## Parte B — o que o portal mostrou (o Saulo entrando, só observando)

Busca de **Pacotes** no endereço da SRR: origem já vem Brasília; destino por
sugestão; **datas exatas** (calendário, mostra "estadia de 7 noites"); quartos
e pessoas. **Não busca por mês.** Levou ~20 s.

Resultado (BSB→Porto de Galinhas, 17–24/11, 2 adultos), por hotel:

| campo | vem? |
|---|---|
| hotel, **estrelas** (★★★★), **nota dos hóspedes** (9 "Muito bom", 1.886 avaliações) | sim |
| **regime** (café da manhã, meia pensão, **all inclusive**) | sim, como selo |
| localização ("Em frente à praia", "Próximo ao Pontal de Cupé", distância do centro) | sim — dá para deduzir **praia** |
| **disponibilidade** ("Resta apenas 1", "Restam apenas 5") | sim |
| **preço final por pessoa**, total para 2, **taxas e impostos incluídos** | sim |
| detalhe: voo (ida e volta direto) + hotel × 7 noites; preço R$ 8.510 + taxas R$ 2.771 = R$ 11.283 para 2 | sim |
| "Pague em **parcelas sem juros**" | sim (o número de parcelas não aparece na lista) |
| "Seu ganho" (economia do pacote contra comprar separado) | sim |
| reserva flexível (cancelamento) | sim |
| **comissão / RAV** | **não aparece** na busca, mesmo no "modo agência" |

Exemplos: Hotel Village Porto de Galinhas R$ 5.641 por pessoa; Marupiara All
Inclusive R$ 7.746; Vila Galé Cabo All Inclusive R$ 8.623 (todos com aéreo,
taxas incluídas). O Enotel não apareceu nesta busca na Hoteldo.

### Características para casar com o gosto do cliente

| característica | portal | API (documentação) |
|---|---|---|
| regime (all inclusive, café…) | sim | sim (código + catálogo) |
| estrelas | sim | sim |
| praia ou cidade | indireto (descrição da localização) | indireto (coordenadas, zonas, pontos de interesse) |
| região / país / cidade | sim | sim (serviço de geografia) |
| criança e idade | a busca pede | sim, idade por criança; preço muda com a idade |
| tipo de quarto | sim | sim (tipo e cama) |
| avaliação dos hóspedes | sim | sim (resumo de avaliações) |

## Risco e plano B

- **Robô no portal pode custar a conta** (DataDome) — por isso não.
- **API sem pacote:** começar pelos **resorts (hotel)** e **voos**, e entrar
  no piloto da API de pacotes assim que existir.
- **Sem API:** a Hoteldo fica fora do robô; os pacotes vêm da Cativa e, na
  V3.x, da Pátria e da Azul Viagens.

## O que se reaproveita para Pátria e Azul Viagens

- O formato da oferta de pacote e o roteiro "API oficial primeiro; portal só
  se não houver proteção anti-robô".

## Pedido — texto para o Saulo mandar ao gerente comercial da Hoteldo

_(com cópia para a representante comercial do Brasil listada na documentação
da API)_

> Olá, [nome]. A SRR Viagens emite **[VOLUME — ex.: R$ X por mês / N
> reservas por mês]** com a Hoteldo, e queremos vender ainda mais com vocês.
>
> Estamos montando um sistema interno que acompanha as ofertas de **pacotes
> aéreo + hotel** e de **resorts all inclusive** saindo de Brasília, para
> divulgar aos nossos clientes. Queremos fazer isso **pela integração
> oficial**, e não lendo o portal. Vimos a documentação pública da API B2B
> (api-docs.despegar.com) e pedimos:
>
> 1. uma **chave de API de consulta** (hotéis e voos), com o ambiente de
>    testes;
> 2. se o nosso uso — **só consulta, interno**, sem reserva pela API e sem
>    site de vendas — pode ser liberado **sem a homologação de site e de
>    reservas** que a documentação descreve;
> 3. entrar no **piloto da API de pacotes** (a documentação diz que está em
>    desenvolvimento) — pacote é o que mais vendemos com vocês;
> 4. o acesso de teste ao **MCP** (busca de voos e hotéis para agentes de IA);
> 5. o nosso **limite de consultas por minuto** e se há custo;
> 6. como vem o preço para a SRR: com a nossa comissão, a tarifa pública
>    mínima e o parcelamento.
>
> A emissão continua com a gente, pelo portal, como hoje. Obrigado!
