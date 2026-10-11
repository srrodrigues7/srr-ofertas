# Etapa V1b — Primeira vitrine: pacotes

**Esforço: alto.** São portais de agência, com login, e o acesso deles é o
mesmo que a SRR usa para emitir — errar o ritmo ou o jeito de entrar pode
custar o acesso comercial.

## O objetivo, em uma frase

**Pacotes reais (aéreo + hotel, incluindo resort all inclusive) saindo de
Brasília aparecendo na mesma vitrine das passagens**, vindos da **Cativa** e da
**Hoteldo** — as operadoras com que a SRR mais trabalha.

Depois delas, na ordem: **Pátria** (parceria começando) e **Azul Viagens** (a
agência tem cadastro). Essas duas não são desta etapa; a sua ficha das
primeiras deve deixar claro o que se reaproveita para elas.

## Como esta etapa anda junto com a V1a

A V1a (passagens: Smiles e Melhores Destinos) constrói **o molde de oferta e a
tela de Ofertas**. Esta etapa tem duas fases:

1. **Investigar (em paralelo com a V1a).** Só fichas e provas de captura —
   nada no banco, nada na estrutura do projeto. Suas entregas desta fase ficam
   em `docs/fontes/` e `scripts/provas/`.
2. **Plugar (depois que a V1a for aprovada e juntada).** A sessão de controle
   avisa quando. Aí você encaixa os pacotes **no molde e na tela que a V1a
   criou** — sem inventar um segundo molde. Se o molde não couber pacote,
   proponha o ajuste à sessão de controle antes de mudar.

## Fase 1 — Investigar Cativa e Hoteldo

O Saulo quer que **todos os caminhos sejam explorados**, e a ficha compara:

- **Páginas abertas** de ofertas, sem login (essas operadoras costumam ter).
- **Busca por requisição** — o endpoint que o próprio portal usa, com ou sem
  login.
- **Login automático** com as credenciais da agência: como o portal autentica,
  se pede código de verificação, por onde o código chega (o e-mail da agência
  está conectado e pode ser lido pelo sistema), quanto tempo a sessão dura.
- **Integração oficial para agências** (XML/API) — muitas operadoras oferecem.
  Descubra se estas oferecem e o que pedir; o Saulo faz o pedido.

**Sobre login, regra dura:** você **nunca digita senha**. Para investigar a área
logada no navegador do app, peça ao Saulo para entrar ele mesmo (ele assume o
navegador, faz o login e devolve). Para o sistema, as credenciais vão na
configuração e **quem coloca é o Saulo**. Ritmo leve sempre — é o acesso que a
agência usa para emitir. Se o portal permitir, recomende ao Saulo **um usuário
separado só para o robô**.

Cada ficha (`docs/fontes/<operadora>.md`) responde, além do checklist de
[O1-raio-x-das-fontes.md](O1-raio-x-das-fontes.md):

- o pacote vem com **o quê**: aéreo + hotel, regime (all inclusive, café…),
  noites, quartos, preço **por pessoa** ou total, **parcelas sem juros**, taxas;
- o preço exibido **já é o de venda** (com a RAV embutida) — o Saulo disse que
  em operadora a RAV vem embutida; confirme como aparece no portal;
- dá para buscar **por destino e mês**, ou só por data exata?
- qual caminho você recomenda para cada uma, e por quê.

## Fase 2 — Plugar

- Conectores da Cativa e da Hoteldo entregando no molde da V1a.
- O motor buscando pacotes para os **destinos cadastrados** (a mesma tela de
  destinos da V1a; pacote pode precisar de destinos próprios, como resorts —
  traga isso como pergunta).
- Pacotes na tela de Ofertas, filtráveis por tipo (passagem / pacote) e por
  regime (all inclusive).
- Login automático funcionando, se for o caminho escolhido, com aviso claro na
  tela de Saúde quando o login cair.

## Perguntas de negócio que esta etapa leva ao Saulo

Com alternativas e recomendação, **só o que muda o que vai ser construído**
(se for só um número, vira campo configurável com padrão sensato). Prováveis:

- quantas noites e quantas pessoas buscar por padrão;
- quais destinos de pacote importam (resorts no Nordeste? Caribe? Cancún?);
- o caminho de cada operadora, depois que a investigação mostrar as opções.

## Regras desta etapa

As do `00-contexto.md`: nunca digitar senha, nunca contornar CAPTCHA ou
proteção anti-robô, nunca reservar/comprar/emitir, ritmo educado.

## Fora do escopo

Pátria e Azul Viagens (V3.x), réguas de preço bom e nota (V2), mensagem para o
grupo (V4).

## Como a revisão vai conferir

- Fase 1: as duas fichas comparando os caminhos, com a recomendação, e as
  provas de captura rodando na frente do Saulo.
- Fase 2: pacotes reais de BSB na vitrine, ao lado das passagens; o motor
  buscando sozinho; o login (se usado) se renovando sem ninguém mexer, e a
  queda dele aparecendo na Saúde.
