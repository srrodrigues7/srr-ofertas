# Etapa V6 — Alertas do grupo de passagens do WhatsApp

**Esforço: alto.** Liga dois sistemas (o monitor de WhatsApp do Saulo, que já
está em uso, e o radar), lê texto de terceiro e transforma em oferta com preço
nosso. Errar aqui quebra o monitor que o Saulo usa hoje ou põe na vitrine
preço que não é o da SRR.

## O objetivo, em uma frase

**Cada alerta do grupo "Alerta Passagens CPM" vira uma oferta na vitrine**,
com o preço calculado pelo milheiro e pela margem da SRR — sem nada do texto
deles chegando ao cliente.

## O que já existe

O Saulo tem um sistema que fica conectado ao WhatsApp dele e lê dois grupos:
`C:\Users\saulo\Documents\Codex\2026-05-13\Monitor de Promoções` (Node,
`whatsapp-web.js`, bandeja do Windows, comandos pelo Telegram). **Só o grupo de
passagens interessa** — o de promoções fica como está, fora do radar.

- As mensagens de passagens ficam em `data/passagens-messages.json` (id, grupo,
  autor, horário, texto, tipo, se tem mídia). Havia 147 em 16/10.
- O README dele já diz: "a integração com o painel gerador de ofertas será
  feita em outra etapa". É esta.
- **O monitor não tem git.** Antes de mexer em qualquer arquivo dele, faça
  cópia de segurança e mexa o mínimo. Ele está em uso — **não pode parar de
  funcionar**, nem perder a sessão do WhatsApp (`.wwebjs_auth`: nunca apague,
  mova nem leia o conteúdo).

## O formato dos alertas

Quase sempre igual — dá para ler **sem IA**:

```
ECONÔMICA LATAM 🔵
Origem: GIG - Rio de Janeiro
Destino: LIM - Lima
Programa de Fidelidade: Privilege Club
Companhia aérea: LATAM
Classe: Econômica 💺
🏷️ Preço:
Ida: 13.000 Avios + R$ 814 em taxas
🛫 Datas de ida:
Janeiro/27: 14, 25, 26, 27, 28, 30
Fevereiro/27: 17, 20
```

Variações vistas: faixa de preço ("12.100 - 24.600 milhas + R$ 194 - R$ 394"),
só ida (o mais comum), alertas repetidos, mensagens só com imagem. Levante as
variações nas 147 guardadas antes de escrever o leitor; o que não encaixar fica
registrado como "não entendido", nunca adivinhado.

## Decisões do Saulo (29/10/2026)

- **Origens:** só **BSB**, e **GRU/GIG quando for internacional**. Os outros
  alertas ficam guardados, fora da vitrine.
- **Nota:** a **mesma nota** das outras ofertas (V2), com a etiqueta/selo
  **"veio de alerta"** e um empurrão na ordem. Se o preço for o comum da rota,
  a curadoria vê.

## O que entregar

1. **O caminho do alerta até o radar.** Recomendação da sessão de controle: o
   monitor passa a **gravar cada mensagem do grupo de passagens também no banco
   do radar** (uma tabela de mensagens brutas no schema `ofertas`), além do
   arquivo que ele já grava. Assim funciona mesmo quando o motor estiver no
   computador dedicado e o monitor em outro. Se você achar caminho melhor,
   traga à sessão de controle antes.
2. **O leitor**, no radar: lê a mensagem bruta, entende o alerta, e grava
   ofertas no molde da V1a — fonte `alerta_cpm` (tipo `milhas`), programa,
   milhas (o menor da faixa), taxas, uma oferta por data, só ida ou ida e volta
   conforme o alerta, classe, companhia, a etiqueta `alerta`.
3. **Programas novos** que os alertas usam (Privilege Club/Avios, TudoAzul,
   LATAM Pass, Aeroplan…) cadastrados em `programa`, **sem preço** — o Saulo
   preenche o milheiro em Valores; até lá a tela diz o que falta (lição 5).
4. **Validade curta:** disponibilidade em milhas some rápido. Alerta vira
   oferta com validade configurável (padrão sugerido: 24 h).
5. **Conferência:** quando o programa for Smiles, confira a data pelo
   calendário aberto da Smiles (o mesmo da V1a). Para os outros programas não
   há fonte de conferência hoje — combine com a V4 (que está construindo a
   aprovação) como isso aparece, já que a regra é "não conferida não pode ser
   aprovada".
6. **Sem repetir:** o mesmo alerta repetido no grupo não vira duas ofertas.
7. **Na Saúde:** "alertas recebidos hoje / viraram oferta / fora de origem /
   não entendidos", e o aviso se o monitor parar de mandar.

## Regras desta etapa

- **Nada do texto deles vai para o cliente.** Links, "chame nossa equipe",
  preços em dinheiro que eles oferecem, @ de autor: ficam só no dado interno da
  oferta, nunca na arte nem na legenda. O preço é sempre o nosso (milheiro +
  taxas + margem).
- Leia só o grupo de passagens. O de promoções não entra.
- Não mexa na sessão do WhatsApp nem no que o monitor já faz com o Telegram.
- Segredo (senha do banco, tokens) só no `.env`, colocado pelo Saulo se
  precisar.

## Como esta etapa convive com as outras

A V2 (a nota) e a V4 (aprovação e card) estão em construção. A nota é da V2: a
V6 só grava a etiqueta `alerta`; o empurrão na ordem a V2 aplica (a sessão de
controle já avisou). Migrações: combine a ordem com elas se as três mexerem no
banco ao mesmo tempo.

## Perguntas de negócio que esta etapa leva ao Saulo

Só o que muda o que vai ser construído, na caixa de seleção.

## Como a revisão vai conferir

- Os 147 alertas guardados lidos: quantos viraram oferta, quantos ficaram fora
  de origem, quantos não foram entendidos (e por quê).
- Um alerta novo no grupo aparece na vitrine sozinho, com a etiqueta de alerta
  e o preço calculado pelo milheiro da SRR.
- O monitor continua fazendo tudo o que fazia, inclusive o resumo de promoções.
- Nenhum texto deles na arte ou na legenda.
