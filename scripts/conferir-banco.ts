/**
 * Confere, no banco, que o SRR Ofertas está na sala dele e só nela.
 *
 *   npm run banco:conferir                      (usa o DATABASE_URL do .env)
 *   npm run banco:conferir -- --env .env.producao
 *
 * Responde, conectado com a própria chave do radar (srr_ofertas):
 * - quais tabelas existem em `ofertas` e quais migrações foram aplicadas;
 * - se alguma tabela do radar foi parar fora de `ofertas` (não pode);
 * - se a chave consegue ler ou escrever qualquer tabela fora de `ofertas`
 *   (não pode — é isso que protege o MilesPro e o VoePro);
 * - a configuração atual.
 *
 * Sai com erro se alguma conferência falhar.
 */
import pg from "pg";

const args = process.argv.slice(2);
const arquivo = args.includes("--env") ? args[args.indexOf("--env") + 1] : ".env";
try {
  process.loadEnvFile(arquivo);
} catch {
  console.error(`Não achei ${arquivo}.`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error(`Falta DATABASE_URL em ${arquivo}.`);
  process.exit(1);
}

const TABELAS_DO_RADAR = ["motor_trava", "motor_instancia", "passada", "motor_evento", "configuracao"];

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
let falhou = false;
const ok = (m: string) => console.log(`  ✔ ${m}`);
const ruim = (m: string) => {
  falhou = true;
  console.log(`  ✖ ${m}`);
};

try {
  const { rows: quem } = await c.query("SELECT current_user AS u, current_database() AS d");
  console.log(`\nConectado como ${quem[0].u}.\n`);
  if (quem[0].u !== "srr_ofertas") ruim("a conexão deveria usar a chave srr_ofertas");

  console.log("Tabelas em ofertas:");
  const { rows: tabelas } = await c.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'ofertas' ORDER BY 1",
  );
  for (const t of tabelas) console.log(`  · ${t.tablename}`);
  for (const t of TABELAS_DO_RADAR) {
    if (!tabelas.some((r) => r.tablename === t)) ruim(`falta a tabela ofertas.${t}`);
  }

  const { rows: fora } = await c.query(
    `SELECT schemaname, tablename FROM pg_tables
      WHERE schemaname <> 'ofertas' AND tablename = ANY($1::text[])`,
    [TABELAS_DO_RADAR],
  );
  console.log("\nTabelas do radar fora de ofertas:");
  if (fora.length) for (const f of fora) ruim(`${f.schemaname}.${f.tablename}`);
  else ok("nenhuma");

  console.log("\nO que a chave srr_ofertas alcança fora de ofertas:");
  const { rows: alcance } = await c.query(`
    SELECT n.nspname AS schema,
           count(*) FILTER (WHERE has_table_privilege(current_user, cl.oid, 'SELECT'))::int AS le,
           count(*) FILTER (WHERE has_table_privilege(current_user, cl.oid, 'INSERT,UPDATE,DELETE,TRUNCATE'))::int AS escreve
      FROM pg_class cl
      JOIN pg_namespace n ON n.oid = cl.relnamespace
     WHERE cl.relkind IN ('r', 'p', 'v', 'm', 'f')
       AND n.nspname NOT IN ('ofertas', 'pg_catalog', 'information_schema')
       AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
     GROUP BY 1
    HAVING count(*) FILTER (WHERE has_table_privilege(current_user, cl.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')) > 0
     ORDER BY 1`);
  if (!alcance.length) ok("nenhuma tabela, de nenhum schema");
  for (const a of alcance) {
    if (a.escreve > 0) ruim(`${a.schema}: escreve em ${a.escreve} tabela(s)`);
    else if (a.schema === "public" || a.schema === "crm") ruim(`${a.schema}: lê ${a.le} tabela(s)`);
    else console.log(`  · ${a.schema}: lê ${a.le} (tabela pública do próprio Supabase, só leitura)`);
  }

  const { rows: criar } = await c.query(`
    SELECT nspname AS schema FROM pg_namespace
     WHERE nspname NOT IN ('ofertas', 'pg_catalog', 'information_schema')
       AND nspname NOT LIKE 'pg_toast%' AND nspname NOT LIKE 'pg_temp%'
       AND has_schema_privilege(current_user, oid, 'CREATE')`);
  if (criar.length) ruim(`pode criar objetos em: ${criar.map((r) => r.schema).join(", ")}`);
  else ok("não pode criar nada em outro schema");

  console.log("\nMigrações aplicadas:");
  const { rows: mig } = await c.query(
    `SELECT migration_name, finished_at, rolled_back_at FROM "ofertas"."_prisma_migrations" ORDER BY started_at`,
  );
  for (const m of mig) {
    const situacao = m.rolled_back_at ? "  (tentativa desfeita)" : m.finished_at ? "" : "  (NÃO TERMINOU)";
    if (!m.rolled_back_at && !m.finished_at) falhou = true;
    console.log(`  · ${m.migration_name}${situacao}`);
  }

  console.log("\nConfiguração:");
  const { rows: cfg } = await c.query(`SELECT chave, valor FROM "ofertas"."configuracao" ORDER BY 1`);
  for (const r of cfg) console.log(`  · ${r.chave} = ${JSON.stringify(r.valor)}`);
} finally {
  await c.end();
}

console.log(falhou ? "\n✖ Alguma conferência falhou.\n" : "\n✔ Tudo conferido.\n");
process.exit(falhou ? 1 : 0);
