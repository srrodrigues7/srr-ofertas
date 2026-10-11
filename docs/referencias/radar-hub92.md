# Radar 92 — como funciona

> Manual de funcionamento do Radar de ofertas da HUB 92.
> Escrito em **07/10/2026**, conferido no código em produção (`origin/main`) e no servidor do Brasil (`evobr`), não de memória.
> Onde um número veio de medição minha, está dito.

---

## 1. O que é o Radar

São **duas esteiras independentes** que rodam sozinhas, 24 horas:

| esteira | o que faz | onde roda |
|---|---|---|
| **radar-scanner** | coleta preço o tempo todo pra formar **histórico** (MAO como hub). Não anuncia nada. | container `hub92-app-radar-scanner-1` |
| **radar-fire** | procura **oferta boa** e, quando acha, gera um **card** e manda no grupo | container `hub92-app-radar-fire-1` |

E **dois grupos de WhatsApp**:

- **Interno** (equipe, sem cliente) — recebe tudo que o radar acha. É a vitrine de curadoria.
- **Oficial** (clientes) — só recebe o que **alguém da equipe aprovar**.

Nada vai pro cliente sozinho. O robô propõe, a pessoa decide.

---

## 2. O caminho de uma oferta

```
fonte (CVC, Melhores Destinos, seats.aero, Smiles, Azul…)
   ↓
conector  (escolhe destino + datas, lê o preço)
   ↓
guardas   (teto de preço · repetição · elegibilidade)
   ↓
preço de venda  (margem / milheiro)
   ↓
card  (arte + legenda + código de 4 letras)
   ↓
GRUPO INTERNO
   ↓
aprovação  (reação ✅ no card  OU  botão no painel)
   ↓
GRUPO OFICIAL   ← re-renderizado: mês no lugar da data exata, sem fonte, sem link interno
```

---

## 3. As fontes

O `radar-fire` **sorteia** uma fonte a cada disparo (intervalo aleatório de **8 a 12 minutos**). Os pesos abaixo estão no próprio container:

| fonte | peso | o que é |
|---|---|---|
| `promo-airtrfx` | 22% | páginas "voos de Manaus" da GOL/TAP |
| `promo-airtrfx?fonte=azul` | 13% | o mesmo, da Azul |
| `promo-md` | 14% | Melhores Destinos — ofertas reais saindo de Manaus |
| `promo-cvc` | 10% | ida-e-volta na CVC, pela ponte |
| `promo-award-seatsaero` | 10% | award cross-programa pela API PRO do seats.aero |
| `promo-md?tema=domestico&cia=LA` | 7% | Melhores Destinos, recorte LATAM |
| `promo-cvc-pacote` | 7% | pacote aéreo + hotel na CVC |
| `promo-md?tema=europa` | 4% | Melhores Destinos, Europa |
| `promo-azul-pm` | 3% | Azul Pelo Mundo (award interline internacional, só preço real) |
| `promo-md?tema=asia` | 3% | Melhores Destinos, Ásia |
| `promo-award?programa=SMILES&rt=1` | 3% | award Smiles ida-e-volta, do nosso cache |
| `promo-award?programa=AZUL` | 2% | award Azul |
| `promo-auto?sempre=1` | 2% | auto-promo "on fire" (hidden-city: acha ida e volta separadas) |

Fora do sorteio, existe a fonte de **descoberta**: o grupo **TSM · Alertas Manaus** (grupo de terceiro). O que chega lá é lido por IA, mas **nunca usamos o preço em milhas deles** — buscamos a tarifa paga de verdade e montamos o nosso card.

---

## 4. Como o preço é formado

**Cards em dinheiro** (`lib/radar-preco.ts`): sobre o custo achado na fonte aplicamos **+20%**:
- +10% comissão HUB 92
- +10% taxa do cartão (porque exibimos em 10x)

O card mostra **"10x de R$ (total ÷ 10)"**. Fontes que já trazem margem própria (CVC pacote, auto-promo) não levam esses 20% de novo.

**Cards em milhas** (award): a margem está no **milheiro**, pela tabela de faixas (`balcao_tabela_preco`), e as **taxas de embarque reais** entram no valor. Por isso o card de milhas mostra **um número só** — "R$ X · valor total · taxas inclusas" — e não "R$ X + taxas".

---

## 5. As guardas antes de publicar

**Teto de preço** (`radar_tetos`, editável no `/admin/radar`): cada linha é **tipo × destino**.
- tipo: `aereo-rt`, `aereo-ida`, `pacote`, `cruzeiro`
- destino: uma região (`nacional`, `nordeste`, `europa`…) **ou** uma cidade (IATA)
- resolve do mais específico pro mais geral: cidade → nordeste → região
- o teto é o valor **à vista** (em pacote/cruzeiro, por pessoa)
- **award em milhas e cards manuais não têm teto**, de propósito

**Repetição**: hoje o limite por destino está **desligado** no grupo interno (decisão sua, 19/08) — a curadoria é a seleção da equipe. Cada conector ainda evita repetir os últimos destinos que ele mesmo mandou.

**Elegibilidade pro oficial**: só vai pro grupo de clientes o que for **ida-e-volta em reais**. Milhas não vão.

---

## 6. Aprovação

Duas formas, as duas válidas:

1. **Reação ✅ no card**, dentro do grupo interno (vale também ☑️, ✔️, 👍)
2. **Botão "Aprovar → oficial"** no `/admin/radar` (restrito a admin)

> **Responder "OK" citando o card não funciona mais.** Existiu entre 29/08 e 09/09 e foi removido a seu pedido: respondendo numa prévia, ou em qualquer mensagem que não fosse o card registrado, ele falhava **em silêncio**.

Quando aprova, o card é **re-renderizado pro oficial**: a data exata vira **mês**, somem a fonte e o link de emissão, e o pacote passa a dizer "2 pessoas". Há uma **trava atômica**: a reação chega várias vezes ao servidor e, sem ela, o mesmo card ia repetido pros clientes (aconteceu em 28/08, Recife saiu 6×).

---

## 7. Onde as coisas moram

**Tabelas (Supabase):**
- `radar_anuncios` — todo card gerado, com código de 4 letras (ex.: `K7P2`) pra rastrear
- `radar_descartes` — tudo que **não** virou card, com o motivo
- `radar_tetos` — os tetos configuráveis
- `radar_envios` — controle de repetição por dia (horário de Manaus)
- `smiles_calendario` · `smiles_ao_vivo` · `buscador_award` — bases de milhas

**Código:**
- `lib/radar-*.ts` — preço, legenda, tetos, limite, anúncios, oficial, taxas, pacote
- `app/api/buscador/promo-*` — um arquivo por fonte
- `app/admin/radar/` — o painel

**Infra:**
- **ponte CVC** (`cvc-bridge`, no Brasil): Chrome real que fala com o site da CVC. **3 navegadores** no pool — é o gargalo do sistema inteiro.
- **workers no Mac**: `smiles-aovivo` (01:30) e `latam-calendario-milhas` (00:30)
- **crons no evobr**: harvest do calendário Smiles e da base completa

⚠️ **Armadilha**: a variável `WPP_RADAR_JID` está **vazia** no servidor — o grupo interno vem do **padrão escrito no código** (`<jid-omitido>`). O oficial é `<jid-omitido>`, esse sim na variável.

---

## 8. Os vigias

| vigia | o que observa |
|---|---|
| `vps: radar-fire` | o disparo de ofertas bate ponto a cada tick |
| `brasil: cvc-bridge` | a ponte respondendo e **sem fila entupida**; 2 leituras ruins **reiniciam** a ponte sozinha |
| `vps: tsm-alertas-card` | alertas do TSM chegando mas **nenhum card saindo** |
| `mac: smiles-aovivo` | a varredura noturna de milhas coletou algo nas últimas 26h |
| `vps: base-calendario-smiles` | a base de 360 dias continua fresca |

---

## 9. O que já quebrou (e como reconhecer)

| sintoma | causa | como confirmar |
|---|---|---|
| buscador "não retorna nada" | **PassHub morreu com MFA** (31/08). Migrado pra CVC. | login do PassHub devolve 403 `mfa_required` |
| buscador com "resposta inesperada" | **ponte entupida** (05/10): um cliente que desiste levava o navegador embora e ele nunca voltava | `/health` da ponte com `ocupados = pool` e `esperando` alto |
| abas infinitas no Chrome | **job órfão** no scanner LATAM: entregou a busca e a aba morreu, sem prazo pra expirar | `/status` com `atual` preenchido e `feitos:0` |
| rota internacional "sem award" | a Smiles **não publica calendário** de rota só de parceira (196 rotas de MAO) | o calendário responde `CARROSSEL_ONLY` |
| oferta de milhas cara demais | o carrossel da Smiles **não enxerga a Avianca**, que costuma ser a mais barata | comparar com a busca ao vivo do dia |
| card do TSM parou | o TSM precificava no PassHub morto | 50 alertas seguidos em `tsm-sem-bookavel` |

---

## 10. No dia a dia

- **Painel**: `/admin/radar` — ver o que foi gerado, aprovar, configurar teto, montar pacote.
- **Código do card**: as 4 letras ligam o que foi ao ar com o que converteu. É por elas que se rastreia.
- **Antes de mandar pro cliente, revalide.** Award muda de hora em hora: dia-prêmio some entre a varredura e o envio. Um card parado algumas horas pode já não existir.
- **A ponte tem 3 navegadores.** Qualquer coisa que dispare muitas buscas de uma vez (varredura larga, lote de cards) compete com o buscador que a equipe está usando na hora.

---

## 11. O que ainda não está pronto

- **O preço do buscador** mostrava a soma das duas pernas, e não o ida-e-volta real da CVC — corrigido em 07/10, mas vale saber que a soma e o real divergem (medi R$ 112 numa busca, e a diferença **muda de sinal**).
- **`smiles_ao_vivo`** (a varredura noturna que enxerga a Avianca) alimenta hoje **só o calendário do buscador**. O radar e os cards ainda não leem essa tabela.
- **Camada do carrossel no harvest diário**: as 196 rotas internacionais só-carrossel ainda não entram na base automática.
