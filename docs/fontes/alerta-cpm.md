# Alerta CPM — o grupo "Alerta Passagens CPM" do WhatsApp (V6)

**Estado: no ar (V6, 30/10/2026), no banco de testes.**

## O que é

Um grupo de WhatsApp de terceiro que posta **alertas de disponibilidade em
milhas** (cerca de 25 por dia útil, das 9h às 20h; nada no fim de semana). O
Saulo já tinha um **monitor de WhatsApp** que guarda as mensagens do grupo num
arquivo (`C:\Users\saulo\Documents\Codex\2026-05-13\Monitor de Promoções`,
`data/passagens-messages.json`). O radar lê esse arquivo — **o monitor não é
tocado** (decisão do Saulo, 30/10).

## Como chega ao radar

```
WhatsApp ─► monitor do Saulo ─► data/passagens-messages.json
                                       │  (só leitura)
                                       ▼
                ponte (src/lib/alertas/ponte.ts) ─► ofertas.alerta_mensagem
                                                          │
         leitor + regras (leitor.ts, regras.ts, alertas.ts) ─► ofertas.oferta
```

- A **ponte** lê `data/passagens-messages.json` e `data/runtime-status.json`
  (estado do monitor), na pasta `MONITOR_WHATSAPP_PASTA` do `.env`. Mais nada
  da pasta — **nunca** `.wwebjs_auth` (a sessão do WhatsApp) nem o grupo de
  promoções. O autor (telefone) não é copiado.
- Roda **dentro do motor** quando o monitor está no mesmo computador. Em
  computadores diferentes: `npm run alertas -- --vigiar` no do monitor (precisa
  do radar e do `.env` lá).
- O monitor às vezes guarda mensagem **sem o id do WhatsApp** (visto em
  29/10): a ponte dá um id estável (hora + texto), `sem-id:…`.

## O formato (levantado nos 416 alertas de 07 a 29/10/2026)

Quase sempre igual; o leitor entende **sem IA** (416 de 416). Variações
tratadas: faixa de milhas ("12.100 - 24.600", vale a menor), pontos/Avios,
taxa em R$ / US$ / CA$ / € / ausente ("+ taxas"), vários programas na mesma
linha ("… pela Smiles ou … pelo Aeroplan"), só ida, "Ida e volta: …", meses
grudados na mesma linha ("Maio/27: 22, 29 Junho/27: 05"), volta só por outro
programa (vira só ida), datas de ida e de volta em **listas separadas** (não
são pares). O que não encaixar fica `nao_entendido` com o motivo.

O alerta traz também o **preço de venda DO GRUPO** em reais ("Preço de ida:
1.490,00 + taxas"), links e @: **nada disso vai ao cliente**. O valor em reais
fica só como referência da equipe na vitrine ("o grupo CPM vende a R$ X").

## As regras (decisões do Saulo, 29–30/10/2026)

| regra | onde se muda |
|---|---|
| Origem: **BSB** sempre; **GRU/GIG só internacional** | Valores → Alertas do WhatsApp → Origens (`alerta_origem`) |
| Programas: só **Smiles, Azul Fidelidade (TudoAzul), Azul Pelo Mundo** (milheiro próprio) e **LATAM Pass** | Valores → Programas (`alerta_programa`); nome novo entra sozinho como "fora" |
| Classes: econômica e executiva (premium e primeira ficam fora) | código (são as classes do radar) |
| **Uma oferta por mês de ida**, com todas as datas de ida do mês e todas as voltas depois delas — o cliente escolhe | `regras.ts` |
| Preço = ida + volta (a menor da faixa), **pelo milheiro e margem da SRR**; sem taxa em reais = "R$ X **+ taxas**" | `fonte.taxas_a_conferir`; `precificar()` |
| Validade: **24 h a partir da hora em que o grupo postou**; o mesmo alerta de novo renova | `alertas.validade_horas` |
| Conferência: Smiles econômica pelo **calendário da Smiles** (robô); Azul, LATAM e Smiles executiva pelo **"Conferi"** da equipe (nome, milhas, taxa) | `alertas.conferir_smiles_horas`; `conferencia.ts` |
| Sem taxa conferida **não aprova** | `podeSerAprovada()` |

## Números (16 a 29/10/2026, 416 alertas)

178 fora de origem · 121 fora de programa · 3 fora de classe · 3 sem datas
futuras · 0 não entendidos · **111 passariam** (9 dentro das 24 h viraram
oferta; os outros já tinham vencido). Cerca de 5 por dia útil. 8 alertas eram
repetição de um anterior.

Na conferência das 25 ofertas Smiles econômica: 4 ok, 9 com o preço Clube
diferente (atualizado), 1 esgotada, 5 com datas e milhas ok mas sem a taxa
(esperam o "Conferi"), 6 com o calendário vazio naquele momento (o robô tenta
de novo em 6 h).

## Atenção

- O calendário da Smiles dá o **menor preço Clube por dia, de qualquer
  companhia**: confere que a data tem assento em milhas e o preço "a partir
  de", não o voo exato do alerta (Copa, Air France…).
- Os alertas **não entram no histórico de preço normal** da V2: alerta só
  aparece quando o preço está baixo; misturar distorceria o "normal".
- Se o monitor parar (o processo morreu em 29/10 às 21:07), a Saúde avisa:
  "o monitor de WhatsApp não dá sinal desde …". Religar é com o Saulo.
