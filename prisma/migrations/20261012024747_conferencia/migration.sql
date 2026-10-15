-- AlterTable
ALTER TABLE "ofertas"."oferta" ADD COLUMN     "conferencia_anterior" DECIMAL(14,2),
ADD COLUMN     "conferencia_motivo" TEXT,
ADD COLUMN     "conferencia_resultado" TEXT,
ADD COLUMN     "conferencia_valor" DECIMAL(14,2),
ADD COLUMN     "conferencia_variacao" DECIMAL(7,2),
ADD COLUMN     "conferida_em" TIMESTAMPTZ(6),
ADD COLUMN     "emitir_ate" TIMESTAMPTZ(6),
ADD COLUMN     "localizador" JSONB;
