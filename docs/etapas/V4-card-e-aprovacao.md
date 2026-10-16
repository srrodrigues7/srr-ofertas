# Etapa V4 — Da oferta ao post: aprovação, card e legenda

**Esforço: alto.** É o que chega ao cliente. Um erro aqui publica preço velho,
oferta repetida ou informação interna no grupo de clientes.

## O objetivo, em uma frase

A pessoa da curadoria **aprova uma oferta com um clique e recebe a arte e a
legenda prontas para postar** no grupo de ofertas.

## O fluxo

1. Na vitrine, a oferta tem **Aprovar** e **Descartar**.
2. **Aprovar confere o preço antes** (o revalidador da V1b). Regra do Saulo:
   esgotou → sai; mudou → atualiza e mostra a diferença antes de seguir; **não
   conferida não pode ser aprovada**. Fonte sem conferência possível (ex.:
   Melhores Destinos) — traga ao Saulo como tratar.
3. Aprovada, a oferta ganha um **código de rastreio único** (curto, legível,
   **único no banco** — lição 10 da HUB 92) e vai para a tela **"Prontas para
   postar"**: a arte, a legenda, botões **Baixar arte** e **Copiar legenda**, e
   **Marcar como postada**.
4. Fica registrado **quem aprovou, quando, quem postou**. Trava contra
   repetição: a mesma oferta não é aprovada nem postada duas vezes (lição 3).

## As duas visões (decisão do Saulo)

- **A da equipe** (a vitrine): tudo, inclusive de onde veio.
- **A do cliente** (a arte e a legenda): **sem a fonte** (nada de Smiles,
  Melhores Destinos, Cativa), **com a companhia aérea**, **por pessoa**,
  **parcelas em destaque** ("10x de R$ 161,90 sem juros" — cliente olha
  parcela), **mês e janela** em vez de data exata ("março, várias datas a
  partir de R$ X" — só quando houver um mínimo configurável de datas naquele
  preço), internacional por GRU/GIG como **"saindo de São Paulo"** (ou Rio).
- **Imperdível com destaque** também na arte (selo da V2).

## A arte

- Um **modelo com a marca da SRR** preenchido automaticamente pelo sistema
  (o Next desta versão gera imagem — `next/og`): foto do destino, cidade, mês,
  preço por pessoa, parcelas, companhia, selo de imperdível, o código.
- Formato **quadrado** para o grupo. (Story fica para depois.)
- **A foto do destino** é a decisão que mais pesa na qualidade — leve ao Saulo
  as opções: banco de fotos próprio por destino (a SRR sobe), as artes de
  divulgação da Cativa que a V1b guardou (para pacotes deles), banco de imagens
  com licença de uso livre. Podem se combinar.
- Marca: leia `C:\Users\saulo\programing\srr-crm\docs\marca.md` (só leitura)
  e o logo já usado no painel.

## A legenda

Texto pronto para colar no WhatsApp: destino, mês/janela, preço por pessoa,
parcelas, o que inclui (pacote), companhia, chamada para falar com o consultor
e o código. Tom e emojis — mostre um exemplo ao Saulo antes de fechar.

## Como esta etapa convive com a V2

A V2 (a nota) corre **em paralelo**. O contrato: **a V2 grava na oferta a nota,
o selo e o motivo; a V4 só lê** — os nomes dos campos a V2 escreve no
`README.md` das etapas. Até lá, trate o selo como opcional (a arte sem selo
funciona). **Não mexa nas telas da V2** (vitrine, réguas, preferências): os
botões Aprovar/Descartar entram na vitrine por um componente pequeno que você
cria e combina com a V2; o resto são telas novas.

### O contrato já decidido pela V2 (16/10/2026)

Colunas novas em `ofertas.oferta` (a V2 cria; detalhes na seção "V2 — A nota:
o contrato com a V4" do `README.md`, quando a V2 for juntada — até lá, no ramo
`claude/mystifying-panini-397794`):

| coluna | o que é | uso na V4 |
|---|---|---|
| `nota` | 0–100 | ordenar a tela de aprovação |
| `selo` | `comum` · `boa` · `imperdivel` | o destaque na arte e na legenda |
| `nota_motivo` | uma linha, visão da equipe | **só na tela da equipe — nunca na arte nem na legenda** |
| `nota_em` | quando foi calculada | — |
| `temporada` | null ou "Carnaval", "Réveillon"… | pode virar destaque na arte ("Carnaval 2027") |
| `nota_detalhe` | json | — |
| `candidata` | top N do dia (`grupo.limite_dia`) | o que a curadoria vê primeiro |

`null` = ainda não calculada: a arte sai sem selo. **Leia de forma tolerante**
— a V2 pode migrar depois de você começar — e combine com ela a ordem das
migrações se as duas criarem colunas em `oferta`.

Decisão do Saulo na V2: a régua é **automática** (boa = 20% abaixo do normal,
imperdível = 35%), com exceções manuais dele; picos como Carnaval são
**temporada** própria.

## Perguntas de negócio que esta etapa leva ao Saulo

Só o que muda o que vai ser construído, na caixa de seleção. Prováveis: a foto
do destino; o tom da legenda; o que fazer com oferta de fonte que não dá para
conferir; quem pode aprovar.

## Fora do escopo

Publicar sozinho no WhatsApp (depende da etapa 9 do VoePro); Telegram (V5);
login (L — por enquanto tudo roda no computador).

## Como a revisão vai conferir

- Aprovar uma oferta: confere, gera código, aparece em "Prontas para postar".
- A arte e a legenda não mostram a fonte, mostram a companhia, "por pessoa" e
  as parcelas.
- Clicar duas vezes em aprovar não gera duas aprovações nem dois códigos.
- Oferta que mudou de preço na conferência mostra a diferença antes de seguir.
