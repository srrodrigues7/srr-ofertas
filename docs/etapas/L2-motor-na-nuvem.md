# Etapa L2 — O motor num servidor na nuvem

> **ADIADA (03/11/2026) — o motor segue no notebook.** Decisão do Saulo: sem
> servidor pago ("muito caro"). Nada desta especificação é construído nem
> contratado; ela fica guardada para se um dia o notebook não der conta.
> Conferido no mesmo dia: o motor **não liga sozinho** quando o Windows liga
> — não há tarefa no Agendador nem atalho de inicialização; ele roda num
> `npm run motor` aberto à mão (o de agora subiu em 02/11 às 19:09, versão
> `1915246`). O caminho para ligar sozinho já existe e nunca rodou de ponta
> a ponta: o instalador do O0 (`instalador/`, "Instalar SRR Ofertas": vigia +
> Agendador, sobe sem ninguém entrar no Windows, volta se cair, atualiza do
> `main`). Precisa de uma chave de leitura do GitHub, do `.env` de produção
> em `C:SRR-Ofertas` e de parar o motor manual antes (uma trava só).
>
> **Atualização (03/11, tarde): o motor já liga sozinho quando o Saulo entra
> no Windows**, sem o instalador e sem administrador. Um atalho minimizado
> na pasta de Inicialização (`shell:startup`, "SRR Ofertas - Motor.lnk")
> abre `%LOCALAPPDATA%SRR-Ofertasmotor.cmd`, um laço que liga o
> `npm run motor` da pasta do repositório e o religa 10 s depois de cair; a
> saída vai para `%LOCALAPPDATA%SRR-Ofertasmotor-saida.log`. Provado no
> mesmo dia (motor 40400, "Peguei a trava" às 14:29:02). A tarefa do
> Agendador tentada antes devolvia 1 sem rodar e foi apagada. Limites: só
> liga **depois que o Saulo entra no Windows** (não na tela de login); fechar
> a janela minimizada para o motor; e ele roda o código da pasta de
> trabalho, então um `git pull` lá só vale depois de o motor religar.

**Esforço: alto.** O código do motor quase não muda. O peso está em pôr
num computador alugado, ligado na internet o tempo todo, a chave do banco de
produção, o login do robô da Cativa e a senha de app do Gmail, e em trocar o
motor de casa sem dois motores rodando juntos e sem perder coleta.

> Especificação apenas. **Nada é construído nem contratado** antes de o
> Saulo escolher o servidor e aprovar o plano.

## O que o Saulo decidiu (02/11/2026)

- "O motor segue no notebook para lançar rápido", e vem uma etapa própria
  para ele ir para **um servidor na nuvem**: "nem sempre o notebook vai
  estar ligado".
- Esta etapa substitui a ideia antiga do "computador dedicado na agência"
  (O0, o instalador de Windows em `instalador/`).

## O objetivo, em uma frase

**O motor do Radar roda num servidor alugado em São Paulo, 24 horas por
dia, sem depender do notebook do Saulo**, e o notebook só fica com o que
precisa ficar (pergunta 2).

## O que o motor precisa de uma máquina (medido em 02/11)

| o quê | hoje | no servidor |
|---|---|---|
| Node 24 e o código do Radar | notebook | o mesmo; o **vigia** (`instalador/vigia.mjs`) é Node puro e já sabe atualizar do `main` do GitHub, voltar de versão ruim e religar o motor |
| Ligar sozinho quando o computador liga | Agendador de Tarefas do Windows (`instalador/*.ps1`) | serviço do Linux (`systemd`) chamando o mesmo vigia; o instalador de Windows não serve |
| Navegador | o **revalidador da Cativa** abre o Edge (`channel: "msedge"` em `src/lib/revalidador/portal-cativa.ts`); as outras fontes não usam navegador | Chromium no Linux; o canal vira configuração |
| Banco | `DATABASE_URL` do papel `srr_ofertas`, porta 5432 | a mesma, com pool pequena (R3) |
| Gmail da operação (código da Cativa) | IMAP, só leitura | igual; funciona de qualquer lugar |
| **Arquivo do monitor de WhatsApp** | a ponte lê `data/passagens-messages.json` na pasta do monitor, **no notebook** | **não existe no servidor** (pergunta 2) |
| Memória | Node + um navegador às vezes | 2 GB funciona; **4 GB com folga** para o navegador do revalidador |
| Tráfego | Cativa: uma leitura grande por dia depois da C1; Smiles e Melhores Destinos: muitas consultas pequenas | baixo; cabe em qualquer plano |

O motor de hoje faz uma passada por minuto, de cerca de 1 segundo
(`logs/motor-2026-11-02.log`). Não precisa de máquina forte.

## Perguntas ao Saulo

**1. Qual servidor?** Todos em **São Paulo**: o banco está lá (Supabase
`sa-east-1`) e as fontes brasileiras veem um endereço brasileiro. Preços de
tabela pública em novembro de 2026; o valor exato de São Paulo **se confere
na página de cada um na hora de contratar**, porque alguns cobram mais caro
lá do que nos Estados Unidos.

- **A) Hostinger VPS (KVM 2: 2 processadores, 8 GB, 100 GB).** Cerca de
  **R$ 35 por mês na promoção** (contrato longo, pago adiantado) e cerca de
  **R$ 70 por mês na renovação**. Em reais, painel em português, a mais
  barata e a mais folgada. Custa: o preço baixo exige contrato de 12 a 48
  meses; o datacenter no Brasil existe, mas é preciso confirmar no pedido que
  a máquina fica em São Paulo.
- **B) Vultr, São Paulo (2 processadores, 4 GB, 80 GB).** Cerca de **US$ 30
  por mês** em São Paulo (US$ 20 nos EUA), cobrado por hora, sem contrato:
  liga, testa, desliga e paga só as horas. Custa: em dólar, no cartão.
- **C) Amazon Lightsail, São Paulo (2 GB: US$ 12; 4 GB: US$ 24 na tabela dos
  EUA).** A Amazon abriu o Lightsail em São Paulo em junho de 2026. Ganha: a
  estrutura mais conhecida, do mesmo tipo da que hospeda o banco. Custa: o
  preço de São Paulo não está na tabela pública que achamos; a franquia de
  tráfego lá é a metade (sobra para nós).
- **Fora da mesa:** a máquina grátis da Oracle (relatos de falta de vaga em
  São Paulo e de conta encerrada sem aviso; motor de produção não pode
  depender disso).
- **Recomendação: B (Vultr São Paulo, 4 GB).** Paga por hora, então a prova
  das fontes (abaixo) custa centavos e, se uma fonte recusar o endereço do
  servidor, desliga-se sem multa. Depois de provado, se o Saulo quiser
  economizar, a Hostinger em contrato anual sai pela metade.

**2. E os alertas do WhatsApp?** O monitor de WhatsApp é outro sistema do
Saulo, mora no notebook e não é tocado pelo Radar (decisão de 30/10). Com o
notebook desligado, **não chega alerta novo de jeito nenhum**, esteja o
motor onde estiver.

- **A) A ponte fica no notebook:** o motor vai para o servidor; no notebook
  fica só `npm run alertas -- --vigiar`, que copia o arquivo do monitor para
  o banco quando o notebook está ligado. Ganha: nada muda no monitor.
  Custa: alertas só com o notebook ligado (como hoje).
- **B) O monitor vai junto para o servidor:** WhatsApp lido 24 h. Custa:
  mexer no monitor (outro sistema, outro projeto), ler o QR do WhatsApp de
  novo, e uma sessão do WhatsApp do Saulo rodando num servidor alugado.
- **Recomendação: A agora**; B, se o Saulo quiser, vira uma etapa do monitor,
  não do Radar.

## O plano (cada passo com o "sim" do Saulo)

| passo | o quê | quem | pronto quando |
|---|---|---|---|
| 1 | Código: navegador configurável (Edge no Windows, Chromium no Linux); vigia e instalação para Linux (`systemd`, sem PowerShell); pool do banco limitada no motor | sessão da L2 | `npm run check`; o motor no notebook igual |
| 2 | **O Saulo** contrata o servidor (conta e cartão dele), com acesso só por chave SSH | Saulo, guiado | o servidor responde |
| 3 | Prova das fontes **sem gravar**: do servidor, `npm run motor -- --conferir` e as provas de leitura (Smiles, Melhores Destinos, Cativa) | sessão da L2 | as três respondem do endereço do servidor |
| 4 | Configuração: `.env` do servidor **digitado pelo Saulo** (banco, Cativa, Gmail); chave de leitura do GitHub para o vigia atualizar do `main` | Saulo, guiado | `--conferir` ok |
| 5 | **A troca**: parar o motor do notebook, ligar o do servidor; no notebook, só a ponte dos alertas (pergunta 2) | Saulo + sessão | Saúde verde; `ofertas.motor_instancia` com a máquina nova |
| 6 | Uma semana de vigia: passadas, coletas, conexões | controle | nenhuma passada perdida |

## Riscos

| # | risco | grav. | como evitar |
|---|---|---|---|
| L2-1 | **A fonte recusa o endereço de datacenter** (Smiles e outras protegem contra robôs; endereço de servidor é mais suspeito que o de casa) | ALTO | passo 3 antes de qualquer troca; nunca contornar bloqueio (regra da casa); se uma fonte recusar, ela fica no notebook ou espera |
| L2-2 | **Dois motores ao mesmo tempo** (o do notebook e o do servidor) | BAIXO | o motor já tem uma trava no banco (`ofertas.motor_trava`): um segundo motor ligado fica esperando; mesmo assim a troca desliga um antes de ligar o outro; `motor_instancia` mostra quem está vivo |
| L2-3 | **Segredos num servidor ligado na internet** (banco, Cativa, Gmail) | ALTO | só chave SSH (nada de senha), porta de entrada só a do SSH, atualizações automáticas do sistema, `.env` legível só pelo usuário do motor; o papel do banco só enxerga `ofertas`; o robô da Cativa é um usuário só dele; a senha do Gmail é de app (revogável) |
| L2-4 | **Conexões do banco** (R3): pool padrão de 10 por processo | MÉDIO | pool 2 no motor (passo 1) |
| L2-5 | **Atualização automática quebrando o motor** (o vigia puxa o `main`) | MÉDIO | o vigia já volta sozinho para a versão anterior; o `main` só recebe o que o Saulo aprovou |
| L2-6 | **Custo em dólar** variando com o câmbio | BAIXO | valor mensal pequeno; a opção A é em reais |
| L2-7 | **O servidor some** (provedor fora do ar) | BAIXO | o notebook continua sabendo rodar o motor (`npm run motor`); a Saúde avisa "motor parado" |

## Como provar

1. Do servidor, as três fontes respondem (passo 3), sem gravar nada.
2. Depois da troca, a Saúde mostra o motor vivo na máquina nova, passadas a
   cada minuto, e "Buscar agora" pela tela é atendido sem o notebook ligado.
3. Desligar o notebook por uma noite: na manhã seguinte, coletas da noite no
   banco (`ofertas.coleta`), nenhuma passada perdida.
4. `pg_stat_activity` do papel `srr_ofertas`: no máximo 2 do motor.
5. Derrubar o motor no servidor de propósito: o vigia religa sozinho.

## Como desfazer

Parar o serviço no servidor e ligar `npm run motor` no notebook (o `.env` do
notebook continua lá). Minutos. O servidor pode ficar desligado (e, na
Vultr, deixa de cobrar ao ser apagado).

## Regras desta etapa

- **Quem contrata, paga e guarda o acesso ao servidor é o Saulo.** A sessão
  nunca cria conta, nunca digita senha nem cartão.
- Segredo nunca no chat nem no commit; o `.env` do servidor é digitado pelo
  Saulo.
- Revisor da fusão antes de commitar o que toca `src/motor/`,
  `instalador/` ou `process.env` (FUSAO, seção 5).
- Nenhuma fonte com bloqueio é contornada.

## Fora do escopo

Mover o monitor de WhatsApp (pergunta 2, opção B, é etapa do monitor);
avisos de saúde no celular (o Telegram é a V5); as telas do Radar no VoePro
(etapa L).

## Fontes dos preços (consultadas em 02/11/2026; conferir no site na hora)

- Hostinger KVM 2: [Hora de Codar, preço 2026](https://horadecodar.com.br/valor-vps/), [Cybernews](https://cybernews.com/br/melhor-hospedagem-de-sites/provedores-de-vps-baratos/), [VPSBenchmarks](https://www.vpsbenchmarks.com/hosters/hostinger/plans/kvm-2)
- Vultr São Paulo: [Cloud Mercato, 2 vCPU 4 GB](https://pcr.cloud-mercato.com/providers/vultr/flavors/vc2-2c-4gb/pricing), [Spare Cores](https://sparecores.com/server/vultr/vc2-2c-4gb)
- Lightsail: [AWS, Lightsail em São Paulo (06/2026)](https://aws.amazon.com/pt/about-aws/whats-new/2026/06/amazon-lightsail-aws-regions/), [tabela de preços oficial](https://aws.amazon.com/lightsail/pricing), [OneDollarVPS, planos](https://onedollarvps.com/pricing/aws-lightsail-pricing)
- Oracle grátis: [documentação](https://docs.oracle.com/iaas/Content/FreeTier/resourceref.htm), [relato de falta de vaga em São Paulo](https://www.tabnews.com.br/valterpatrick/69c1c4c7-978a-4fdf-8a88-286854f372d3)
