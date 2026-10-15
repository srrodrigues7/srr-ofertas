# Etapa V3a — Investigar Pátria, Azul Viagens e Expedia TAAP

**Esforço: alto.** São três portais, provavelmente com login de agência, e o
acesso deles é o mesmo que a SRR usa para vender. A investigação decide como
(e se) cada um entra no radar.

## O objetivo, em uma frase

Descobrir, para cada um dos três, **o melhor caminho legítimo para trazer as
ofertas ao radar** — e provar com um teste que funciona.

**Esta etapa só investiga.** Não mexe na vitrine, no molde nem no banco. Cada
fonte entra na vitrine depois, numa etapa própria (V3.x), uma por vez, quando a
sessão de controle abrir.

## As fontes

| fornecedor | link do Saulo | o que se sabe |
|---|---|---|
| **Azul Viagens** | https://www.azulviagens.com.br/ | operadora da Azul; a SRR tem cadastro |
| **Expedia TAAP** | https://www.expediataap.com.br/ | programa de agentes da Expedia (Travel Agent Affiliate Program) |
| **Pátria** | https://portal.patria.tur.br/ | operadora; parceria começando |

Ordem sugerida: Azul Viagens, Expedia TAAP, Pátria.

## Como investigar

Siga o modelo da V1b, que já fez isto com a Cativa e a Hoteldo — leia
`docs/fontes/cativa.md`, `docs/fontes/hoteldo.md` e
`docs/fontes/revalidador-cativa.md` antes de começar. Para cada fonte, compare
**todos os caminhos**:

1. **Páginas abertas** de ofertas, sem login.
2. **Endpoint/requisição** que o próprio site usa.
3. **Área logada** — com o Saulo entrando (você nunca digita senha).
4. **Integração oficial** (API/XML, programa de afiliados ou parceiros) — a
   Expedia, em especial, costuma ter programa para parceiros. Se existir, deixe
   pronto o texto do pedido para o Saulo mandar.

E responda o checklist de [O1-raio-x-das-fontes.md](O1-raio-x-das-fontes.md),
mais:

- o que vem: **pacote** (aéreo + hotel, regime, noites, ocupação) e/ou
  **passagem**; preço por pessoa ou total; **parcelas sem juros**; taxas;
- se o preço já é o de venda (com a RAV embutida);
- as **características para casar com o gosto do cliente**: regime, categoria
  do hotel, praia ou cidade, região/país/cidade, criança;
- dá para **conferir o preço ao vivo** (para o revalidador)?
- o veredito: construir agora / depois / não construir, e por quê.

## Regra dura: proteção anti-robô

Se o portal usa proteção anti-robô (DataDome, Akamai, Cloudflare desafiando,
CAPTCHA) ou o `robots.txt` proíbe a busca, **aquele caminho não serve para
robô** — registre e siga. Não use navegador "com janela" nem outro truque para
passar pela proteção. Foi assim que a Hoteldo ficou de fora e que o detalhe da
Smiles foi desligado. Nunca digite senha, nunca reserve/compre/emita, ritmo
educado.

## Entregas

- Uma ficha por fonte em `docs/fontes/<fonte>.md`, e o resumo em
  `docs/fontes/README.md`.
- Uma prova de captura por fonte viável em `scripts/provas/`, rodando isolada
  (sem mexer no `package.json`).
- Só essas pastas. A V1b está construindo a vitrine de pacotes ao mesmo tempo.

## Perguntas de negócio que esta etapa leva ao Saulo

Só o que muda o que vai ser construído, na caixa de seleção. As decisões já
tomadas estão no `README.md` das etapas — leia antes.

## Como a revisão vai conferir

- As três fichas comparando os caminhos, com o veredito de cada uma.
- As provas rodando.
- Nenhum caminho que dependa de passar por proteção anti-robô.
