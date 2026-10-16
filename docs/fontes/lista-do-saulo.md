# A lista de fontes do Saulo

Enviada pelo Saulo em 11/10/2026. É a matéria-prima das etapas V1b e V3.x.

| fornecedor | link | o que parece ser | etapa |
|---|---|---|---|
| **Cativa** | https://linktr.ee/cativaoperadora | página de links oficial da Cativa | V1b |
| **Cativa** | https://viajandocomdesconto.com/ | catálogo aberto (pacotes + bloqueios); **a Cativa passou o link ao Saulo — é canal deles** | V1b |
| **Cativa** | https://www.cativaoperadora.com.br/divulgacao/srr-viagens?Embarque=DF | **página de divulgação personalizada da SRR**, filtrada por embarque no DF | V1b |
| **Cativa** | https://reservas.cativaoperadora.com.br/infotravel/ | portal do agente (Infotravel), com login | V1b (parte B) |
| **Hoteldo** | https://ag00057124-hoteldo.e-agencias.com/ | **endereço próprio da agência** na plataforma e-agencias (Despegar) | V1b |
| **Pátria** | https://portal.patria.tur.br/ | portal da operadora (parceria começando) | V3.x |
| **Azul Viagens** | https://www.azulviagens.com.br/ | site da operadora da Azul (a SRR tem cadastro) | V3.x |
| **Expedia TAAP** | https://www.expediataap.com.br/ | programa de agentes da Expedia (Travel Agent Affiliate Program) | V3.x |

Já em andamento na V1a: **Smiles** e **Melhores Destinos**.

Ordem sugerida para a V3.x, depois da primeira vitrine: Azul Viagens (cadastro
pronto e marca forte em BSB), Expedia TAAP (programa de afiliados costuma ter
caminho oficial de integração), Pátria (parceria nova).

## Situação (14/10/2026)

- **Hoteldo: de fora por enquanto.** Não haverá chave de API, e o portal tem
  proteção anti-robô (DataDome) e `robots.txt` proibindo a busca. Volta quando
  houver outro caminho legítimo (ex.: extensão que captura o que a equipe vê,
  ou e-mails de promoção).
- **Pátria, Azul Viagens e Expedia TAAP:** investigação aberta na V3a.

## Situação (15/10/2026, fim da V3a)

- **Azul Viagens: depois** (decisão do Saulo). Quando voltar, pela API do Juniper (o sistema por trás do site). A
  busca é aberta para gente, mas tem o anti-robô da Akamai. Texto do pedido em
  [azul-viagens.md](azul-viagens.md).
- **Pátria: depois** (decisão do Saulo). É consolidadora; o caminho é a API
  Travellink da Wooba. Motivos para retomar em [patria.md](patria.md).
- **Expedia TAAP: depois** (decisão do Saulo). O caminho é a Rapid API da
  Expedia Partner Solutions; pedido guardado em [expedia-taap.md](expedia-taap.md).
