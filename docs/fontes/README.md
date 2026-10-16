# As fontes

Uma ficha por fonte (o checklist está em `docs/etapas/O1-raio-x-das-fontes.md`).

| fonte | degrau | o que dá | o que não dá | estado |
|---|---|---|---|---|
| [Smiles](smiles.md) | 2 (só o calendário) | milhas Clube por dia, 6+ meses, ida e volta | voo, horário, conexões, bagagem, taxa (estimada), executiva — a busca completa fica atrás do Akamai: **não usar**; pedir acesso | **no ar (V1a)** |
| [Melhores Destinos](melhores-destinos.md) | 2 | ida e volta real em R$, 12 meses, datas, companhia, bagagem, onde comprar | horário, voo, conexões, assentos, executiva | **no ar (V1a)** |
| [Cativa](cativa.md) | 3 (página com JSON dentro) + portal do agente para conferir | **pacotes prontos** (aéreo + hotel, regime, por pessoa em duplo, 10x sem juros, criança grátis às vezes) e **bloqueios aéreos** (ida e volta, horários, assentos, prazo de emissão), de BSB e internacionais de GRU/GIG; conferência ao vivo no portal ([revalidador](revalidador-cativa.md)) | estrelas e tipo de quarto (só no portal), número do voo, bagagem; pacote tem uma data com preço por saída | **no ar (V1b)**; o revalidador espera o usuário do robô |
| [Hoteldo](hoteldo.md) | — | (API B2B oficial existe, sem pacote ainda) | tudo sem login; o portal tem anti-robô | **fora**: decisão do Saulo (sem chave de API) |
| [Azul Viagens](azul-viagens.md) | 1 (API do Juniper, a pedir) | pacote aéreo + hotel saindo de BSB: voo Azul com número e horários, hotel com estrelas e regime (all inclusive), preço por pessoa e do pacote, taxas, bagagem, cancelamento; confere preço ao vivo (`PackageCheckAvail`) | busca por mês, vagas, parcelas na busca. O site é aberto para gente, mas a busca tem o **anti-robô da Akamai**: **não usar**; o caminho é a API | **depois** (decisão do Saulo, 15/10) |
| [Pátria](patria.md) | 1 (API Travellink/Wooba) | passagens (todas as companhias, executiva, bagagem, custo líquido) e hotel avulso | assentos restantes, calendário; portal com reCAPTCHA | **depois** (decisão do Saulo, 15/10) |
| [Expedia TAAP](expedia-taap.md) | 1 (Rapid API, a pedir) | hotel e resort no mundo todo | tudo sem login; login com CAPTCHA, robots.txt proíbe as buscas, desafia programas | **depois** (decisão do Saulo, 15/10) |

## Ordem de construção recomendada (V3a, 15/10/2026)

1. **As três ficaram para depois** (decisão do Saulo, 15/10). Se retomar,
   **Azul Viagens primeiro, pela API do Juniper** — é a única das três que
   traz pacote saindo de BSB com voo e hotel completos e conferência ao vivo.
   O Saulo manda o pedido (texto na ficha); sem a API, não há caminho legítimo
   para robô.
2. Depois **Pátria** e **Expedia TAAP**. Os motivos para retomar estão nas
   fichas.

Regra que se repetiu nas três: **o site de operadora/portal B2B costuma ter
anti-robô** (Akamai, CAPTCHA); o caminho é a **API do sistema por trás do
site** (Juniper, Wooba, Expedia) — vale olhar o rodapé/login de cada novo
fornecedor para saber qual sistema ele usa, porque um conector serve a todos
os fornecedores do mesmo sistema.
