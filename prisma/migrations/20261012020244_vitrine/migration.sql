-- CreateTable
CREATE TABLE "ofertas"."fonte" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "degrau" INTEGER NOT NULL,
    "ligada" BOOLEAN NOT NULL DEFAULT true,
    "aplica_margem" BOOLEAN NOT NULL,
    "programa_id" TEXT,
    "observacao" TEXT,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fonte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas"."programa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco_milheiro" DECIMAL(10,2),
    "usa_clube" BOOLEAN NOT NULL DEFAULT true,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas"."lugar" (
    "codigo" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT,
    "pais" TEXT,
    "regiao" TEXT,
    "estilo" TEXT,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lugar_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "ofertas"."busca" (
    "id" SERIAL NOT NULL,
    "dono" TEXT NOT NULL DEFAULT 'agencia',
    "origem" TEXT NOT NULL,
    "destino_tipo" TEXT NOT NULL DEFAULT 'cidade',
    "destino" TEXT NOT NULL,
    "data_de" DATE,
    "data_ate" DATE,
    "ida_volta" BOOLEAN NOT NULL DEFAULT true,
    "estadia_min" INTEGER,
    "estadia_max" INTEGER,
    "adultos" INTEGER NOT NULL DEFAULT 1,
    "criancas" INTEGER NOT NULL DEFAULT 0,
    "classe" TEXT NOT NULL DEFAULT 'economica',
    "preco_alvo" DECIMAL(12,2),
    "ligada" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "busca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas"."faixa_busca" (
    "id" SERIAL NOT NULL,
    "de_mes" INTEGER NOT NULL,
    "ate_mes" INTEGER NOT NULL,
    "intervalo_horas" INTEGER NOT NULL,

    CONSTRAINT "faixa_busca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas"."margem" (
    "tipo" TEXT NOT NULL,
    "percentual" DECIMAL(6,2) NOT NULL,
    "minimo_brl" DECIMAL(12,2) NOT NULL,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "margem_pkey" PRIMARY KEY ("tipo")
);

-- CreateTable
CREATE TABLE "ofertas"."parcela_taxa" (
    "parcelas" INTEGER NOT NULL,
    "taxa" DECIMAL(6,2) NOT NULL,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcela_taxa_pkey" PRIMARY KEY ("parcelas")
);

-- CreateTable
CREATE TABLE "ofertas"."coleta" (
    "id" BIGSERIAL NOT NULL,
    "fonte_id" TEXT NOT NULL,
    "busca_id" INTEGER,
    "tipo" TEXT NOT NULL,
    "escopo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL DEFAULT 'agenda',
    "comecou_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminou_em" TIMESTAMPTZ(6),
    "duracao_ms" INTEGER,
    "status" TEXT NOT NULL,
    "requisicoes" INTEGER NOT NULL DEFAULT 0,
    "itens" INTEGER NOT NULL DEFAULT 0,
    "historico" INTEGER NOT NULL DEFAULT 0,
    "resumo" TEXT,
    "erro" TEXT,

    CONSTRAINT "coleta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas"."oferta" (
    "id" BIGSERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "fonte_id" TEXT NOT NULL,
    "busca_id" INTEGER,
    "coleta_id" BIGINT,
    "tipo" TEXT NOT NULL DEFAULT 'passagem',
    "detalhe" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "origem_cidade" TEXT,
    "destino" TEXT NOT NULL,
    "destino_cidade" TEXT,
    "destino_uf" TEXT,
    "destino_pais" TEXT,
    "destino_regiao" TEXT,
    "internacional" BOOLEAN NOT NULL,
    "mes" TEXT NOT NULL,
    "ida" DATE,
    "volta" DATE,
    "noites" INTEGER,
    "composicao" TEXT NOT NULL,
    "classe" TEXT NOT NULL DEFAULT 'economica',
    "companhias" TEXT[],
    "companhia_nome" TEXT,
    "programa_id" TEXT,
    "milhas" INTEGER,
    "milhas_normal" INTEGER,
    "taxas_brl" DECIMAL(12,2),
    "taxas_estimadas" BOOLEAN NOT NULL DEFAULT false,
    "preco_brl" DECIMAL(12,2),
    "preco_referencia_brl" DECIMAL(12,2),
    "parcelas_fonte" INTEGER,
    "bagagem" TEXT NOT NULL DEFAULT 'nao_informada',
    "bagagem_qtd" INTEGER,
    "ida_saida" TIMESTAMP(0),
    "ida_chegada" TIMESTAMP(0),
    "ida_paradas" INTEGER,
    "ida_duracao_min" INTEGER,
    "ida_voos" TEXT,
    "volta_saida" TIMESTAMP(0),
    "volta_chegada" TIMESTAMP(0),
    "volta_paradas" INTEGER,
    "volta_duracao_min" INTEGER,
    "volta_voos" TEXT,
    "assentos" INTEGER,
    "hotel_nome" TEXT,
    "hotel_categoria" DECIMAL(2,1),
    "regime" TEXT,
    "adultos" INTEGER NOT NULL DEFAULT 1,
    "criancas" INTEGER NOT NULL DEFAULT 0,
    "aceita_crianca" BOOLEAN,
    "estilo" TEXT,
    "etiquetas" TEXT[],
    "fornecedor" TEXT,
    "link" TEXT,
    "dados_fonte" JSONB,
    "vista_primeira_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vista_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detalhada_em" TIMESTAMPTZ(6),
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "oferta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas"."preco_observado" (
    "id" BIGSERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "fonte_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "classe" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "ida" DATE,
    "volta" DATE,
    "unidade" TEXT NOT NULL,
    "programa_id" TEXT,
    "minimo" DECIMAL(14,2) NOT NULL,
    "ultimo" DECIMAL(14,2) NOT NULL,
    "vezes" INTEGER NOT NULL DEFAULT 1,
    "companhia" TEXT,
    "primeira_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preco_observado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas"."busca_agora" (
    "id" BIGSERIAL NOT NULL,
    "busca_id" INTEGER NOT NULL,
    "pedido_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'na_fila',
    "comecou_em" TIMESTAMPTZ(6),
    "terminou_em" TIMESTAMPTZ(6),
    "resumo" TEXT,

    CONSTRAINT "busca_agora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "busca_dono_ligada_idx" ON "ofertas"."busca"("dono", "ligada");

-- CreateIndex
CREATE INDEX "coleta_fonte_id_escopo_comecou_em_idx" ON "ofertas"."coleta"("fonte_id", "escopo", "comecou_em");

-- CreateIndex
CREATE INDEX "coleta_comecou_em_idx" ON "ofertas"."coleta"("comecou_em");

-- CreateIndex
CREATE UNIQUE INDEX "oferta_chave_key" ON "ofertas"."oferta"("chave");

-- CreateIndex
CREATE INDEX "oferta_ativa_mes_idx" ON "ofertas"."oferta"("ativa", "mes");

-- CreateIndex
CREATE INDEX "oferta_destino_idx" ON "ofertas"."oferta"("destino");

-- CreateIndex
CREATE INDEX "oferta_fonte_id_ativa_idx" ON "ofertas"."oferta"("fonte_id", "ativa");

-- CreateIndex
CREATE INDEX "oferta_busca_id_ativa_idx" ON "ofertas"."oferta"("busca_id", "ativa");

-- CreateIndex
CREATE INDEX "oferta_etiquetas_idx" ON "ofertas"."oferta" USING GIN ("etiquetas");

-- CreateIndex
CREATE INDEX "preco_observado_origem_destino_mes_classe_idx" ON "ofertas"."preco_observado"("origem", "destino", "mes", "classe");

-- CreateIndex
CREATE INDEX "preco_observado_dia_idx" ON "ofertas"."preco_observado"("dia");

-- CreateIndex
CREATE UNIQUE INDEX "preco_observado_chave_dia_key" ON "ofertas"."preco_observado"("chave", "dia");

-- CreateIndex
CREATE INDEX "busca_agora_status_pedido_em_idx" ON "ofertas"."busca_agora"("status", "pedido_em");

-- AddForeignKey
ALTER TABLE "ofertas"."fonte" ADD CONSTRAINT "fonte_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "ofertas"."programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas"."oferta" ADD CONSTRAINT "oferta_busca_id_fkey" FOREIGN KEY ("busca_id") REFERENCES "ofertas"."busca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas"."busca_agora" ADD CONSTRAINT "busca_agora_busca_id_fkey" FOREIGN KEY ("busca_id") REFERENCES "ofertas"."busca"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Como na fundação: segurança por linha ligada, sem nenhuma regra. Se um dia o
-- schema for exposto por engano, ninguém de fora lê nada.
ALTER TABLE "ofertas"."fonte" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."programa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."lugar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."busca" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."faixa_busca" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."margem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."parcela_taxa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."coleta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."oferta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."preco_observado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."busca_agora" ENABLE ROW LEVEL SECURITY;

-- Trava contra repetição (lição 3): no máximo um "Buscar agora" pendente por
-- pedido de busca. Clicar duas vezes não gera duas buscas.
CREATE UNIQUE INDEX "busca_agora_um_pendente_por_busca"
  ON "ofertas"."busca_agora" ("busca_id")
  WHERE "status" IN ('na_fila', 'buscando');

-- ---------------------------------------------------------------------------
-- Cadastro inicial. Tudo se edita na tela (Valores, Pedidos de busca).
-- ---------------------------------------------------------------------------

-- Programas de milhas. O preço do milheiro fica VAZIO de propósito: só o Saulo
-- sabe quanto paga. Sem ele, a oferta em milhas aparece "sem custo — falta o
-- milheiro" (nunca um número inventado).
INSERT INTO "ofertas"."programa" ("id", "nome", "usa_clube") VALUES
  ('smiles',          'Smiles',            true),
  ('latam_pass',      'LATAM Pass',        false),
  ('azul_fidelidade', 'Azul Fidelidade',   false),
  ('tap_miles_go',    'TAP Miles&Go',      false)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ofertas"."fonte" ("id", "nome", "tipo", "degrau", "aplica_margem", "programa_id", "observacao") VALUES
  ('smiles', 'Smiles', 'milhas', 2, true, 'smiles',
   'Calendário (menor preço por dia) por endpoint aberto, sem navegador. Detalhe do voo pelo endpoint de busca feito de dentro de uma janela do Edge (o Akamai barra quem não é navegador). Ficha: docs/fontes/smiles.md'),
  ('melhores_destinos', 'Melhores Destinos', 'mercado', 2, true, NULL,
   'Mural de preços achados nas últimas 24 h (ida e volta em reais, por mês e por datas), por endpoint aberto. Preço público de site de venda: entra como custo e soma margem (decisão do Saulo). Ficha: docs/fontes/melhores-destinos.md')
ON CONFLICT ("id") DO NOTHING;

-- Horizonte de 10 meses (o Saulo pediu pelo menos 8), os primeiros com mais atenção.
INSERT INTO "ofertas"."faixa_busca" ("de_mes", "ate_mes", "intervalo_horas") VALUES
  (0, 2, 6),
  (3, 5, 12),
  (6, 9, 24);

-- Margem: o exemplo que o Saulo deu (15% com mínimo de R$ 150, vale o maior),
-- igual para todos os tipos até ele ajustar na tela Valores.
INSERT INTO "ofertas"."margem" ("tipo", "percentual", "minimo_brl") VALUES
  ('nacional',      15, 150),
  ('internacional', 15, 150),
  ('executiva',     15, 150),
  ('pacote',        15, 150)
ON CONFLICT ("tipo") DO NOTHING;

-- Parcelas no link de pagamento: "4× sem juros" com 10% embutidos (Saulo, V1a).
INSERT INTO "ofertas"."parcela_taxa" ("parcelas", "taxa") VALUES (4, 10)
ON CONFLICT ("parcelas") DO NOTHING;

INSERT INTO "ofertas"."configuracao" ("chave", "valor", "descricao") VALUES
  ('coleta.max_segundos_por_passada', '100', 'Tempo máximo (segundos) que uma passada do motor gasta indo às fontes. O que não couber fica para a próxima.'),
  ('coleta.pedidos_a_cada_s',         '5',   'De quantos em quantos segundos o motor olha se alguém apertou "Buscar agora".'),
  ('coleta.pausa_apos_bloqueio_min',  '60',  'Se uma fonte recusar o acesso (bloqueio), o motor a deixa em paz por estes minutos.'),
  ('historico.guardar_dias',          '730', 'Quantos dias de histórico de preços o banco guarda (base do "preço normal").'),
  ('ofertas.validade_horas',          '48',  'Oferta não vista de novo por mais que isto (horas) sai da vitrine.'),
  ('parcelas.destaque',               '4',   'Número de parcelas em destaque na vitrine (a taxa vem da tabela de parcelas).'),
  ('busca.estadia_min_padrao',        '3',   'Novo pedido de busca: estadia mínima (dias) já preenchida.'),
  ('busca.estadia_max_padrao',        '10',  'Novo pedido de busca: estadia máxima (dias) já preenchida.'),
  ('smiles.pausa_ms',                 '3000','Smiles: pausa entre duas requisições (milissegundos). Ritmo educado.'),
  ('smiles.prazo_s',                  '30',  'Smiles: tempo máximo de espera por uma resposta (segundos).'),
  ('smiles.combinacoes_por_mes',      '5',   'Smiles: quantas combinações ida+volta mais baratas guardar por pedido e mês de embarque.'),
  ('smiles.detalhes_por_hora',        '12',  'Smiles: quantas datas o navegador detalha por hora, no máximo (horários, conexões, bagagem, taxas).'),
  ('smiles.detalhar_por_busca',       '2',   'Smiles: em cada rodada, quantas datas mais baratas de cada pedido o navegador detalha.'),
  ('smiles.detalhe_validade_horas',   '12',  'Smiles: depois de quantas horas um detalhe de voo fica velho e pode ser refeito.'),
  ('smiles.executiva_datas_por_mes',  '2',   'Smiles: executiva não sai no calendário; quantas datas por mês o navegador consulta.'),
  ('smiles.taxa_estimada_nacional_brl',      '70',  'Smiles: taxa estimada (R$, ida e volta, por pessoa) para datas ainda não detalhadas, enquanto a rota não tem taxa real conhecida. Nacional.'),
  ('smiles.taxa_estimada_internacional_brl', '800', 'Smiles: idem, internacional.'),
  ('md.intervalo_horas',              '12',  'Melhores Destinos: de quantas em quantas horas varrer o mural (ele se atualiza mais ou menos uma vez por dia).'),
  ('md.pausa_ms',                     '2000','Melhores Destinos: pausa entre duas requisições (milissegundos).'),
  ('md.prazo_s',                      '20',  'Melhores Destinos: tempo máximo de espera por uma resposta (segundos).'),
  ('md.datas_por_mes',                '10',  'Melhores Destinos: quantos pares de datas mais baratos guardar por rota e mês.'),
  ('md.estadia_min',                  '3',   'Melhores Destinos: estadia mínima (dias) nas datas dos destinos que não têm pedido de busca.'),
  ('md.estadia_max',                  '15',  'Melhores Destinos: estadia máxima (dias), idem.')
ON CONFLICT ("chave") DO NOTHING;

-- Lugares conhecidos. As fontes completam sozinhas o que faltar.
INSERT INTO "ofertas"."lugar" ("codigo", "cidade", "uf", "pais", "regiao", "estilo") VALUES
  ('BSB', 'Brasília', 'DF', 'Brasil', 'Centro-Oeste', 'cidade'),
  ('GYN', 'Goiânia', 'GO', 'Brasil', 'Centro-Oeste', 'cidade'),
  ('CGB', 'Cuiabá', 'MT', 'Brasil', 'Centro-Oeste', 'cidade'),
  ('CGR', 'Campo Grande', 'MS', 'Brasil', 'Centro-Oeste', 'cidade'),
  ('BYO', 'Bonito', 'MS', 'Brasil', 'Centro-Oeste', 'natureza'),
  ('GRU', 'São Paulo', 'SP', 'Brasil', 'Sudeste', 'cidade'),
  ('CGH', 'São Paulo', 'SP', 'Brasil', 'Sudeste', 'cidade'),
  ('VCP', 'Campinas', 'SP', 'Brasil', 'Sudeste', 'cidade'),
  ('GIG', 'Rio de Janeiro', 'RJ', 'Brasil', 'Sudeste', 'praia'),
  ('SDU', 'Rio de Janeiro', 'RJ', 'Brasil', 'Sudeste', 'praia'),
  ('CNF', 'Belo Horizonte', 'MG', 'Brasil', 'Sudeste', 'cidade'),
  ('VIX', 'Vitória', 'ES', 'Brasil', 'Sudeste', 'praia'),
  ('UDI', 'Uberlândia', 'MG', 'Brasil', 'Sudeste', 'cidade'),
  ('POA', 'Porto Alegre', 'RS', 'Brasil', 'Sul', 'cidade'),
  ('CWB', 'Curitiba', 'PR', 'Brasil', 'Sul', 'cidade'),
  ('FLN', 'Florianópolis', 'SC', 'Brasil', 'Sul', 'praia'),
  ('NVT', 'Navegantes', 'SC', 'Brasil', 'Sul', 'praia'),
  ('IGU', 'Foz do Iguaçu', 'PR', 'Brasil', 'Sul', 'natureza'),
  ('SSA', 'Salvador', 'BA', 'Brasil', 'Nordeste', 'praia'),
  ('BPS', 'Porto Seguro', 'BA', 'Brasil', 'Nordeste', 'praia'),
  ('IOS', 'Ilhéus', 'BA', 'Brasil', 'Nordeste', 'praia'),
  ('REC', 'Recife', 'PE', 'Brasil', 'Nordeste', 'praia'),
  ('FEN', 'Fernando de Noronha', 'PE', 'Brasil', 'Nordeste', 'praia'),
  ('FOR', 'Fortaleza', 'CE', 'Brasil', 'Nordeste', 'praia'),
  ('JJD', 'Jericoacoara', 'CE', 'Brasil', 'Nordeste', 'praia'),
  ('NAT', 'Natal', 'RN', 'Brasil', 'Nordeste', 'praia'),
  ('JPA', 'João Pessoa', 'PB', 'Brasil', 'Nordeste', 'praia'),
  ('MCZ', 'Maceió', 'AL', 'Brasil', 'Nordeste', 'praia'),
  ('AJU', 'Aracaju', 'SE', 'Brasil', 'Nordeste', 'praia'),
  ('SLZ', 'São Luís', 'MA', 'Brasil', 'Nordeste', 'praia'),
  ('THE', 'Teresina', 'PI', 'Brasil', 'Nordeste', 'cidade'),
  ('MAO', 'Manaus', 'AM', 'Brasil', 'Norte', 'natureza'),
  ('BEL', 'Belém', 'PA', 'Brasil', 'Norte', 'cidade'),
  ('PMW', 'Palmas', 'TO', 'Brasil', 'Norte', 'cidade'),
  ('LIS', 'Lisboa', NULL, 'Portugal', 'Europa', 'cidade'),
  ('OPO', 'Porto', NULL, 'Portugal', 'Europa', 'cidade'),
  ('MAD', 'Madri', NULL, 'Espanha', 'Europa', 'cidade'),
  ('BCN', 'Barcelona', NULL, 'Espanha', 'Europa', 'cidade'),
  ('CDG', 'Paris', NULL, 'França', 'Europa', 'cidade'),
  ('FCO', 'Roma', NULL, 'Itália', 'Europa', 'cidade'),
  ('MXP', 'Milão', NULL, 'Itália', 'Europa', 'cidade'),
  ('LHR', 'Londres', NULL, 'Reino Unido', 'Europa', 'cidade'),
  ('AMS', 'Amsterdã', NULL, 'Holanda', 'Europa', 'cidade'),
  ('FRA', 'Frankfurt', NULL, 'Alemanha', 'Europa', 'cidade'),
  ('MIA', 'Miami', NULL, 'Estados Unidos', 'América do Norte', 'praia'),
  ('MCO', 'Orlando', NULL, 'Estados Unidos', 'América do Norte', 'cidade'),
  ('JFK', 'Nova York', NULL, 'Estados Unidos', 'América do Norte', 'cidade'),
  ('FLL', 'Fort Lauderdale', NULL, 'Estados Unidos', 'América do Norte', 'praia'),
  ('LAX', 'Los Angeles', NULL, 'Estados Unidos', 'América do Norte', 'cidade'),
  ('YYZ', 'Toronto', NULL, 'Canadá', 'América do Norte', 'cidade'),
  ('EZE', 'Buenos Aires', NULL, 'Argentina', 'América do Sul', 'cidade'),
  ('AEP', 'Buenos Aires', NULL, 'Argentina', 'América do Sul', 'cidade'),
  ('BRC', 'Bariloche', NULL, 'Argentina', 'América do Sul', 'neve'),
  ('SCL', 'Santiago', NULL, 'Chile', 'América do Sul', 'cidade'),
  ('MVD', 'Montevidéu', NULL, 'Uruguai', 'América do Sul', 'cidade'),
  ('LIM', 'Lima', NULL, 'Peru', 'América do Sul', 'cidade'),
  ('BOG', 'Bogotá', NULL, 'Colômbia', 'América do Sul', 'cidade'),
  ('CTG', 'Cartagena', NULL, 'Colômbia', 'América do Sul', 'praia'),
  ('CUN', 'Cancún', NULL, 'México', 'Caribe e México', 'praia'),
  ('MEX', 'Cidade do México', NULL, 'México', 'Caribe e México', 'cidade'),
  ('PUJ', 'Punta Cana', NULL, 'República Dominicana', 'Caribe e México', 'praia'),
  ('AUA', 'Aruba', NULL, 'Aruba', 'Caribe e México', 'praia'),
  ('ADZ', 'San Andrés', NULL, 'Colômbia', 'Caribe e México', 'praia'),
  ('PTY', 'Cidade do Panamá', NULL, 'Panamá', 'Caribe e México', 'cidade'),
  ('DXB', 'Dubai', NULL, 'Emirados Árabes', 'Oriente Médio', 'cidade'),
  ('JNB', 'Joanesburgo', NULL, 'África do Sul', 'África', 'cidade'),
  ('CPT', 'Cidade do Cabo', NULL, 'África do Sul', 'África', 'cidade'),
  ('SYD', 'Sydney', NULL, 'Austrália', 'Oceania', 'cidade')
ON CONFLICT ("codigo") DO NOTHING;

-- Os destinos principais para começar (pedidos de busca da agência). O Saulo
-- troca na tela "Pedidos de busca": é só um ponto de partida sensato.
-- Nacional sai de Brasília; internacional sai de São Paulo (GRU), como decidido.
INSERT INTO "ofertas"."busca" ("origem", "destino", "estadia_min", "estadia_max", "classe") VALUES
  ('BSB', 'SSA', 3, 10, 'economica'),
  ('BSB', 'REC', 3, 10, 'economica'),
  ('BSB', 'FOR', 3, 10, 'economica'),
  ('BSB', 'MCZ', 3, 10, 'economica'),
  ('BSB', 'NAT', 3, 10, 'economica'),
  ('BSB', 'JPA', 3, 10, 'economica'),
  ('BSB', 'AJU', 3, 10, 'economica'),
  ('BSB', 'BPS', 3, 10, 'economica'),
  ('BSB', 'FLN', 3, 10, 'economica'),
  ('BSB', 'POA', 3, 10, 'economica'),
  ('BSB', 'IGU', 3, 10, 'economica'),
  ('BSB', 'MAO', 3, 10, 'economica'),
  ('BSB', 'GRU', 2, 7, 'economica'),
  ('BSB', 'GIG', 2, 7, 'economica'),
  ('BSB', 'FEN', 4, 10, 'economica'),
  ('GRU', 'LIS', 7, 15, 'economica'),
  ('GRU', 'MAD', 7, 15, 'economica'),
  ('GRU', 'CDG', 7, 15, 'economica'),
  ('GRU', 'FCO', 7, 15, 'economica'),
  ('GRU', 'MIA', 5, 12, 'economica'),
  ('GRU', 'MCO', 5, 12, 'economica'),
  ('GRU', 'EZE', 3, 8, 'economica'),
  ('GRU', 'SCL', 3, 8, 'economica'),
  ('GRU', 'CUN', 5, 10, 'economica'),
  ('GRU', 'PUJ', 5, 10, 'economica'),
  ('GRU', 'LIS', 7, 15, 'executiva'),
  ('GRU', 'MIA', 5, 12, 'executiva');
