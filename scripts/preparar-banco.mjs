/**
 * Prepara a "sala" do SRR Ofertas num banco do Supabase.
 *
 *   npm run banco:preparar -- --alvo testes   --sql-em <arquivo.sql>
 *   npm run banco:preparar -- --alvo producao --sql-em <arquivo.sql>
 *
 * O que faz:
 *
 * 1. sorteia aqui uma senha nova para o papel `srr_ofertas` — a "chave que só
 *    abre a sala do radar" — e grava a conexão no arquivo certo: `.env`
 *    (testes) ou `.env.producao` (produção — vai para a Vercel e para o
 *    computador do motor);
 * 2. escreve o SQL que cria o papel e o schema `ofertas` (com o papel como
 *    dono) e limita o papel: procura tabelas só em `ofertas`, nenhuma consulta
 *    passa de 60 segundos (um erro nosso não pode pesar no banco do MilesPro).
 *
 * O SQL **não leva a senha**: leva só o verificador SCRAM dela — a "impressão
 * digital" que o próprio Postgres guarda. Com ele o banco confere a senha, mas
 * ninguém consegue entrar usando ele. Por isso o SQL pode ser rodado por quem
 * já tem acesso de administrador ao Supabase (o painel, ou a integração do
 * Supabase da sessão de construção) sem nenhuma senha passar por chat.
 *
 * Alternativa: com a senha principal do banco no .env (SENHA_BANCO_TESTES /
 * SENHA_BANCO_PRODUCAO), sem --sql-em, o script conecta e roda o SQL sozinho.
 *
 * Rodar de novo troca a senha do papel: o motor e a Vercel precisam receber a
 * conexão nova.
 */
import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const PAPEL = "srr_ofertas";
const SCHEMA = "ofertas";

// Os dois projetos do Supabase (não são segredo: aparecem no endereço do painel).
const PROJETOS = {
  testes: { ref: "zdkjtgxsajvojsaramdi", host: "aws-1-sa-east-1.pooler.supabase.com" },
  producao: { ref: "unhzbeevczoxgwyfxxnv", host: "aws-1-sa-east-1.pooler.supabase.com" },
};

try {
  process.loadEnvFile();
} catch {
  // sem .env: tudo bem no modo --sql-em
}

const args = process.argv.slice(2);
const alvo = args[args.indexOf("--alvo") + 1];
const arquivoSql = args.includes("--sql-em") ? args[args.indexOf("--sql-em") + 1] : null;
if (!args.includes("--alvo") || !PROJETOS[alvo]) pare("Diga qual banco: --alvo testes  ou  --alvo producao");

function pare(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

/** O verificador SCRAM-SHA-256 que o Postgres guarda no lugar da senha. */
function verificadorScram(senha) {
  const sal = randomBytes(16);
  const iteracoes = 4096;
  const salgada = pbkdf2Sync(senha, sal, iteracoes, 32, "sha256");
  const chaveCliente = createHmac("sha256", salgada).update("Client Key").digest();
  const chaveGuardada = createHash("sha256").update(chaveCliente).digest();
  const chaveServidor = createHmac("sha256", salgada).update("Server Key").digest();
  const b64 = (b) => b.toString("base64");
  return `SCRAM-SHA-256$${iteracoes}:${b64(sal)}$${b64(chaveGuardada)}:${b64(chaveServidor)}`;
}

function sqlDaSala(verificador) {
  return `-- SRR Ofertas: a sala do radar (papel ${PAPEL} + schema ${SCHEMA}).
-- Gerado por scripts/preparar-banco.mjs. Leva só o verificador SCRAM da senha.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${PAPEL}') THEN
    CREATE ROLE ${PAPEL} WITH LOGIN PASSWORD '${verificador}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 30;
  ELSE
    ALTER ROLE ${PAPEL} WITH LOGIN PASSWORD '${verificador}';
  END IF;
END $$;
-- O administrador vira membro do papel: precisa disso para entregar o schema
-- a ele, e assim continua lendo as tabelas do radar (é por ele que o VoePro
-- vai ler as ofertas).
GRANT ${PAPEL} TO current_user;
CREATE SCHEMA IF NOT EXISTS ${SCHEMA} AUTHORIZATION ${PAPEL};
ALTER SCHEMA ${SCHEMA} OWNER TO ${PAPEL};
REVOKE ALL ON SCHEMA ${SCHEMA} FROM PUBLIC;
ALTER ROLE ${PAPEL} SET search_path TO ${SCHEMA};
ALTER ROLE ${PAPEL} SET statement_timeout TO '60s';
ALTER ROLE ${PAPEL} SET idle_in_transaction_session_timeout TO '60s';
`;
}

/** Troca (ou acrescenta) linhas VARIAVEL="valor" num arquivo .env, sem mexer no resto. */
function gravar(arquivo, valores) {
  let texto = existsSync(arquivo) ? readFileSync(arquivo, "utf8") : "";
  if (!texto && arquivo === ".env.producao") {
    texto =
      "# Conexões do SRR Ofertas no banco de PRODUÇÃO (milespro-production).\n" +
      "# Geradas por scripts/preparar-banco.mjs. Nunca vão para o commit nem para o chat.\n";
  }
  for (const [nome, valor] of Object.entries(valores)) {
    const linha = `${nome}="${valor}"`;
    const re = new RegExp(`^${nome}=.*$`, "m");
    texto = re.test(texto) ? texto.replace(re, linha) : `${texto.replace(/\n?$/, "\n")}${linha}\n`;
  }
  writeFileSync(arquivo, texto);
}

// --- a senha nova e as conexões --------------------------------------------------

const { ref, host } = PROJETOS[alvo];
// base64url: só letras, números, - e _ — vai na URL sem precisar escapar nada.
const senha = randomBytes(32).toString("base64url");
const usuario = `${PAPEL}.${ref}`;
const sessao = `postgresql://${usuario}:${senha}@${host}:5432/postgres?schema=${SCHEMA}`;
const transacao = `postgresql://${usuario}:${senha}@${host}:6543/postgres?schema=${SCHEMA}&pgbouncer=true`;
const sql = sqlDaSala(verificadorScram(senha));

if (!arquivoSql) {
  // Modo com a senha principal: conecta e roda.
  const sufixo = alvo === "testes" ? "TESTES" : "PRODUCAO";
  const senhaPrincipal = process.env[`SENHA_BANCO_${sufixo}`];
  if (!senhaPrincipal) pare(`Falta SENHA_BANCO_${sufixo} no .env — ou use --sql-em <arquivo>.`);
  const cliente = new pg.Client({
    connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(senhaPrincipal)}@${host}:5432/postgres`,
  });
  try {
    await cliente.connect();
  } catch (e) {
    pare(`O banco recusou a senha principal (${e.message}). Confira SENHA_BANCO_${sufixo}.`);
  }
  try {
    await cliente.query(sql);
  } finally {
    await cliente.end();
  }
  console.log(`✔ Papel ${PAPEL} e schema ${SCHEMA} prontos no banco de ${alvo}.`);
} else {
  writeFileSync(arquivoSql, sql);
  console.log(`✔ SQL da sala gravado em ${arquivoSql} (sem senha: só o verificador).`);
  console.log("  Rode esse SQL no banco como administrador. Até rodar, a conexão abaixo não funciona.");
}

if (alvo === "testes") {
  gravar(".env", { DATABASE_URL: sessao });
  console.log("✔ Conexão do banco de TESTES gravada no .env (DATABASE_URL).");
} else {
  gravar(".env.producao", { DATABASE_URL: sessao, PGBOUNCER_URL: transacao });
  console.log("✔ Conexão do banco de PRODUÇÃO gravada em .env.producao.");
}
