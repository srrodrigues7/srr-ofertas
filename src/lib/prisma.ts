import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/ofertas/client";
import { usarBanco } from "@/pacote/banco";
import { ErroDeConfiguracao } from "@/pacote/erros";

// Prisma 7 não embute mais o engine: a conexão passa por um adapter.
//
// Na Vercel usamos a conexão de transação (PGBOUNCER_URL, porta 6543): cada
// requisição pega uma conexão emprestada e devolve. O motor, que fica de pé o
// tempo todo, usa a de sessão (DATABASE_URL, porta 5432). As duas entram com o
// papel `srr_ofertas`, que só enxerga o schema `ofertas`.

function criarCliente() {
  const connectionString = process.env.PGBOUNCER_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new ErroDeConfiguracao(
      "Falta DATABASE_URL no .env. Copie .env.example para .env e preencha com a conexão do Supabase.",
    );
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

// O hot reload do Next recria módulos a cada edição; sem o cache global
// abriríamos uma pool nova por recarga até estourar o limite de conexões.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function cliente(): PrismaClient {
  globalForPrisma.prisma ??= criarCliente();
  return globalForPrisma.prisma;
}

// O pacote do Radar (src/pacote/) usa este mesmo cliente. Ele vai também para o
// VoePro, que entrega o cliente de lá (etapa L): por isso o pacote recebe o
// cliente em vez de importar este arquivo.
usarBanco(cliente);

/**
 * O cliente só nasce na primeira consulta, não quando o arquivo é importado.
 * Assim o build do painel não precisa de banco, e a falta do DATABASE_URL vira
 * uma mensagem clara na hora de usar (a tela de Saúde mostra em vermelho) em
 * vez de derrubar o processo inteiro.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_alvo, chave) {
    const c = cliente();
    const valor = Reflect.get(c, chave);
    return typeof valor === "function" ? valor.bind(c) : valor;
  },
});
