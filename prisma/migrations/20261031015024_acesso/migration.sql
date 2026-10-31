-- L0 — quem pode entrar no painel.
--
-- A conta é a do MilesPro (o Auth do Supabase, no projeto de produção): mesmo
-- e-mail e mesma senha. Esta tabela diz quais dessas contas o Radar aceita.
-- Conta que não está aqui (ou está desligada) não entra, mesmo com a senha
-- certa. Lista vazia = ninguém entra (falha fechada).
--
-- Quando o Radar virar um item do menu do VoePro (etapa L), a permissão passa
-- a ser a do VoePro e esta tabela se aposenta.
CREATE TABLE "ofertas"."acesso" (
    "email" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "liberado_por" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acesso_pkey" PRIMARY KEY ("email")
);

-- Como em todas as tabelas do schema: segurança por linha ligada, sem regra.
ALTER TABLE "ofertas"."acesso" ENABLE ROW LEVEL SECURITY;

-- O primeiro da lista, para alguém conseguir entrar e liberar os outros.
INSERT INTO "ofertas"."acesso" ("email", "liberado_por") VALUES ('saulo.rodrigues@gmail.com', 'etapa L0');
