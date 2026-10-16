# Revalidador automático — Cativa

_Etapa V1b. Desenho na fase 1 parte B; **construído na fase 2** (alternativa
A, navegador-robô) — ver "O que foi construído" no fim._

**O problema:** a vitrine vem do viajandocomdesconto, que é uma foto. Os
**bloqueios batem** com o portal ao vivo, mas os **pacotes envelhecem** (o
Enotel 17–24/11 estava 4% mais caro no portal do que na vitrine). Oferta com
preço velho não pode chegar ao grupo (lição 4), e a equipe não tem tempo de
conferir à mão.

**A ideia:** o robô entra sozinho no portal da Cativa com um usuário só dele,
confere o preço e a vaga **antes de a oferta subir para o topo** e **de novo
na aprovação**, e marca o resultado. Ninguém da equipe precisa abrir o portal.

---

## O que ele faz com cada oferta

| o portal diz | o que acontece | o que a curadoria vê |
|---|---|---|
| mesmo preço, tem vaga | grava "conferido às 14:32" | ✓ conferida |
| preço mudou (subiu ou caiu) | grava o preço novo, refaz a nota | "preço mudou: R$ 9.949 → R$ 10.338 (+4%)" |
| esgotou / sumiu | **sai da vitrine** | (some; fica no histórico) |
| não deu para conferir (portal fora, login caiu) | fica como estava, **sem selo de conferida**; **não pode ser aprovada** até conferir | "não conferida — Cativa fora do ar" |

Decisão do Saulo (11/10): **esgotou sai; preço mudou atualiza e marca.**

## Quando ele confere

1. **Antes do topo:** quando uma oferta entra entre as N melhores (a nota é da
   V2), o robô confere. Se já conferiu há menos de X horas, não repete.
2. **Na aprovação:** quando alguém clica em aprovar, o robô confere de novo
   (se a última conferência tiver mais de Y minutos). A aprovação espera o
   resultado (~20–30 s para pacote, ~5–10 s para bloqueio).
3. **Bloqueios em lote:** a tela "Bloqueios de voo" devolve **todos os
   bloqueios de uma rota num período** numa consulta só — o robô confere a
   rota inteira de uma vez.

N, X, Y, o ritmo e o teto diário são **configuração** (padrões sugeridos:
top 30, X = 6 h, Y = 15 min, uma consulta por vez com 20 s de folga, até 200
consultas por dia, só das 7h às 23h).

## Como ele entra no portal

- **Usuário só do robô:** o Saulo cria em *Profissionais → Adicionar* (perfil
  Vendedor agência), cadastrado com o **e-mail da operação**. Usuário e senha
  vão no `.env` do computador do motor (`CATIVA_USUARIO`, `CATIVA_SENHA`) —
  quem põe é o Saulo.
- **Código por e-mail:** quando o portal pedir, o robô **lê o código na caixa
  do e-mail da operação** (acesso de leitura àquela caixa, também no `.env`) e
  digita. Espera até 5 min.
- **Sessão:** guarda os cookies (inclusive o de "dispositivo conhecido", que
  faz o portal pedir menos código) e entra de novo quando a sessão cair
  (~58 min parado).
- **Nunca insiste com senha errada:** uma tentativa, no máximo uma repetição;
  falhou, **para e avisa** — senha errada repetida bloqueia o usuário.
- **Nunca clica em reservar, adicionar ao carrinho ou emitir.** Regra no
  código, não só no costume.
- **Toda consulta tem prazo** (60 s) e fecha o navegador ao terminar,
  aconteça o que acontecer (lição 9).

**Na tela de Saúde:** "Cativa: login ok, última conferência 14:32", ou em
vermelho "Cativa: login caiu — o código não chegou em 5 min" / "senha
recusada". E o vigia de produção: "N ofertas esperando conferência há mais de
1 h".

---

## As alternativas para o "como"

O portal é um sistema JSF antigo: cada tela guarda estado no servidor e as
buscas devolvem pedaços de HTML, sem uma chamada de dados limpa (ver a ficha
[cativa.md](cativa.md), parte B).

| | **A) Navegador-robô** (recomendado agora) | **B) Imitar o formulário** (sem navegador) | **C) API oficial Infotravel** (quando a Cativa liberar) |
|---|---|---|---|
| como | um Chrome invisível no computador do motor faz o que a pessoa faz: entra, escolhe origem/destino/datas, lê o resultado | o programa manda os mesmos envios de formulário que a tela manda | o programa pergunta à API e recebe dados prontos |
| funciona para | pacote **e** bloqueio | bem para bloqueio (campos com nome fixo); **frágil para pacote** (campos com nome gerado, que muda a cada versão do portal) | tudo, do jeito certo |
| velocidade | ~20–30 s por pacote, ~5–10 s por rota de bloqueio | 2–3× mais rápido | o mais rápido |
| quebra quando | a Cativa muda o desenho da tela (ajuste pequeno, porque o robô se guia pelos rótulos que a pessoa vê) | qualquer atualização do portal | quase nunca |
| custa | instalar o Chrome do robô no computador do motor (~150 MB); um pouco mais de memória | nada a instalar | depende da Cativa |
| veredito | **construir na fase 2** | só se o A ficar lento demais para os bloqueios | **pedir já** (texto na ficha); quando vier, troca o conector e o resto fica igual |

**Recomendação:** **A agora, C quando vier.** O A é o único que serve para
pacote com segurança, e o volume (dezenas de conferências por dia) é pequeno
para um navegador. O "o que fazer com o resultado" e o "quando conferir" são
os mesmos nos três — trocar o "como" depois não muda nada para a curadoria.

## O que a fase 2 precisa (para a sessão de controle)

- **Do molde da V1a:** cada oferta guarda quando foi conferida, o preço
  conferido, o resultado (ok / mudou / esgotou / não deu) e a variação; e um
  jeito de achar a mesma oferta no portal: código do pacote (vem no link de
  orçamento do viajandocomdesconto, ex.: `25690`), origem, destino, datas e
  hotel; para bloqueio, origem, destino, datas e voo.
- **Um de-para de destinos:** o nome do viajandocomdesconto ("Porto de
  Galinhas") → o destino da lista do portal ("M-28844 Porto de Galinhas…"). A
  lista tem 233 destinos saindo de BSB.
- **Do Saulo, antes de ligar:** o usuário do robô criado; usuário e senha no
  `.env`; e o acesso de leitura à caixa do e-mail da operação (ele diz qual é
  o provedor — Gmail, Outlook, HostGator… — e cria uma senha de aplicativo).

---

## O que foi construído (fase 2, 14/10/2026)

**Decisões do Saulo:** preço = total por pessoa **com a taxa**; e-mail da
operação no **Gmail**; até a nota (V2) existir, o robô confere sozinho **as 3
mais baratas de cada destino** (por aba e origem) e cada oferta da Cativa tem
o botão **"Conferir agora"**.

**Onde está:**

- `src/lib/revalidador/revalidador.ts` — o organizador: fila
  (`ofertas.conferencia_pedido`), escolha automática, teto diário, horário,
  folga, prazo, e o que fazer com o resultado (`registrarConferencia`).
  Junta numa ida ao portal o que se confere junto: **todos os hotéis do mesmo
  pacote e data** (uma busca; cada hotel pelo filtro de nome) e **todos os
  bloqueios de uma rota no mês** (uma consulta na tela de bloqueios). Cada ida
  vira uma linha em `ofertas.coleta` (tipo `conferencia`) — é o que conta para
  o teto.
- `src/lib/revalidador/portal-cativa.ts` — o robô no portal. Usa o **Microsoft
  Edge que já vem no Windows**, invisível (`playwright-core` 1.63.0, sem
  baixar navegador). Trava no código: nunca clica em nada que reserve,
  adicione, emita ou pague. Guarda a sessão em `.dados/` (fora do git).
- `src/lib/revalidador/codigo-email.ts` — lê o código de verificação no Gmail
  da operação, **somente leitura** (`imapflow` 2.0.6).
- `src/lib/revalidador/saude.ts` + tela de Saúde, bloco **Operadoras**.
- Estado do login em `ofertas.fonte_acesso`: `ok` · `desligado` (falta algo
  no .env ou `revalidador.ligado = 0`) · `caiu` (tenta de novo só depois de
  30 min) · `senha_recusada` (só tenta de novo quando a senha do .env mudar —
  guarda uma impressão digital, nunca a senha).
- Configuração (`ofertas.configuracao`, editável): `revalidador.ligado`,
  `.mais_baratas_por_destino` (3), `.reconferir_horas` (6), `.pausa_s` (20),
  `.teto_dia` (200), `.hora_inicio` (7), `.hora_fim` (23), `.prazo_s` (120),
  `.codigo_espera_s` (300). O botão funciona a qualquer hora; o automático, só
  no horário.
- Uma regra nova no `gravar.ts` da V1a: se a conferência corrigiu o preço e a
  página da Cativa ainda repete o preço velho, **fica valendo o conferido**
  (sem isso a coleta desfaria a correção a cada 3 h e o robô voltaria ao portal
  sem parar).

**Provado:**

- As leituras com o texto **real** do portal (linha de bloqueio, preço do
  hotel, deadline com hora, código no e-mail): 16 testes ok.
- O Edge invisível abre o portal e acha usuário, senha e "Entrar" (8 s).
- **Sem credenciais:** o motor (passada 47) atendeu o "Conferir agora" com
  "não conferida — falta configurar o login do robô (…)" e a Saúde mostra o
  que falta. Clicar duas vezes não gerou dois pedidos.

**Ainda NÃO provado (espera o usuário do robô e a senha de app do Gmail):**

- O login completo, em especial a **tela do código** (`auth.xhtml`): não a
  vimos por dentro (o Saulo digitou o código). O robô procura o primeiro campo
  de texto e um botão "confirmar/validar/enviar/entrar"; pode precisar de
  ajuste na primeira vez.
- A busca de pacote ponta a ponta (escolher "CATIVA COMISSIONADO", origem,
  destino, datas, a aba do pacote, o filtro do hotel). Cada passo foi feito à
  mão na parte B, do mesmo jeito; falta rodar com o robô.
- De quem vem o e-mail do código: o robô procura "cativa", "infotravel" ou
  "infotera" no remetente/assunto.
