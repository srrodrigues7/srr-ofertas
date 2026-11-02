import type { ItemVitrine } from "@/pacote/vitrine";
import { conferirAgora, conferirAlerta } from "../acoes";
import { milhas, reais } from "@/pacote/formato";
import s from "../tela.module.css";

/**
 * As ofertas de alerta do WhatsApp na vitrine (V6). Visão da EQUIPE: as datas
 * do alerta (o cliente escolhe entre elas), o preço que o grupo anuncia como
 * referência e a conferência. Nada daqui vai para a arte nem para a legenda
 * (V4): o preço do cliente é sempre o da SRR.
 */

type Alerta = NonNullable<ItemVitrine["alerta"]>;

/** ["2026-11-13", "2026-11-20", "2026-12-03"] → "13, 20/11 · 3/12". */
function datasCurtas(datas: string[]): string {
  const porMes = new Map<string, number[]>();
  for (const d of datas) {
    const chave = d.slice(0, 7);
    if (!porMes.has(chave)) porMes.set(chave, []);
    porMes.get(chave)!.push(Number(d.slice(8, 10)));
  }
  return [...porMes.entries()].map(([m, dias]) => `${dias.join(", ")}/${m.slice(5, 7)}`).join(" · ");
}

/** A primeira coluna: as datas do alerta, em vez de um par de datas. */
export function DatasDoAlerta({ a }: { a: Alerta }) {
  const n = a.datasIda.length;
  return (
    <>
      <div>
        {n} data{n > 1 ? "s" : ""} de ida: {datasCurtas(a.datasIda)}
      </div>
      {a.datasVolta.length > 0 && (
        <div>
          volta{a.datasVolta.length > 1 ? "s" : ""}: {datasCurtas(a.datasVolta)}
        </div>
      )}
      <small className={s.cinza}>o cliente escolhe a combinação</small>
    </>
  );
}

/** A referência do grupo, só para a equipe comparar. */
export function ReferenciaDoAlerta({ a }: { a: Alerta }) {
  return (
    <>
      {a.taxaOutraMoeda && <small className={s.alerta}> taxa no alerta: {a.taxaOutraMoeda}</small>}
      {a.cpmBrl != null && (
        <div>
          <small className={s.cinza}>o grupo CPM vende a {reais(a.cpmBrl)} + taxas (referência)</small>
        </div>
      )}
    </>
  );
}

/**
 * Os botões da conferência: "Conferir agora" (o robô, no calendário da
 * Smiles — só Smiles econômica) e "Conferi" (a equipe conferiu no site do
 * programa; fica o nome e a hora). Sem a taxa, não há selo.
 */
export function ConferenciaDoAlerta({ i, naFila }: { i: ItemVitrine; naFila: string | undefined }) {
  const robo = i.programaId === "smiles" && i.classe === "economica";
  const sugestao = i.alerta?.valorConferido ?? i.milhas;
  return (
    <>
      {robo &&
        (naFila ? (
          <span className={s.etiqueta}>{naFila === "conferindo" ? "conferindo…" : "na fila…"}</span>
        ) : (
          <form action={conferirAgora.bind(null, i.id)}>
            <button className={s.botaoPequeno} type="submit" title="O robô confere as datas e as milhas no calendário da Smiles">
              Conferir agora
            </button>
          </form>
        ))}
      <details>
        <summary className={s.botaoSecundario}>Conferi</summary>
        <form action={conferirAlerta.bind(null, i.id)} className={s.campo}>
          <label className={s.campo}>
            Quem conferiu
            <input name="quem" required maxLength={60} style={{ width: 150 }} />
          </label>
          <label className={s.campo}>
            Milhas (ida + volta, por pessoa)
            <input name="milhas" inputMode="numeric" style={{ width: 150 }} defaultValue={sugestao != null ? milhas(sugestao).replace(/[^\d.]/g, "") : ""} />
          </label>
          <label className={s.campo}>
            Taxa total em R$ (ida + volta, por pessoa)
            <input name="taxas" inputMode="decimal" style={{ width: 150 }} placeholder="obrigatória para confirmar" defaultValue={i.taxasBrl != null ? String(i.taxasBrl).replace(".", ",") : ""} />
          </label>
          <button className={s.botaoPequeno} type="submit" name="acao" value="ok">
            Conferi: está valendo
          </button>
          <button className={s.botaoSecundario} type="submit" name="acao" value="esgotou">
            Esgotou
          </button>
        </form>
      </details>
    </>
  );
}
