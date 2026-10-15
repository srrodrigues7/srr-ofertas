-- V1b, fase 2 — a Cativa na vitrine e o revalidador automático.
-- Ficha: docs/fontes/cativa.md · desenho: docs/fontes/revalidador-cativa.md

-- CreateTable
CREATE TABLE "ofertas"."conferencia_pedido" (
    "id" BIGSERIAL NOT NULL,
    "oferta_id" BIGINT NOT NULL,
    "motivo" TEXT NOT NULL,
    "pedido_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'na_fila',
    "comecou_em" TIMESTAMPTZ(6),
    "terminou_em" TIMESTAMPTZ(6),
    "resumo" TEXT,

    CONSTRAINT "conferencia_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas"."fonte_acesso" (
    "fonte_id" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "mensagem" TEXT,
    "mudou_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_login_em" TIMESTAMPTZ(6),
    "ultima_conferencia_em" TIMESTAMPTZ(6),
    "credencial_recusada" TEXT,

    CONSTRAINT "fonte_acesso_pkey" PRIMARY KEY ("fonte_id")
);

-- CreateIndex
CREATE INDEX "conferencia_pedido_status_pedido_em_idx" ON "ofertas"."conferencia_pedido"("status", "pedido_em");

-- AddForeignKey
ALTER TABLE "ofertas"."conferencia_pedido" ADD CONSTRAINT "conferencia_pedido_oferta_id_fkey" FOREIGN KEY ("oferta_id") REFERENCES "ofertas"."oferta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Como nas outras tabelas: segurança por linha ligada, sem nenhuma regra.
ALTER TABLE "ofertas"."conferencia_pedido" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."fonte_acesso" ENABLE ROW LEVEL SECURITY;

-- Trava contra repetição (lição 3): no máximo uma conferência pendente por
-- oferta. Clicar duas vezes em "Conferir agora" não gera duas idas ao portal.
CREATE UNIQUE INDEX "conferencia_pedido_um_pendente_por_oferta"
  ON "ofertas"."conferencia_pedido" ("oferta_id")
  WHERE "status" IN ('na_fila', 'conferindo');

-- ---------------------------------------------------------------------------
-- A fonte. Operadora: o preço já é o de venda (RAV embutida), sem margem.
-- ---------------------------------------------------------------------------
INSERT INTO "ofertas"."fonte" ("id", "nome", "tipo", "degrau", "aplica_margem", "programa_id", "observacao") VALUES
  ('cativa', 'Cativa', 'operadora', 3, false, NULL,
   'Pacotes prontos e bloqueios aéreos pelo viajandocomdesconto.com (canal oficial da Cativa para as agências): uma página com tudo em JSON, sem login. Conferência ao vivo no portal do agente (Infotravel) com o usuário do robô. Ficha: docs/fontes/cativa.md')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ofertas"."fonte_acesso" ("fonte_id", "estado", "mensagem") VALUES
  ('cativa', 'desligado', 'O revalidador ainda não rodou.')
ON CONFLICT ("fonte_id") DO NOTHING;

-- ---------------------------------------------------------------------------
-- Configuração (tudo se edita; nada disto mora no código).
-- ---------------------------------------------------------------------------
INSERT INTO "ofertas"."configuracao" ("chave", "valor", "descricao") VALUES
  ('cativa.intervalo_horas',              '3',   'De quantas em quantas horas o motor pergunta à página da Cativa (viajandocomdesconto) se ela mudou. Só baixa de novo quando muda.'),
  ('cativa.prazo_s',                      '60',  'Prazo (segundos) para a página da Cativa responder.'),
  ('cativa.pagina_parada_dias',           '3',   'Se a página da Cativa ficar mais que isto (dias) sem ser republicada, a Saúde avisa.'),
  ('revalidador.ligado',                  '1',   'Revalidador automático: 1 = ligado, 0 = desligado. Desligado, nada entra no portal da operadora (nem o botão "Conferir agora").'),
  ('revalidador.mais_baratas_por_destino','3',   'Quantas ofertas mais baratas de cada destino o robô confere sozinho no portal (até a nota da V2 existir).'),
  ('revalidador.reconferir_horas',        '6',   'Uma oferta conferida há menos que isto (horas) não é conferida de novo automaticamente.'),
  ('revalidador.pausa_s',                 '20',  'Folga (segundos) entre uma consulta e outra no portal da operadora.'),
  ('revalidador.teto_dia',                '200', 'Máximo de consultas por dia no portal da operadora (é o acesso que a agência usa para emitir).'),
  ('revalidador.hora_inicio',             '7',   'O robô só entra no portal a partir desta hora (de Brasília).'),
  ('revalidador.hora_fim',                '23',  'O robô não entra no portal a partir desta hora (de Brasília).'),
  ('revalidador.prazo_s',                 '120', 'Prazo (segundos) de uma conferência no portal, do começo ao fim. Estourou, o navegador fecha.'),
  ('revalidador.codigo_espera_s',         '300', 'Quanto tempo (segundos) o robô espera o código de verificação chegar no e-mail.')
ON CONFLICT ("chave") DO NOTHING;
