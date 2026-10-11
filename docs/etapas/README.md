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

**O jeito do Saulo trabalhar:** ver o sistema achando oferta primeiro, uma
peça funcionando por vez, e só no fim ligar a estrutura (Vercel, GitHub, login,
computador dedicado). Por isso a ordem abaixo põe ofertas na tela o quanto
antes e deixa "ligar tudo" para o final. Tudo roda local até lá.

| #    | Etapa | Depende de | Estado |
| ---- | ----- | ---------- | ------ |
| O0   | [Fundação](O0-fundacao.md) — projeto, banco, motor e tela de Saúde, **rodando local** | — | **fechando** (sem a parte de publicar) |
| V1   | [Primeira vitrine](V1-primeira-vitrine.md) — Smiles e Melhores Destinos buscando, ofertas reais de BSB na tela | O0 | próxima |
| V2   | A nota — preço normal de cada rota em cada mês, nota 0–100 com o motivo, as melhores no topo | V1 | esperando |
| V3.x | Uma fonte por vez, da lista do Saulo — investigar, plugar e ver na tela | V1 | esperando |
| V4   | Da oferta ao post — preço de venda, aprovar/descartar com revalidação, card e legenda | V2 | esperando |
| V5   | Robô do Telegram — aviso de oferta de nota alta, atalho para aprovar | V4 | esperando |
| L    | Ligar tudo — Vercel, GitHub, login, motor instalado no computador dedicado, alertas de saúde | quando o Saulo quiser | esperando |
| R    | Resultado — card ligado à venda no VoePro, para o motor aprender | VoePro no ar | esperando |

```
O0 ─► V1 ─┬─► V2 ─► V4 ─► V5
          └─► V3.x (uma fonte por vez, enquanto o resto anda)
                                        L  (quando o Saulo decidir)
```

O [O1-raio-x-das-fontes.md](O1-raio-x-das-fontes.md) deixou de ser etapa: o
raio-x agora acontece dentro de cada V1/V3.x, e aquele arquivo é o checklist do
que investigar em cada fonte.

## O escopo de cada uma, em uma frase

- **O0** deixa a casa de pé no computador: projeto, schema `ofertas`, motor e
  tela de Saúde.
- **V1** põe ofertas reais na tela, das duas fontes que já se sabe acessar.
- **V2** diz quais delas são extraordinárias, e por quê.
- **V3.x** traz cada fonte nova, uma de cada vez.
- **V4** transforma a oferta aprovada em post pronto.
- **V5** avisa no celular.
- **L** publica e instala tudo para rodar sozinho.
- **R** fecha o ciclo com o que vendeu.

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
