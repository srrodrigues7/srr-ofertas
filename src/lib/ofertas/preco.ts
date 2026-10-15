import { prisma } from "@/lib/prisma";
import { lerConfiguracao } from "@/lib/configuracao";

/**
 * A regra do preço — num lugar só, usada pela vitrine e, depois, pela nota
 * (V2) e pelo card (V4). Decisões do Saulo (docs/etapas/README.md):
 *
 * - CUSTO: em milhas = milhas ÷ 1000 × preço do milheiro do programa + taxas
 *   (pela tarifa Clube, se o programa usa Clube). Em reais = o preço achado.
 * - VENDA: fonte que soma margem (milhas; preço de mercado, como o do MD) =
 *   custo + margem do tipo, que é o MAIOR entre o percentual e o mínimo em
 *   reais. Operadora e consolidadora já trazem a RAV: o preço delas é a venda.
 * - PARCELAS: venda cobrada pelo link de pagamento = "N× sem juros" com a taxa
 *   embutida: total = venda × (1 + taxa da tabela para N). Quando a própria
 *   fonte oferece parcelas sem juros (operadora), valem as dela.
 *
 * Faltou um valor (milheiro, margem, taxa de parcela)? O preço não sai e a
 * tela diz o que falta. Nunca um número inventado (lição 5 da HUB 92).
 */

export type Valores = {
  programas: Map<string, { nome: string; precoMilheiro: number | null; usaClube: boolean }>;
  margens: Map<string, { percentual: number; minimo: number }>;
  parcelas: Map<number, number>;
  fontes: Map<string, { nome: string; aplicaMargem: boolean }>;
  parcelasDestaque: number;
};

export type OfertaParaPreco = {
  fonteId: string;
  tipo: string;
  classe: string;
  internacional: boolean;
  programaId: string | null;
  milhas: number | null;
  milhasNormal: number | null;
  taxasBrl: number | null;
  precoBrl: number | null;
  parcelasFonte: number | null;
};

export type Preco = {
  custo: number | null;
  /** Quantas milhas entraram no custo (Clube ou normal). */
  milhasDoCusto: number | null;
  tipoMargem: string | null;
  margem: number | null;
  venda: number | null;
  parcelas: { n: number; valor: number; total: number; daFonte: boolean } | null;
  /** O que impede de calcular, em português, para a tela. */
  faltas: string[];
};

export async function lerValores(): Promise<Valores> {
  const [programas, margens, parcelas, fontes, cfg] = await Promise.all([
    prisma.programa.findMany(),
    prisma.margem.findMany(),
    prisma.parcelaTaxa.findMany(),
    prisma.fonte.findMany(),
    lerConfiguracao(["parcelas.destaque"]),
  ]);
  return {
    programas: new Map(
      programas.map((p) => [p.id, { nome: p.nome, precoMilheiro: p.precoMilheiro?.toNumber() ?? null, usaClube: p.usaClube }]),
    ),
    margens: new Map(margens.map((m) => [m.tipo, { percentual: m.percentual.toNumber(), minimo: m.minimoBrl.toNumber() }])),
    parcelas: new Map(parcelas.map((p) => [p.parcelas, p.taxa.toNumber()])),
    fontes: new Map(fontes.map((f) => [f.id, { nome: f.nome, aplicaMargem: f.aplicaMargem }])),
    parcelasDestaque: cfg["parcelas.destaque"],
  };
}

/** Qual margem vale para a oferta. */
export function tipoDeMargem(o: Pick<OfertaParaPreco, "tipo" | "classe" | "internacional">): string {
  if (o.tipo === "pacote") return "pacote";
  if (o.classe === "executiva" || o.classe === "primeira") return "executiva";
  return o.internacional ? "internacional" : "nacional";
}

const centavos = (v: number) => Math.round(v * 100) / 100;

export function precificar(o: OfertaParaPreco, v: Valores): Preco {
  const faltas: string[] = [];
  let custo: number | null = null;
  let milhasDoCusto: number | null = null;

  if (o.milhas != null) {
    const prog = o.programaId ? v.programas.get(o.programaId) : undefined;
    if (!prog) {
      faltas.push(`programa de milhas "${o.programaId ?? "?"}" não cadastrado`);
    } else {
      milhasDoCusto = prog.usaClube ? o.milhas : o.milhasNormal;
      if (milhasDoCusto == null) faltas.push(`preço sem Clube ${prog.nome} (a Smiles só mostra o preço Clube no calendário)`);
      if (prog.precoMilheiro == null) faltas.push(`preço do milheiro ${prog.nome}`);
      if (o.taxasBrl == null) faltas.push("taxas");
      if (milhasDoCusto != null && prog.precoMilheiro != null && o.taxasBrl != null) {
        custo = centavos((milhasDoCusto / 1000) * prog.precoMilheiro + o.taxasBrl);
      }
    }
  } else if (o.precoBrl != null) {
    custo = o.precoBrl;
  } else {
    faltas.push("preço");
  }

  const fonte = v.fontes.get(o.fonteId);
  const aplicaMargem = fonte?.aplicaMargem ?? true;
  let tipoMargem: string | null = null;
  let margem: number | null = null;
  let venda: number | null = null;
  if (custo != null) {
    if (aplicaMargem) {
      tipoMargem = tipoDeMargem(o);
      const m = v.margens.get(tipoMargem);
      if (!m) {
        faltas.push(`margem "${tipoMargem}"`);
      } else {
        margem = centavos(Math.max((custo * m.percentual) / 100, m.minimo));
        venda = centavos(custo + margem);
      }
    } else {
      venda = custo;
    }
  }

  let parcelas: Preco["parcelas"] = null;
  if (venda != null) {
    if (!aplicaMargem && o.parcelasFonte) {
      parcelas = { n: o.parcelasFonte, valor: centavos(venda / o.parcelasFonte), total: venda, daFonte: true };
    } else {
      const n = v.parcelasDestaque;
      const taxa = v.parcelas.get(n);
      if (taxa == null) {
        faltas.push(`taxa de ${n} parcelas`);
      } else {
        const total = centavos(venda * (1 + taxa / 100));
        parcelas = { n, valor: centavos(total / n), total, daFonte: false };
      }
    }
  }

  return { custo, milhasDoCusto, tipoMargem, margem, venda, parcelas, faltas };
}
