# Ficha — Pátria Consolidadora

_Etapa V3a, investigação interrompida em 15/10/2026 por decisão do Saulo._

**Veredito: depois.** A Pátria é **consolidadora** (aéreo, hotel, carro,
ônibus, seguro), não operadora de pacotes: a tarifa aérea dela é a mesma que o
radar já vê no Melhores Destinos, e a homologação na Wooba não compensa agora.

**O caminho, quando voltar:** a **API Travellink da Wooba** (aéreo e hotel).
Exige (1) **homologar o sistema na Wooba**
(<https://developer.wooba.travel/register/>, nome "SRR Ofertas", só
consulta) e depois (2) a **credencial gerada pela Pátria** (login, senha e o
endereço de produção dela). O portal do agente (`portal.patria.tur.br`, que é o
próprio Travellink) **não serve para robô**: o login tem **reCAPTCHA**.

**Vale retomar se a SRR quiser:**
1. o **custo líquido exato** das passagens em dinheiro (a API separa tarifa,
   tarifa net, taxa de embarque, DU, RAV e fee, por passageiro);
2. **hotel avulso** para montar pacote próprio (a API de hotel dá estrelas,
   regime e cancelamento — lembrando que hotel + aéreo somados não é preço de
   pacote);
3. **abrir outros fornecedores que usam a Wooba**: a homologação é do
   sistema, uma vez só; cada consolidadora/operadora Wooba gera o seu login e
   o mesmo conector serve. (Dos fornecedores já vistos, nenhum outro usa:
   Cativa é Infotravel, Hoteldo é Despegar, Azul Viagens é Juniper.)

## O que já ficou anotado, para não refazer

- **Documentação pública:** <https://wooba-sandbox.travellink.com.br/TravellinkWebapi/>
  (Postman; aéreo em português). Acesso = *developer token* + *developer
  access code* cifrado em RSA (da Wooba, no cabeçalho) + login e senha do
  ambiente (da Pátria, no corpo). Há sandbox.
- **Aéreo:** `RecuperarSistemasPesquisa` (quais companhias/GDS vendem a rota)
  → `Disponibilidade` por **data exata** (sem calendário), cabine
  (econômica/executiva), `Flex = true` para **ida e volta casados** (com
  `false` vêm listas separadas — somá-las seria a lição 8). Vem voo, horários,
  conexões, **bagagem**, classe/família tarifária e preço por passageiro.
  **Não vem** quantos assentos restam. **Parcelas só depois de reservar.**
- **Parcelamento:** a Pátria publica a regra por companhia em
  `patria.tur.br/parcelamento` (44 companhias: Azul 6×, GOL 4×, LATAM 4×,
  TAP 10×…) — serviria de `parcelas_fonte`.
- **Não público:** custo, limite de consultas, se a homologação exige o fluxo
  de reserva/emissão.
- A `pedirJson` de hoje só faz GET; a Wooba é POST.

Prova (já escrita; roda hoje a parte aberta e, com a credencial no `.env`, a
busca de voos): `node scripts/provas/patria-wooba.ts`.
