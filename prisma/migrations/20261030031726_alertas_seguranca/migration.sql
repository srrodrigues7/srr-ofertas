-- V6 — como em todas as tabelas do schema: segurança por linha ligada, sem
-- nenhuma regra. Se um dia o schema for exposto por engano, ninguém de fora lê
-- nada. O dono (srr_ofertas) não é afetado. (Faltou na migração anterior.)
ALTER TABLE "ofertas"."alerta_mensagem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."alerta_ponte" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."alerta_origem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas"."alerta_programa" ENABLE ROW LEVEL SECURITY;
