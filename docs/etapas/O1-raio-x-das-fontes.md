# Etapa O1 — Raio-x das fontes

**Esforço: alto.** É daqui que sai a decisão de quais fontes construir e como.
Uma ficha errada vira um conector inteiro jogado fora.

## O objetivo, em uma frase

Descobrir, **fonte por fonte**, o melhor jeito de buscar preço, o que cada uma
entrega e o risco de cada uma — **e provar com um teste que funciona.**

Esta etapa **não constrói o sistema**. Ela produz conhecimento verificado.

## As fontes

- **Primeira rodada:** **Smiles** e **Melhores Destinos**. Já se sabe que
  respondem por endpoint interno (degrau 2) — confirme e documente. Elas
  definem o modelo de ficha para as próximas.
- **Depois:** a lista que o Saulo vai enviar (sites de fornecedores,
  consolidadoras, operadoras, lugares onde a agência emite). Ela chega por ele
  ou pela sessão de controle. Se a lista for longa, a sessão de controle pode
  dividir em O1.x paralelas.
- **Consolidadoras com API oficial**, quando o acesso chegar.

## Como investigar cada fonte

1. Abra o site no navegador, faça uma busca de verdade (ex.: **BSB** para um
   destino nacional, e **GRU/GIG** para um internacional) e **observe as
   requisições de rede** para achar de onde vêm os preços.
2. Encaixe na escada (`00-contexto.md`, seção 6): API oficial > endpoint >
   página > navegador. Sempre o degrau mais alto possível.
3. Escreva uma **prova de captura**: um script que, rodando no computador,
   busca uma rota e imprime o resultado já traduzido para os campos abaixo. Sem
   gravar no banco.

## O que cada ficha responde

Uma ficha por fonte em `docs/fontes/<fonte>.md`:

- **Acesso:** degrau, endereço, se precisa de login/chave, se tem proteção
  anti-robô, limites observados (quantas buscas antes de bloquear), se a
  resposta muda com o horário ou com o lugar de onde se acessa.
- **O que vem**, campo por campo — e o que **não** vem:
  - origem, destino, data de ida, data de volta (ou só ida)
  - companhia, número do voo, conexões, duração, horários
  - **bagagem** incluída ou não, classe/tarifa
  - preço em **reais** e/ou **milhas + taxas**; preço por pessoa ou total
  - **assentos restantes** (disponibilidade)
  - quando o preço foi gerado (é ao vivo ou é cache de horas atrás?)
  - link ou identificador para emitir
- **Calendário:** a fonte consegue dar o preço **dia a dia** de uma rota para
  os próximos meses? Isso é crítico: é o que vai alimentar o "preço normal" da
  O4. Diga quantos meses à frente e quanto custa (em requisições) cobrir uma
  rota.
- **Ida e volta:** a fonte dá o ida-e-volta real, ou só pernas separadas?
- **Frescor e confiança:** o preço que aparece ainda existe quando se tenta
  emitir?
- **Risco:** o que pode quebrar, e o plano B.
- **Veredito:** construir agora / construir depois / não construir — e por quê.

No fim, um resumo em `docs/fontes/README.md`: uma tabela com todas as fontes e
a **recomendação de ordem de construção**.

## Regras desta etapa

Todas as do `00-contexto.md`, e especialmente:

- **Você nunca digita senha.** Se a fonte exige login, a ficha registra isso e
  o Saulo coloca a credencial no `.env`.
- **Não contorne CAPTCHA nem proteção anti-robô.** Se a fonte exige isso,
  registre e siga para a próxima.
- **Ritmo educado:** poucas buscas, espaçadas. É investigação, não coleta.
- **Nunca reserve, compre ou emita.**
- **Não mexa na estrutura do projeto** — ela é da O0, que corre em paralelo.
  Suas entregas ficam em `docs/fontes/` e em `scripts/provas/`. Se precisar de
  uma dependência, rode isolado (ex.: `npx tsx`) sem alterar o `package.json`.

## Perguntas de negócio que esta etapa leva ao Saulo

Com alternativas e recomendação. No mínimo:

1. **Quais destinos importam mais** saindo de BSB (para a primeira rodada de
   buscas de teste e, depois, para o agendador)? E quais internacionais, por
   GRU/GIG?
2. **Milhas também são oferta para o grupo**, ou só dinheiro? Muda o peso de
   Smiles na ordem de construção.
3. **Até onde ir com uma fonte que só funciona com navegador** (degrau 4):
   aceitar, deixar para depois, ou só se for muito boa?

## Fora do escopo

Banco, coletor, agendador, formato final da oferta (isso é da O2 — mas a sua
lista de campos é a matéria-prima dela).

## Como a revisão vai conferir

- Cada ficha completa, com o que **não** vem dito explicitamente.
- A prova de captura de cada fonte rodando na frente do Saulo.
- O resumo com a recomendação de ordem, justificada.
