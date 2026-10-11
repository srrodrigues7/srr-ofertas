# As etapas da construção

O Radar de Ofertas é construído **uma etapa por vez**, cada uma num chat
próprio, com contexto limpo. Este arquivo é o painel de controle: onde cada
etapa está e o que a próxima precisa saber.

## Como funciona

1. A **sessão de controle** escreve a especificação da etapa e cria a tarefa
   para um agente novo.
2. O agente lê [00-contexto.md](00-contexto.md) e a especificação, **leva ao
   Saulo as perguntas de negócio** (sempre com alternativas e recomendação) e
   **apresenta um plano detalhado**.
3. **O Saulo aprova o plano.** Nada é construído antes disso.
4. O agente constrói, testa, commita, atualiza este arquivo e **para**.
5. **A sessão de controle revisa com o Saulo**: lê o diff, roda o que foi
   feito, confere no banco.
6. **O Saulo aprova o resultado.** Só então a próxima etapa é aberta.

Nenhuma etapa começa sozinha. Nenhuma etapa pula a fila. Etapas sem dependência
entre si podem correr em paralelo, cada uma na sua sessão.

## Quadro

| #    | Etapa | Depende de | Estado |
| ---- | ----- | ---------- | ------ |
| O0   | [Fundação](O0-fundacao.md) — projeto, banco, motor de pé, painel no ar | — | **aberta** |
| O1   | [Raio-x das fontes](O1-raio-x-das-fontes.md) — uma ficha por fonte, com prova de captura | — | **aberta** |
| O2   | Formato da oferta e coletor — o molde único, o agendador, o histórico, Smiles e Melhores Destinos rodando | O0, O1 | esperando |
| O3.x | Um conector por fonte (em paralelo, uma sessão por fonte) | O2 | esperando |
| O4   | Preço normal da rota — o normal de cada rota em cada mês (sazonalidade) | O2 | esperando |
| O5   | Motor de inteligência — nota 0–100, motivo, filtros, falsa promoção, ranking | O4 | esperando |
| O6   | Preço de venda — margem, milheiro, parcelamento, taxas | O2 | esperando |
| O7   | Painel de curadoria — lista pela nota, aprovar/descartar, revalidação na aprovação | O5, O6 | esperando |
| O8   | Card e legenda — arte e texto prontos para postar, código de rastreio | O7 | esperando |
| O9   | Robô do Telegram — aviso de oferta de nota alta, atalho para aprovar | O7 | esperando |
| O10  | Saúde do sistema — produção por fonte, erros, alertas | O3 | esperando |
| O11  | Resultado — card ligado à venda no VoePro, para o motor aprender | VoePro no ar | esperando |

```
O0 ─┐
    ├─► O2 ─┬─► O3.x ─► O10
O1 ─┘       ├─► O4 ─► O5 ─┐
            └─► O6 ───────┴─► O7 ─┬─► O8
                                  └─► O9
```

## O escopo de cada uma, em uma frase

- **O0** deixa a casa de pé: o projeto, o schema `ofertas`, o motor rodando no
  computador dedicado e se religando sozinho, o painel publicado com login, e a
  prova de que os três conversam.
- **O1** descobre, fonte por fonte, o melhor jeito de buscar preço, o que cada
  uma entrega e o risco — e prova com um teste que funciona.
- **O2** define o formato único de oferta e o coletor que vai às fontes no
  ritmo certo e guarda tudo.
- **O3.x** encaixa cada fonte nova no formato.
- **O4** calcula o preço normal de cada rota em cada mês.
- **O5** dá a nota e escolhe as melhores.
- **O6** calcula por quanto vender.
- **O7** é onde a pessoa da curadoria trabalha.
- **O8** gera o que vai ser postado.
- **O9** avisa no celular.
- **O10** avisa quando algo para.
- **O11** fecha o ciclo com o que vendeu.

## Decisões do Saulo já tomadas

- **Projeto irmão** (não dentro do VoePro): mesmo Supabase, mesma Vercel,
  código e deploy próprios.
- **Trabalho contínuo num computador dedicado** que fica sempre ligado.
- **Curadoria manual:** funcionário vê, analisa, aprova e posta no grupo.
- **Origem BSB** acima de tudo; internacional pode sair de GRU ou GIG.
- **Uma pessoa dedicada** à curadoria nos picos (Black Friday).
- **Fontes:** a lista do Saulo está chegando; Smiles e Melhores Destinos já se
  sabe que respondem por endpoint. Pedidos de API feitos às consolidadoras.

---

## O que cada etapa deixou pronto

_(cada etapa acrescenta aqui, ao terminar, o que a próxima precisa saber)_
