-- Etapa O0 — Fundação: as tabelas da casa (trava, passadas, eventos, configuração).
-- Tudo qualificado com "ofertas". de propósito: nada aqui alcança outro schema.

-- O schema "ofertas" NÃO é criado aqui: quem cria é scripts/preparar-banco.mjs,
-- já com o papel srr_ofertas como dono. O papel, de propósito, não tem
-- permissão de criar schema nenhum no banco (nem este).

-- CreateTable
CREATE TABLE "ofertas"."motor_trava" (
    "id" TEXT NOT NULL DEFAULT 'motor',
    "dono" TEXT,
    "maquina" TEXT,
    "versao" TEXT,
    "travado_ate" TIMESTAMPTZ(6),
    "batimento_em" TIMESTAMPTZ(6),
    "assumiu_em" TIMESTAMPTZ(6),
    "passada_n" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "motor_trava_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas"."motor_instancia" (
    "id" TEXT NOT NULL,
    "maquina" TEXT NOT NULL,
    "pid" INTEGER NOT NULL,
    "versao" TEXT NOT NULL,
    "iniciou_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visto_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL,

    CONSTRAINT "motor_instancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas"."passada" (
    "id" BIGSERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "instancia_id" TEXT NOT NULL,
    "maquina" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "comecou_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminou_em" TIMESTAMPTZ(6),
    "duracao_ms" INTEGER,
    "status" TEXT NOT NULL,
    "resumo" TEXT,
    "erro" TEXT,

    CONSTRAINT "passada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas"."motor_evento" (
    "id" BIGSERIAL NOT NULL,
    "em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maquina" TEXT NOT NULL,
    "versao" TEXT,
    "tipo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,

    CONSTRAINT "motor_evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas"."configuracao" (
    "chave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "descricao" TEXT NOT NULL,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracao_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "motor_instancia_visto_em_idx" ON "ofertas"."motor_instancia"("visto_em");

-- CreateIndex
CREATE INDEX "passada_comecou_em_idx" ON "ofertas"."passada"("comecou_em");

-- CreateIndex
CREATE INDEX "motor_evento_em_idx" ON "ofertas"."motor_evento"("em");


-- O schema não fica exposto pela API do Supabase, e as tabelas ainda assim
-- ligam a segurança por linha, sem nenhuma regra: se um dia alguém expuser o
-- schema por engano, ninguém de fora lê nada. O dono (srr_ofertas) não é
-- afetado por ela.
ALTER TABLE "ofertas"."motor_trava" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."motor_instancia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."passada" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."motor_evento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."configuracao" ENABLE ROW LEVEL SECURITY;

-- A linha única da trava.
INSERT INTO "ofertas"."motor_trava" ("id") VALUES ('motor') ON CONFLICT ("id") DO NOTHING;

-- A configuração inicial, decidida com o Saulo na etapa O0. Muda-se aqui no
-- banco, sem deploy. O código não tem valor padrão para nenhuma delas.
INSERT INTO "ofertas"."configuracao" ("chave", "valor", "descricao") VALUES
  ('motor.intervalo_s',      '60',  'De quantos em quantos segundos o motor dá uma passada.'),
  ('motor.trava_validade_s', '180', 'Se o motor que trabalha parar de dar sinal por este tempo (segundos), outro motor pode assumir.'),
  ('saude.amarelo_apos_s',   '180', 'Tela de Saúde: fica amarela quando o motor está sem dar sinal há mais que isto (segundos).'),
  ('saude.vermelho_apos_s',  '600', 'Tela de Saúde: fica vermelha quando o motor está sem dar sinal há mais que isto (segundos).'),
  ('passadas.guardar_dias',  '90',  'Quantos dias de registro de passadas e de eventos do motor o banco guarda.')
ON CONFLICT ("chave") DO NOTHING;
