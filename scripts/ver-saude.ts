/**
 * A tela de Saúde, no terminal. Usado pelo "Conferir motor" do computador
 * dedicado e por quem quiser olhar sem abrir o navegador.
 *
 *   npm run saude
 */
import { ErroDeConfiguracao, exigirAmbiente, mensagemDe } from "@/lib/erros";

try {
  process.loadEnvFile();
} catch {
  // no computador dedicado as variáveis vêm do ambiente
}

const fmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

try {
  exigirAmbiente(["DATABASE_URL"]);
  const { lerSaude, duracao } = await import("@/lib/motor/saude");
  const { prisma } = await import("@/lib/prisma");
  const s = await lerSaude();
  const sinal = { verde: "🟢", amarelo: "🟡", vermelho: "🔴" }[s.cor];

  console.log(`\n${sinal}  ${s.titulo.toUpperCase()}`);
  console.log(`   ${s.motivo}\n`);
  if (s.batimento) {
    console.log(`   Bateu há ${duracao(s.batimento.segundos)} — ${s.batimento.maquina}, versão ${s.batimento.versao}`);
  }
  if (s.ultimaPassada) {
    const p = s.ultimaPassada;
    console.log(`   Última passada: nº ${p.numero} em ${fmt.format(p.comecouEm)} (${p.status})`);
    if (p.erro) console.log(`   Erro: ${p.erro}`);
  }
  console.log(`   Passadas hoje: ${s.passadasHoje} (${s.errosHoje} com erro)`);
  if (s.instancias.length) {
    console.log("\n   Motores ligados:");
    for (const i of s.instancias) {
      console.log(`   · ${i.maquina} — ${i.estado} — versão ${i.versao} — visto há ${duracao(i.segundos)}`);
    }
  }
  if (s.eventos.length) {
    console.log("\n   Últimos acontecimentos:");
    for (const e of s.eventos.slice(0, 5)) {
      console.log(`   · ${fmt.format(e.em)} ${e.tipo} (${e.maquina}): ${e.mensagem}`);
    }
  }
  console.log("");
  await prisma.$disconnect();
  process.exit(s.cor === "verde" ? 0 : 2);
} catch (e) {
  const tipo = e instanceof ErroDeConfiguracao ? "Configuração" : "Banco";
  console.log(`\n🔴  ${tipo}: ${mensagemDe(e)}\n`);
  process.exit(1);
}
