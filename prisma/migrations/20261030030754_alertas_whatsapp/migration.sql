-- V6 — os alertas do grupo "Alerta Passagens CPM" (WhatsApp) viram ofertas.
--
-- Escrita à mão (não pelo `migrate diff` contra o banco): as etapas V2 e V4
-- correm em paralelo e podem ter colunas no banco de testes que esta pasta
-- não conhece; um diff automático tentaria apagá-las.
--
-- Decisões do Saulo (29–30/10/2026): o radar lê o arquivo do monitor (o
-- monitor não é tocado); entram só Smiles, Azul (Fidelidade e Pelo Mundo, com
-- milheiros diferentes) e LATAM; origem BSB sempre, GRU/GIG só internacional;
-- uma oferta por mês com todas as datas; o preço é o da SRR, com "+ taxas" a
-- conferir quando o alerta não dá a taxa em reais.

-- A fonte nem sempre dá a taxa: o preço sai "R$ X + taxas".
ALTER TABLE "ofertas"."fonte" ADD COLUMN "taxas_a_conferir" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ofertas"."alerta_mensagem" (
    "id" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "tem_midia" BOOLEAN NOT NULL DEFAULT false,
    "enviada_em" TIMESTAMPTZ(6) NOT NULL,
    "revisao" TEXT NOT NULL,
    "assinatura" TEXT NOT NULL,
    "recebida_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lida_em" TIMESTAMPTZ(6),
    "resultado" TEXT,
    "motivo" TEXT,
    "repetida" BOOLEAN NOT NULL DEFAULT false,
    "ofertas" INTEGER NOT NULL DEFAULT 0,
    "entendido" JSONB,

    CONSTRAINT "alerta_mensagem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "alerta_mensagem_enviada_em_idx" ON "ofertas"."alerta_mensagem"("enviada_em");
CREATE INDEX "alerta_mensagem_lida_em_idx" ON "ofertas"."alerta_mensagem"("lida_em");
CREATE INDEX "alerta_mensagem_assinatura_idx" ON "ofertas"."alerta_mensagem"("assinatura");

CREATE TABLE "ofertas"."alerta_ponte" (
    "id" TEXT NOT NULL DEFAULT 'ponte',
    "maquina" TEXT,
    "lida_em" TIMESTAMPTZ(6),
    "no_arquivo" INTEGER NOT NULL DEFAULT 0,
    "novas" INTEGER NOT NULL DEFAULT 0,
    "monitor_em" TIMESTAMPTZ(6),
    "monitor" JSONB,
    "erro" TEXT,

    CONSTRAINT "alerta_ponte_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ofertas"."alerta_origem" (
    "codigo" TEXT NOT NULL,
    "so_internacional" BOOLEAN NOT NULL,

    CONSTRAINT "alerta_origem_pkey" PRIMARY KEY ("codigo")
);

CREATE TABLE "ofertas"."alerta_programa" (
    "nome" TEXT NOT NULL,
    "exemplo" TEXT NOT NULL,
    "programa_id" TEXT,
    "vezes" INTEGER NOT NULL DEFAULT 0,
    "visto_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerta_programa_pkey" PRIMARY KEY ("nome")
);
ALTER TABLE "ofertas"."alerta_programa" ADD CONSTRAINT "alerta_programa_programa_id_fkey"
  FOREIGN KEY ("programa_id") REFERENCES "ofertas"."programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Os programas que os alertas usam e a SRR vende. Milheiro VAZIO: quem
-- preenche é o Saulo, em Valores (até lá a tela diz o que falta).
INSERT INTO "ofertas"."programa" ("id", "nome", "usa_clube") VALUES
  ('smiles',          'Smiles',          true),
  ('azul_fidelidade', 'Azul Fidelidade', false),
  ('azul_pelo_mundo', 'Azul Pelo Mundo', false),
  ('latam_pass',      'LATAM Pass',      false)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ofertas"."fonte" ("id", "nome", "tipo", "degrau", "aplica_margem", "programa_id", "taxas_a_conferir", "observacao") VALUES
  ('alerta_cpm', 'Alerta CPM', 'milhas', 3, true, NULL, true,
   'Alertas do grupo de WhatsApp "Alerta Passagens CPM", lidos do arquivo do monitor de WhatsApp do Saulo (a ponte não toca no monitor). Preço pelo milheiro e pela margem da SRR; o valor em reais do grupo fica só como referência da equipe. Ficha: docs/fontes/alerta-cpm.md')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ofertas"."alerta_origem" ("codigo", "so_internacional") VALUES
  ('BSB', false),
  ('GRU', true),
  ('GIG', true)
ON CONFLICT ("codigo") DO NOTHING;

-- Como os programas aparecem escritos nos alertas (levantado nos 416 alertas
-- de 07 a 29/10/2026). Sem programa = fora da vitrine.
INSERT INTO "ofertas"."alerta_programa" ("nome", "exemplo", "programa_id") VALUES
  ('smiles',                        'Smiles',                        'smiles'),
  ('azul fidelidade',               'Azul Fidelidade',               'azul_fidelidade'),
  ('tudoazul',                      'TudoAzul',                      'azul_fidelidade'),
  ('azul',                          'Azul',                          'azul_fidelidade'),
  ('azul pelo mundo',               'Azul Pelo Mundo',               'azul_pelo_mundo'),
  ('latam pass',                    'LATAM Pass',                    'latam_pass'),
  ('latam',                         'LATAM',                         'latam_pass'),
  ('privilege club',                'Privilege Club',                NULL),
  ('qatar avios',                   'Qatar Avios',                   NULL),
  ('iberia club',                   'Iberia Club',                   NULL),
  ('iberia plus',                   'Iberia Plus',                   NULL),
  ('finnair plus',                  'Finnair Plus',                  NULL),
  ('finnair',                       'Finnair',                       NULL),
  ('british airways executive club','British Airways Executive Club',NULL),
  ('executive club',                'Executive Club',                NULL),
  ('flying blue',                   'Flying Blue',                   NULL),
  ('tap miles&go',                  'TAP Miles&Go',                  NULL),
  ('aeroplan',                      'Aeroplan',                      NULL),
  ('air canada aeroplan',           'Air Canada Aeroplan',           NULL),
  ('aadvantage',                    'AAdvantage',                    NULL),
  ('alaska mileage plan',           'Alaska Mileage Plan',           NULL),
  ('alaskamiles',                   'AlaskaMiles',                   NULL),
  ('virgin points',                 'Virgin Points',                 NULL),
  ('virginpoints',                  'VirginPoints',                  NULL),
  ('miles & more',                  'Miles & More',                  NULL),
  ('skywards',                      'Skywards',                      NULL),
  ('mileageplus',                   'MileagePlus',                   NULL)
ON CONFLICT ("nome") DO NOTHING;

INSERT INTO "ofertas"."configuracao" ("chave", "valor", "descricao") VALUES
  ('alertas.validade_horas',        '24', 'Alertas do WhatsApp: horas que a oferta de um alerta fica na vitrine (disponibilidade em milhas some rápido). O mesmo alerta postado de novo renova o prazo.'),
  ('alertas.silencio_horas',        '3',  'Alertas do WhatsApp: sem alerta novo por estas horas, dentro do horário do grupo, a Saúde avisa que o monitor pode ter parado de mandar.'),
  ('alertas.silencio_hora_inicio',  '11', 'Alertas do WhatsApp: a partir desta hora (Brasília) vale o aviso de silêncio (o grupo começa a postar por volta das 9h).'),
  ('alertas.silencio_hora_fim',     '19', 'Alertas do WhatsApp: até esta hora (Brasília) vale o aviso de silêncio (o grupo para por volta das 18h–20h).'),
  ('alertas.silencio_dias_uteis',   '1',  'Alertas do WhatsApp: 1 = o aviso de silêncio só vale de segunda a sexta (o grupo não posta no fim de semana); 0 = todos os dias.'),
  ('alertas.ponte_parada_min',      '15', 'Alertas do WhatsApp: a ponte sem ler o arquivo do monitor há estes minutos = aviso na Saúde.'),
  ('alertas.conferir_smiles_horas', '6',  'Alertas do WhatsApp: o robô confere sozinho no calendário da Smiles as ofertas de alerta Smiles econômica, e de novo depois destas horas (0 = só no botão "Conferir agora").')
ON CONFLICT ("chave") DO NOTHING;

-- Os aeroportos que faltavam no cadastro: o leitor precisa saber o que é
-- nacional (GRU/GIG só valem para internacional) e as réguas da V2 ganham país
-- e região dos destinos que os alertas trazem.
INSERT INTO "ofertas"."lugar" ("codigo", "cidade", "uf", "pais", "regiao", "estilo") VALUES
  ('PLU', 'Belo Horizonte', 'MG', 'Brasil', 'Sudeste', 'cidade'),
  ('CFB', 'Cabo Frio', 'RJ', 'Brasil', 'Sudeste', 'praia'),
  ('MOC', 'Montes Claros', 'MG', 'Brasil', 'Sudeste', 'cidade'),
  ('IPN', 'Ipatinga', 'MG', 'Brasil', 'Sudeste', 'cidade'),
  ('GVR', 'Governador Valadares', 'MG', 'Brasil', 'Sudeste', 'cidade'),
  ('JDF', 'Juiz de Fora', 'MG', 'Brasil', 'Sudeste', 'cidade'),
  ('UBA', 'Uberaba', 'MG', 'Brasil', 'Sudeste', 'cidade'),
  ('RAO', 'Ribeirão Preto', 'SP', 'Brasil', 'Sudeste', 'cidade'),
  ('SJP', 'São José do Rio Preto', 'SP', 'Brasil', 'Sudeste', 'cidade'),
  ('PPB', 'Presidente Prudente', 'SP', 'Brasil', 'Sudeste', 'cidade'),
  ('BAU', 'Bauru', 'SP', 'Brasil', 'Sudeste', 'cidade'),
  ('JTC', 'Bauru', 'SP', 'Brasil', 'Sudeste', 'cidade'),
  ('SJK', 'São José dos Campos', 'SP', 'Brasil', 'Sudeste', 'cidade'),
  ('MII', 'Marília', 'SP', 'Brasil', 'Sudeste', 'cidade'),
  ('ARU', 'Araçatuba', 'SP', 'Brasil', 'Sudeste', 'cidade'),
  ('CAW', 'Campos dos Goytacazes', 'RJ', 'Brasil', 'Sudeste', 'cidade'),
  ('MEA', 'Macaé', 'RJ', 'Brasil', 'Sudeste', 'cidade'),
  ('LDB', 'Londrina', 'PR', 'Brasil', 'Sul', 'cidade'),
  ('MGF', 'Maringá', 'PR', 'Brasil', 'Sul', 'cidade'),
  ('CAC', 'Cascavel', 'PR', 'Brasil', 'Sul', 'cidade'),
  ('JOI', 'Joinville', 'SC', 'Brasil', 'Sul', 'cidade'),
  ('XAP', 'Chapecó', 'SC', 'Brasil', 'Sul', 'cidade'),
  ('JJG', 'Jaguaruna', 'SC', 'Brasil', 'Sul', 'praia'),
  ('CXJ', 'Caxias do Sul', 'RS', 'Brasil', 'Sul', 'serra'),
  ('PFB', 'Passo Fundo', 'RS', 'Brasil', 'Sul', 'cidade'),
  ('PET', 'Pelotas', 'RS', 'Brasil', 'Sul', 'cidade'),
  ('URG', 'Uruguaiana', 'RS', 'Brasil', 'Sul', 'cidade'),
  ('SMI', 'Santa Maria', 'RS', 'Brasil', 'Sul', 'cidade'),
  ('RVD', 'Rio Verde', 'GO', 'Brasil', 'Centro-Oeste', 'cidade'),
  ('CLV', 'Caldas Novas', 'GO', 'Brasil', 'Centro-Oeste', 'natureza'),
  ('ROO', 'Rondonópolis', 'MT', 'Brasil', 'Centro-Oeste', 'cidade'),
  ('SIC', 'Sinop', 'MT', 'Brasil', 'Centro-Oeste', 'cidade'),
  ('AFL', 'Alta Floresta', 'MT', 'Brasil', 'Centro-Oeste', 'natureza'),
  ('OPS', 'Sinop', 'MT', 'Brasil', 'Centro-Oeste', 'cidade'),
  ('DOU', 'Dourados', 'MS', 'Brasil', 'Centro-Oeste', 'cidade'),
  ('CMG', 'Corumbá', 'MS', 'Brasil', 'Centro-Oeste', 'natureza'),
  ('LEC', 'Lençóis', 'BA', 'Brasil', 'Nordeste', 'natureza'),
  ('VDC', 'Vitória da Conquista', 'BA', 'Brasil', 'Nordeste', 'cidade'),
  ('BRA', 'Barreiras', 'BA', 'Brasil', 'Nordeste', 'cidade'),
  ('FEC', 'Feira de Santana', 'BA', 'Brasil', 'Nordeste', 'cidade'),
  ('PAV', 'Paulo Afonso', 'BA', 'Brasil', 'Nordeste', 'cidade'),
  ('TXF', 'Teixeira de Freitas', 'BA', 'Brasil', 'Nordeste', 'cidade'),
  ('PNZ', 'Petrolina', 'PE', 'Brasil', 'Nordeste', 'cidade'),
  ('CPV', 'Campina Grande', 'PB', 'Brasil', 'Nordeste', 'cidade'),
  ('JDO', 'Juazeiro do Norte', 'CE', 'Brasil', 'Nordeste', 'cidade'),
  ('MVF', 'Mossoró', 'RN', 'Brasil', 'Nordeste', 'cidade'),
  ('IMP', 'Imperatriz', 'MA', 'Brasil', 'Nordeste', 'cidade'),
  ('BRB', 'Barreirinhas', 'MA', 'Brasil', 'Nordeste', 'natureza'),
  ('PHB', 'Parnaíba', 'PI', 'Brasil', 'Nordeste', 'praia'),
  ('MCP', 'Macapá', 'AP', 'Brasil', 'Norte', 'cidade'),
  ('BVB', 'Boa Vista', 'RR', 'Brasil', 'Norte', 'cidade'),
  ('PVH', 'Porto Velho', 'RO', 'Brasil', 'Norte', 'cidade'),
  ('RBR', 'Rio Branco', 'AC', 'Brasil', 'Norte', 'cidade'),
  ('STM', 'Santarém', 'PA', 'Brasil', 'Norte', 'natureza'),
  ('MAB', 'Marabá', 'PA', 'Brasil', 'Norte', 'cidade'),
  ('ATM', 'Altamira', 'PA', 'Brasil', 'Norte', 'natureza'),
  ('CKS', 'Parauapebas', 'PA', 'Brasil', 'Norte', 'cidade'),
  ('TBT', 'Tabatinga', 'AM', 'Brasil', 'Norte', 'natureza'),
  ('JPR', 'Ji-Paraná', 'RO', 'Brasil', 'Norte', 'cidade'),
  ('ADD', 'Adis Abeba', NULL, 'Etiópia', 'África', 'cidade'),
  ('CMN', 'Casablanca', NULL, 'Marrocos', 'África', 'cidade'),
  ('AKL', 'Auckland', NULL, 'Nova Zelândia', 'Oceania', 'cidade'),
  ('BNE', 'Brisbane', NULL, 'Austrália', 'Oceania', 'praia'),
  ('PER', 'Perth', NULL, 'Austrália', 'Oceania', 'cidade'),
  ('ASU', 'Assunção', NULL, 'Paraguai', 'América do Sul', 'cidade'),
  ('CCS', 'Caracas', NULL, 'Venezuela', 'América do Sul', 'cidade'),
  ('MDZ', 'Mendoza', NULL, 'Argentina', 'América do Sul', 'natureza'),
  ('USH', 'Ushuaia', NULL, 'Argentina', 'América do Sul', 'neve'),
  ('PDP', 'Punta del Este', NULL, 'Uruguai', 'América do Sul', 'praia'),
  ('VVI', 'Santa Cruz de la Sierra', NULL, 'Bolívia', 'América do Sul', 'cidade'),
  ('CUR', 'Curaçao', NULL, 'Curaçao', 'Caribe e México', 'praia'),
  ('ATH', 'Atenas', NULL, 'Grécia', 'Europa', 'cidade'),
  ('GVA', 'Genebra', NULL, 'Suíça', 'Europa', 'cidade'),
  ('ZRH', 'Zurique', NULL, 'Suíça', 'Europa', 'cidade'),
  ('MUC', 'Munique', NULL, 'Alemanha', 'Europa', 'cidade'),
  ('VIE', 'Viena', NULL, 'Áustria', 'Europa', 'cidade'),
  ('IST', 'Istambul', NULL, 'Turquia', 'Europa', 'cidade'),
  ('BOS', 'Boston', NULL, 'Estados Unidos', 'América do Norte', 'cidade'),
  ('DFW', 'Dallas', NULL, 'Estados Unidos', 'América do Norte', 'cidade'),
  ('EWR', 'Nova York', NULL, 'Estados Unidos', 'América do Norte', 'cidade'),
  ('IAD', 'Washington', NULL, 'Estados Unidos', 'América do Norte', 'cidade'),
  ('IAH', 'Houston', NULL, 'Estados Unidos', 'América do Norte', 'cidade'),
  ('ORD', 'Chicago', NULL, 'Estados Unidos', 'América do Norte', 'cidade'),
  ('PHL', 'Filadélfia', NULL, 'Estados Unidos', 'América do Norte', 'cidade'),
  ('SFO', 'San Francisco', NULL, 'Estados Unidos', 'América do Norte', 'cidade'),
  ('YUL', 'Montreal', NULL, 'Canadá', 'América do Norte', 'cidade'),
  ('AUH', 'Abu Dhabi', NULL, 'Emirados Árabes', 'Oriente Médio', 'cidade'),
  ('DOH', 'Doha', NULL, 'Catar', 'Oriente Médio', 'cidade'),
  ('CMB', 'Colombo', NULL, 'Sri Lanka', 'Ásia', 'praia'),
  ('DEL', 'Nova Délhi', NULL, 'Índia', 'Ásia', 'cidade'),
  ('HAN', 'Hanói', NULL, 'Vietnã', 'Ásia', 'cidade'),
  ('SGN', 'Ho Chi Minh', NULL, 'Vietnã', 'Ásia', 'cidade'),
  ('HKG', 'Hong Kong', NULL, 'China', 'Ásia', 'cidade'),
  ('PKX', 'Pequim', NULL, 'China', 'Ásia', 'cidade'),
  ('HND', 'Tóquio', NULL, 'Japão', 'Ásia', 'cidade'),
  ('NRT', 'Tóquio', NULL, 'Japão', 'Ásia', 'cidade'),
  ('ICN', 'Seul', NULL, 'Coreia do Sul', 'Ásia', 'cidade'),
  ('KUL', 'Kuala Lumpur', NULL, 'Malásia', 'Ásia', 'cidade'),
  ('MNL', 'Manila', NULL, 'Filipinas', 'Ásia', 'cidade')
ON CONFLICT ("codigo") DO NOTHING;
