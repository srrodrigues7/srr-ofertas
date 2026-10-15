# Ficha — Cativa Operadora

_Etapa V1b, fase 1: parte A (sem login) e parte B (portal logado, o Saulo
entrando). Investigado em 11/10/2026._

**Veredito: construir agora.** A vitrine sai do **viajandocomdesconto.com**,
que é **canal oficial da Cativa** (a Cativa passou o link ao Saulo, ele está
no linktr.ee oficial dela e o próprio portal do agente o anuncia como "página
exclusiva para o seu cliente"). Uma página só traz **todos os pacotes e todos
os bloqueios aéreos**, sem login. O **revalidador automático** confere o preço
ao vivo no portal do agente (Infotravel) com um usuário só do robô — desenho
e alternativas em [revalidador-cativa.md](revalidador-cativa.md). Em paralelo,
**pedir a API oficial** (texto abaixo); quando vier, troca-se só o conector.

Prova: `node scripts/provas/cativa-vitrine.ts` (ver o fim desta ficha).

---

## Os caminhos, comparados

| caminho | degrau | o que dá | custa / risco | veredito |
|---|---|---|---|---|
| **viajandocomdesconto.com** (canal oficial da Cativa para as agências mostrarem aos clientes) | 3, mas com os dados **já em JSON dentro da página** (quase um 2) | 467 pacotes (1.642 saídas × até 3 hotéis) e 10.871 bloqueios aéreos, de 33 cidades de origem; 100 saídas de pacote e 1.004 bloqueios saindo de **BSB** | 5,3 MB por leitura; o servidor diz se mudou (`ETag`/`Last-Modified`), então quase sempre é uma pergunta de poucos bytes. Se mudar de formato ou sair do ar, o conector para e avisa | **fonte principal** |
| **Divulgação da SRR** (`cativaoperadora.com.br/divulgacao/srr-viagens?Embarque=DF`) | 3 | **artes prontas (PNG) com a marca da SRR**, por embarque (DF), por região, com o nome do arquivo dizendo a data (ex.: `1009_…` = 09/10) e um texto curto ("Natal/BSB 08/12") | o preço só existe **dentro da imagem** — como dado, perde para o viajandocomdesconto | não é fonte de oferta; **guardar para a V4** (card): a Cativa já entrega a arte oficial |
| **cativaoperadora.com.br** (site oficial) | 3 | catálogo: "a partir de R$ X em 10x" por resort/pacote | **não diz cidade de saída nem data** — não serve para oferta | não usar |
| **Painel de bloqueios** (Power BI público, link "Bloqueios aéreos" do site oficial) | 3/4 | a fonte oficial dos bloqueios: origem, destino, datas, tarifa, lugares, companhia (129.541 lugares hoje) | ler Power BI por programa é frágil e pesado | **plano B** dos bloqueios |
| **Portal do agente** (`reservas.cativaoperadora.com.br/infotravel`, sistema Infotravel) | 4 (não há chamada de dados limpa — ver parte B) | o preço **ao vivo**, com disponibilidade real | login da agência + código por e-mail às vezes; é o acesso que emite — ritmo leve, usuário só do robô | **revalidador** |
| **API Infotravel** (a mesma que sistemas de agência como o Monde usam para falar com a Cativa) | 1 | busca e disponibilidade oficiais | depende da Cativa liberar para a SRR | **pedir agora** (texto abaixo) |

O link "ver orçamento" de cada pacote no viajandocomdesconto abre um orçamento
na Infotravel (`premium.infotravel.com.br/orcamento-web/...`). Sem login ele
mostra o pacote (o que inclui, noites, código), mas **não mostra preço**
("Total: R$ 0,00").

## Acesso

- **Endereço:** `https://viajandocomdesconto.com/` — uma página HTML estática
  (hospedada na Hostinger), sem chamadas de API: tudo vem dentro dela.
- **Login/chave:** nenhum. **Proteção anti-robô:** nenhuma (um programa simples
  recebe a página em menos de 1 s). **robots.txt:** não existe (404).
- **Limites:** não observados — fizemos poucas leituras. Ritmo planejado: **uma
  pergunta "mudou?" a cada poucas horas**; baixa os 5 MB só quando muda.
- **Muda com horário/lugar?** Não: é o mesmo arquivo para todo mundo.
- **Atualização:** o arquivo foi publicado em 09/10/2026 16:07; os bloqueios
  dizem "gerado em 09/10/2026". O código do site fala numa "rotina das 05:30"
  que republica — mas hoje (11/10) ainda estava a versão de 09/10. **Não é
  diária garantida.**

## Dentro da página

Três blocos de dados:

1. **`PACOTES`** — a lista de pacotes. Cada pacote tem várias **saídas** (uma
   por cidade de origem), e cada saída tem **até 3 hotéis**, cada um com o
   seu preço. Uma oferta de pacote = pacote × saída × hotel.
2. **`__PVOO_PAYLOAD`** — os **bloqueios aéreos**: uma linha por voo, 16
   campos separados por `|`, mais um mapa de aeroporto → cidade e a data de
   geração.
3. **`DADOS`** — roteiros de grupo com guia e campanhas (promoções só de
   hotel). Fora do escopo agora.

### Pacote — campo por campo

| campo | vem? | como |
|---|---|---|
| origem | sim | IATA (`BSB`) e cidade |
| destino | sim | texto livre ("Porto de Galinhas", "MACEIÓ (MCZ)") — o IATA às vezes vem entre parênteses, às vezes não (traduzimos pelo mapa dos bloqueios) |
| datas | sim | **uma** data de ida e volta com preço ("17/11/2026 a 24/11/2026"), mais "outras datas" **sem preço** |
| noites | calculado | da diferença entre as datas |
| hotel e **regime** | sim | nome do hotel e regime ("All Inclusive", "Café da manhã", "Meia pensão"…) — 319 dos 3 mil hotéis são all inclusive |
| **preço** | sim | **pacote completo com aéreo, por pessoa, em quarto duplo** ("Cotação em quarto duplo") |
| taxa | sim | por pessoa, por hotel ("+ taxa R$ 199"). Há também um "taxas R$ 398,04" na saída (igual em quase todas). No portal as taxas **variam por hotel e voo** e já vêm somadas ao total ("Taxas inclusas BRL 261,86" para 2) — o revalidador usa o total do portal e ignora este campo |
| **parcelas** | sim | "10x de R$ 975", **sem juros** nos cartões Visa e Mastercard (o site também oferece boleto pré-pago parcelado e desconto à vista) |
| aéreo do pacote | sim | "de R$ 1.269 por R$ 869" — o preço só do aéreo, por pessoa |
| o que inclui | sim | lista (aéreo ida e volta, noites, transfer, passeios, seguro) |
| promoção | às vezes | "10% OFF", "Compre café e ganhe MAP" |
| quando foi cotado | sim | "Cotado em" — de 14/07 a 06/10/2026 nesta versão (**preço pode ter semanas**) |
| link | sim | orçamento na Infotravel (sem preço sem login) |
| companhia aérea, voo, horários | **não** no pacote | o site mostra ao lado os bloqueios da mesma rota, mas não diz qual voo é o do pacote |
| bagagem | **não** | |
| quartos/ocupação | só "quarto duplo" | nada de criança, triplo, individual |
| disponibilidade | **não** | "sujeito a disponibilidade" |

### Bloqueio aéreo — campo por campo

`origem|destino|ida|volta|noites|assentos|tarifa|tarifaEmDolar|prazoEmissão|idaSai|idaChega|voltaSai|voltaChega|taxa|nacional|companhia`

| campo | vem? | como |
|---|---|---|
| origem, destino | sim | IATA |
| ida e volta | sim | **ida-e-volta real** (é um bloqueio, não a soma de duas pernas) |
| noites | sim | |
| **assentos restantes** | sim | "88", "1" (o site marca "últimos lugares" com 4 ou menos) |
| **preço** | sim | ida e volta, **por pessoa**, em reais (o campo de dólar existe mas hoje está sempre em reais) |
| taxa | sim | R$ 186 / R$ 199 por pessoa (nacional) |
| companhia | sim | GOL, LATAM, Azul… |
| horários | sim | saída/chegada da ida e da volta (só 1 linha sem horário). **Cuidado:** o próprio site inventa um horário de exemplo quando falta; nós deixamos em branco |
| **prazo para emitir** | sim | último dia em que a tarifa vale; vencido, sai da lista |
| número do voo | **não** | |
| bagagem, classe | **não** | (bloqueio costuma ser econômica; a confirmar) |
| gerado em | sim | data da geração da lista |
| link para emitir | **não** | a emissão é pelo portal/agente |

### Características para casar com o gosto do cliente

Pedido da sessão de controle (11/10): o motor, no futuro, vai cruzar cada
oferta com perfis de gosto de clientes. O que a Cativa entrega:

| característica | vem? | de onde / como |
|---|---|---|
| **regime** | **sim**, por hotel | "All Inclusive", "Café da manhã", "Meia pensão", "Pensão completa", "Só hospedagem", e variações ("Café da manhã + 2 jantares"). Vale normalizar para 5 grupos |
| **categoria / estrelas do hotel** | **não** | nenhum campo de estrelas; só o nome do hotel ("… Resort") |
| **praia ou cidade** | **indireto** | não há campo; dá para deduzir do destino e das etiquetas do site (`nordeste`, `resorts`, `disney`, `exoticos`). O site oficial filtra resort por "Praia / Serra / Ecológico / Termas", mas sem data nem origem |
| **região / país / cidade** | **sim** | cidade de destino (texto) e aeroporto (IATA, às vezes deduzido); `Nacional` / `Internacional` / `Evento` por pacote. País/região: deduzidos do IATA |
| **criança** | **sim, em parte** | num segundo bloco da página (`PV_SNAPSHOT`, 458 saídas), cada hotel traz a política de **criança grátis**: "01 CHD ATÉ 12 ANOS", "02 CHD ATÉ 11 ANOS"… (preenchido em ~60% dos hotéis). Às vezes também no "o que inclui" ("CRIANÇA GRÁTIS ATÉ 12 ANOS"). A prova ainda não junta esse bloco — fica para o conector da fase 2 |
| **tipo de quarto** | **só "quarto duplo"** | toda cotação é em quarto duplo; nada de triplo, individual ou categoria de apartamento |
| companhia aérea | só nos bloqueios | nos pacotes, não |

## Busca por destino e mês? Calendário?

- **Não há busca:** vem o catálogo inteiro de uma vez, e filtramos aqui
  (origem, região, mês, all inclusive). Custo: **uma** leitura cobre todas as
  rotas.
- **Pacotes:** uma data com preço por saída, mais "outras datas" sem preço. Dá
  para dizer "março, várias datas", mas **não o preço de cada uma**.
- **Bloqueios:** cada data tem o seu preço — de BSB para Recife, por exemplo,
  há dezenas de datas até jun/2027. **Serve de calendário** para o preço normal
  da V2, nas rotas onde a Cativa tem bloqueio.

## Preço de venda? (a RAV)

O site é feito para o **cliente final** ("Consulte o seu Agente de Viagens",
botão de mandar para o WhatsApp). Os preços são os **públicos, de venda** —
coerente com o que o Saulo disse: na operadora a RAV vem embutida. **Confirmado
na parte B:** o portal busca na tabela "CATIVA COMISSIONADO" (há também
"NETPIX — tarifa não comissionada"), e o preço da busca é o de venda; a
comissão não aparece na tela de busca (há um relatório "COMISSÕES" à parte).

## Frescor e confiança

- O preço dos pacotes é "a partir de" e foi cotado há dias ou semanas.
- Os bloqueios são mais confiáveis (têm assentos e prazo de emissão), mas
  também são uma foto de quando a lista foi gerada.
- **Medido na parte B (11/10):**
  - **bloqueios batem exatamente** com o portal ao vivo (BSB→REC 17–24/10
    R$ 757 e R$ 807; 04–11/11 R$ 898 e R$ 849; 05–10/11 R$ 789, 2 lugares);
  - **pacote mudou ~4%:** Enotel all inclusive 17–24/11 estava R$ 9.750 +
    R$ 199 por pessoa no viajandocomdesconto (cotado em 17/08) e **R$ 10.338,27
    por pessoa** (taxas inclusas) no portal, com 46 quartos.
- **Por isso o revalidador automático** ([revalidador-cativa.md](revalidador-cativa.md)).
- A própria fonte tem erros de digitação (um "cotado em 23/09/2023", destinos
  em caixa alta ou não). O conector normaliza.

## Risco e plano B

| risco | plano B |
|---|---|
| o site muda o formato dos dados | o conector avisa ("não achei os pacotes — o site mudou de formato?") e a Saúde mostra; ajuste costuma ser pequeno |
| o site sai do ar | bloqueios: painel Power BI oficial ou a tela "Bloqueios de voo" do portal; pacotes: API Infotravel ou a busca do portal |
| preço velho | revalidador automático antes do topo e na aprovação |
| a página fica parada (sem republicar) | o conector lê a data de publicação e a de geração; a Saúde avisa se passar de X dias |

## O que se reaproveita para Pátria e Azul Viagens

- **O formato da oferta de pacote** (origem, destino, hotel, regime, datas,
  noites, preço por pessoa em quarto duplo, taxa, parcelas, o que inclui,
  cotado em) é o mesmo para qualquer operadora.
- **A Infotravel** é um sistema usado por várias operadoras brasileiras. Se a
  Pátria ou a Azul Viagens também usarem, o conector da API/portal Infotravel
  da Cativa serve para elas trocando só o endereço e o código. **A conferir
  quando chegar a vez delas.**
- O "baixa a página, tira o JSON de dentro" só serve para sites montados do
  mesmo jeito.

## Pedido de API — texto para o Saulo mandar ao executivo de contas da Cativa

> Olá, [nome]. Na SRR Viagens estamos montando um sistema interno que acompanha
> as ofertas da Cativa (pacotes, resorts e bloqueios aéreos) para divulgarmos
> mais para os nossos clientes. Queremos fazer isso do jeito certo, pela
> integração oficial, e não lendo o site.
>
> Vocês liberam para a SRR o **acesso à API/webservice da Infotravel**
> **só para consulta** (busca de pacotes, disponibilidade, tarifa e bloqueios
> aéreos)? Precisaríamos de:
> 1. a documentação da API e o endereço do ambiente de testes;
> 2. o código da agência e o identificador do fornecedor para a integração;
> 3. os limites de uso (quantas consultas por minuto/dia);
> 4. se possível, **um usuário separado só para o sistema**, sem permissão de
>    reservar ou emitir.
>
> Enquanto a API não sai, vamos usar um usuário nosso do portal só para
> **conferir preço e disponibilidade** das ofertas antes de divulgar, em ritmo
> bem leve (algumas dezenas de consultas por dia). Se preferirem outro
> caminho para isso, nos avisem.
>
> Não vamos reservar nem emitir por ela — a emissão continua com a gente, pelo
> portal. Obrigado!

## Prova de captura

```
node scripts/provas/cativa-vitrine.ts                          # BSB → Nordeste, pacotes e bloqueios
node scripts/provas/cativa-vitrine.ts --tipo pacotes --so-ai   # só all inclusive
node scripts/provas/cativa-vitrine.ts --origem GRU --regiao todas --limite 30
node scripts/provas/cativa-vitrine.ts --json > saida.json      # tudo traduzido, para conferir
```

Resultado em 11/10/2026 (BSB → Nordeste): **127 opções de pacote** (pacote ×
hotel), **14 all inclusive** — de Makai Aracaju 5 noites por R$ 3.990 + R$ 199
por pessoa (10x R$ 399) a Enotel Porto de Galinhas 7 noites por R$ 11.650 —, e
**782 bloqueios** ida e volta, a partir de R$ 485 + R$ 186 (BSB–Salvador,
LATAM, 1 lugar) e R$ 520 + R$ 199 (BSB–Recife, GOL, dezenas de datas).

Guarda a página numa pasta temporária e, por 30 minutos, não volta ao site;
depois disso só pergunta se mudou.

## Parte B — o que o portal do agente mostrou (o Saulo entrando)

**Login.** Tela de usuário e senha (`login.xhtml`), depois uma etapa
(`auth.xhtml`) que **às vezes pede um código enviado por e-mail** — pediu desta
vez. O portal deixa um cookie de "dispositivo conhecido" (`AuthInfo…`), o que
explica o "às vezes". A sessão cai após **~58 min parada** (monitor de
inatividade de 3.475 s).

**Usuário do robô.** O menu **Profissionais** tem "Adicionar", com perfis
"Administrador agência", "Vendedor agência" e "Agência corp". O Saulo pode
criar sozinho um usuário **Vendedor** só para o robô, cadastrado com o
**e-mail da operação** (para o código chegar lá). Não vimos um perfil "só
consulta" — o robô nunca clica em reservar, e isso é regra do código.

**Como o portal é feito.** Sistema **JSF/PrimeFaces** (Infotravel 3.0.5):
cada tela guarda estado no servidor, as buscas são envios de formulário que
devolvem **pedaços de HTML**, e os campos do pacote têm nomes gerados
(`j_idt3448`) que mudam a cada versão. **Não há chamada de dados (JSON)
limpa.** A tela de bloqueios usa nomes fixos (`idSgOrigem`, `idSgDestino`).

**Busca de pacote** ("Reservar" → atendimento "CATIVA COMISSIONADO" →
"Pacote & Multidestinos"): origem (sugestão), destino (lista: **233 destinos
saindo de BSB**, cidades e pacotes-resort), **ida e volta em data exata**,
quartos. **Não busca por mês.** Levou ~20 s. Resultado (BSB→Porto de
Galinhas, 17–24/11, 2 adultos): **74 hotéis**, 10 por página, filtros por
hotel, preço, **estrelas**, avaliação, região, política de cancelamento e
**regime**. Por hotel: tipo de quarto, quartos disponíveis, regime, **preço
por pessoa**, total, taxas inclusas; o voo do pacote (companhia, horários,
paradas, classe). Ex.: Pousada Atlantic R$ 2.776,68 por pessoa (total
R$ 5.553,36, taxas R$ 261,86); Enotel all inclusive R$ 10.338,27.

**Bloqueios de voo** (menu Bloqueios): busca por origem, destino e **período**
(padrão: 30 dias), ~5 s. Por voo: partida/chegada (com hora), companhia, nº do
voo, **tarifa**, localizador do bloqueio, **prazo (deadline) com hora**, status
e **lugares disponíveis** (alguns com 0 = esgotado). **Uma consulta confere
todos os bloqueios de uma rota num período** — barato para o revalidador.

**Parcelas:** o portal oferece pagamento parcelado; o número de parcelas não
aparece na busca (o viajandocomdesconto diz 10x sem juros).

**Características para o gosto do cliente, no portal:** além do que o
viajandocomdesconto dá, o portal tem **estrelas** e **tipo de quarto** — o
revalidador pode trazê-los quando conferir uma oferta.

## Fase 2 — o conector no ar (14/10/2026)

- **Código:** `src/lib/coleta/fontes/cativa.ts` (baixa perguntando "mudou?",
  tira os blocos de dados; cache em arquivo para o motor religado) e
  `src/lib/coleta/pacotes.ts` (traduz para o molde da V1a e grava). Uma
  tarefa, escopo `vitrine`, de `cativa.intervalo_horas` (3) em 3 horas.
  À mão: `npm run cativa`.
- **Saídas** (decisão do Saulo): as origens dos pedidos de busca nacionais
  (BSB) levam tudo; as outras origens dos pedidos (GRU, GIG) só internacional.
- **Pacote** → aba Pacotes, uma oferta por pacote × saída × hotel: preço =
  **total por pessoa com a taxa**, em quarto duplo (`adultos = 2`), as parcelas
  da Cativa (10x), regime normalizado, `crianca_gratis` quando a Cativa
  informa, agrupado pelo **destino do pacote** (Porto de Galinhas), não pelo
  aeroporto (REC). Destino → aeroporto: o código no nome, o mapa dos
  bloqueios, a tabela do próprio site, um dicionário de praias/serras
  (`AEROPORTO_DO_DESTINO`) e o cadastro de lugares.
- **Bloqueio** → aba Passagens (`tipo = passagem`, `detalhe = voo`): ida e
  volta, companhia, horários, assentos, preço com a taxa, etiqueta `bloqueio`,
  "emitir até" = o **dia** do prazo (a hora exata vem do portal na
  conferência). Os preços vão para o histórico (`preco_observado`, ida_volta)
  — o calendário da V2. Parcelas: a tabela da casa (a página não diz se o
  bloqueio parcela).
- **Fica fora, contado no resumo:** saída com datas inválidas na fonte (volta
  antes da ida; a virada de ano é corrigida), pacote sem aeroporto conhecido
  ou de vários destinos (a Cativa põe a cidade de saída no destino).
- **Resultado (banco de testes, 14/10):** 216 pacotes (211 de BSB, 5
  internacionais de GRU; 20 all inclusive) e 781 bloqueios (628 de BSB, 153
  internacionais de GRU) na vitrine; leitura de ~30 s, 1 requisição.
