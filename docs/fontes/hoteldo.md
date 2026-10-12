# Ficha — Hoteldo

_Etapa V1b, fase 1, parte A (sem login). Investigado em 11/10/2026._

**Veredito: construir depois** — não existe caminho sem login. O caminho
recomendado é **pedir a integração oficial (XML/API) já**; a parte B investiga
o portal logado, mas um robô no login da Hoteldo é arriscado (ver Risco).

Prova: `node scripts/provas/hoteldo-aberto.ts`.

---

## Quem é

A Hoteldo é a rede **só para agências (B2B)** do grupo **Despegar/Decolar**.
Vende hotel, aéreo, traslado, passeios, ingressos de parque e o **pacote aéreo
+ hotel** que a SRR compra. A busca e a reserva acontecem na plataforma
**e-agencias.com** (da Despegar), atrás do login da agência.

## Os caminhos, comparados

| caminho | degrau | o que dá | custa / risco | veredito |
|---|---|---|---|---|
| páginas abertas (`hoteldo.com.br`) | — | **nada de preço**: a página inicial é só apresentação e cadastro | um programa leva **403 (recusado)**; o navegador passa por uma "verificação do dispositivo" (anti-robô); o `robots.txt` **proíbe** robôs em `/pacotes`, `/hoteis`, `/passagens-aereas`, `/login` | **não existe** |
| **integração oficial XML/API** | 1 | o site anuncia "Interface XML — tecnologia de integração compatível (API)", com equipe de suporte XML; o cadastro pergunta "Requer API?". Pela imprensa (2025–2026): API de **hotéis**, de **voos** (250+ companhias) e de **ingressos** (Disney/Universal) | depende da Hoteldo liberar; pode ter exigência técnica (certificado, IP fixo) e talvez custo. **Não sabemos se há API de pacote pronto** — pode ser preciso montar voo + hotel pela API | **pedir agora** (texto abaixo) |
| portal logado (e-agencias.com) + login automático | 4 (ou 2, se tiver endpoint) | a mesma busca que a equipe faz hoje | a Despegar já bloqueia programas na porta (403 + verificação do dispositivo); um robô no login tem grande chance de ser barrado — e **não contornamos proteção anti-robô**. É o acesso que emite: errar aqui pode custar a conta | **parte B** — investigar com o Saulo entrando; só vira conector se não houver bloqueio |

Também existe a **Decolar** (site para o cliente final, mesmo grupo), mas o
preço de lá não é o da Hoteldo — **não é fonte desta etapa**.

## O que vem / o que não vem

**Sem login, nada.** O campo a campo (o pacote vem com o quê, regime, noites,
quartos, preço por pessoa ou total, parcelas sem juros, taxas, se o preço já é
o de venda, busca por destino e mês ou data exata) **só a parte B ou a
documentação da API respondem**. Ficou anotado abaixo como roteiro.

### Características para casar com o gosto do cliente

Pedido da sessão de controle (11/10). **Sem login, nenhuma vem.** O que
conferir na parte B e na documentação da API:

| característica | a conferir |
|---|---|
| regime (all inclusive, café…) | se vem por hotel/tarifa |
| categoria / estrelas | plataformas da Despegar costumam ter estrelas; confirmar |
| praia ou cidade | se há campo ou só o destino |
| região / país / cidade | destino da busca; confirmar códigos |
| criança e faixa de idade | a busca costuma pedir a idade de cada criança; ver se o preço muda e se há "criança grátis" |
| tipo de quarto | se vem a categoria do apartamento e a ocupação |

## Risco e plano B

- **Bloqueio do acesso comercial:** a Despegar tem proteção anti-robô forte.
  Um robô tentando logar e buscar pode ser barrado ou marcar a conta. Por isso
  a ordem é: API oficial > endpoint do portal (se houver e se não for barrado)
  > nada.
- **Plano B:** sem API e com o portal barrado, a Hoteldo fica de fora do robô
  (a equipe continua usando o portal à mão), e os pacotes vêm da Cativa e, na
  V3.x, da Pátria e da Azul Viagens.

## O que se reaproveita para Pátria e Azul Viagens

- O **formato da oferta de pacote** (o mesmo da Cativa).
- O roteiro de "pedir a API primeiro, portal logado só se não houver bloqueio".

## Pedido de API — texto para o Saulo mandar à Hoteldo

> Olá. Na SRR Viagens (agência cliente da Hoteldo) estamos montando um sistema
> interno que acompanha as ofertas de **pacote aéreo + hotel** e de hotéis
> (principalmente **resorts all inclusive**) saindo de Brasília, para
> divulgarmos mais para os nossos clientes.
>
> Gostaríamos de fazer isso pela **integração oficial XML/API**. Vocês podem
> nos passar:
> 1. a documentação da API e o acesso ao ambiente de testes (homologação);
> 2. se existe busca de **pacote aéreo + hotel** pela API, ou se é preciso
>    combinar a API de voos com a de hotéis;
> 3. se o preço que a API devolve já é o de venda (com a nossa comissão) ou o
>    líquido, e se vem o parcelamento;
> 4. os limites de uso (consultas por minuto/dia) e se há algum custo ou
>    exigência técnica (certificado, IP fixo);
> 5. se possível, **um usuário só para o sistema, só consulta**, sem permissão
>    de reservar.
>
> Não vamos reservar pela API neste momento — só consultar preços. Obrigado!

## Para a parte B (portal logado, o Saulo entra)

1. Como se busca um pacote: por **destino e mês** ou só data exata? Quantas
   noites e pessoas por padrão?
2. O pacote vem com o quê: aéreo + hotel, regime, noites, quartos, preço **por
   pessoa ou total**, **parcelas sem juros**, taxas?
3. O preço exibido **já é o de venda** (RAV embutida)? Como aparece a comissão?
4. A busca usa um endpoint (JSON) que dê para chamar de programa, ou a tela
   inteira é montada no navegador? Esse endpoint também é protegido?
5. Como o login funciona: código de verificação? por e-mail? quanto dura a
   sessão? dá para criar **um usuário só para o robô**?
