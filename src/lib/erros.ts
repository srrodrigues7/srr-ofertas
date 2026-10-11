/**
 * Falta algo que só uma pessoa pode resolver: uma variável no .env, uma chave
 * na tabela de configuração.
 *
 * É um erro à parte porque a reação é outra. Banco fora do ar passa sozinho, e
 * o motor tenta de novo. Configuração faltando não passa sozinha: o motor para,
 * diz exatamente o que falta e não adivinha valor nenhum (lição 5 do Radar da
 * HUB 92, onde o grupo interno vinha "de fábrica" do código).
 */
export class ErroDeConfiguracao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDeConfiguracao";
  }
}

/** O código de saída que o motor usa quando para por falta de configuração.
 *  O vigia reconhece este número e espera, em vez de religar sem parar.
 *  (78 é o EX_CONFIG dos sistemas Unix: "erro de configuração".) */
export const SAIDA_CONFIGURACAO = 78;

/** Exige variáveis de ambiente. Junta todas as que faltam numa mensagem só,
 *  para quem for arrumar não descobrir uma de cada vez. */
export function exigirAmbiente(nomes: string[]): void {
  const faltam = nomes.filter((n) => !process.env[n]?.trim());
  if (faltam.length) {
    throw new ErroDeConfiguracao(
      `Falta no arquivo .env: ${faltam.join(", ")}. ` +
        "Veja o .env.example: cada variável está explicada lá.",
    );
  }
}

export function mensagemDe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
