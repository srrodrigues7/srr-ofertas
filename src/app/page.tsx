import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { mensagemDe } from "@/lib/erros";
import { lerVitrine, type Filtros, type GrupoVitrine, type ItemVitrine } from "@/lib/ofertas/vitrine";
import { buscarAgora } from "./acoes";
import Atualizador from "./_componentes/Atualizador";
import Cabecalho from "./_componentes/Cabecalho";
import { BAGAGEM, CLASSE, data, duracao, haQuanto, horaLocal, milhas, nomeDoMes, reais, reaisInteiro } from "./_componentes/formato";
import s from "./tela.module.css";

/**
 * Ofertas — a vitrine da equipe (tela grande). Mostra tudo, inclusive a
 * fonte. Agrupa por rota + mês; abrindo o grupo, cada data com o que se sabe.
 * Ainda sem nota, aprovação ou card (V2, V4).
 */

export default async function OfertasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const sp = await searchParams;
  const um = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const filtros: Filtros = {
    destino: um("destino"),
    origem: um("origem"),
    fonte: um("fonte"),
    mes: um("mes"),
    classe: um("classe"),
    ordem: (um("ordem") as Filtros["ordem"]) ?? "preco",
  };

  let vitrine: Awaited<ReturnType<typeof lerVitrine>> | null = null;
  let falha: string | null = null;
  let pendentes = new Map<number, string>();
  try {
    vitrine = await lerVitrine(filtros);
    const fila = await prisma.buscaAgora.findMany({ where: { status: { in: ["na_fila", "buscando"] } } });
    pendentes = new Map(fila.map((p) => [p.buscaId, p.status]));
  } catch (e) {
    falha = mensagemDe(e);
  }
  const agora = new Date().getTime();

  return (
    <div className={s.larga}>
      <Atualizador segundos={30} />
      <Cabecalho atual="/" subtitulo="Ofertas encontradas — visão da equipe" />

      {falha && <p className={s.erro}>Não consegui ler o banco: {falha}</p>}

      {vitrine && vitrine.faltasGerais.length > 0 && (
        <p className={s.aviso}>
          Sem preço de venda em parte das ofertas. Falta: <b>{vitrine.faltasGerais.join("; ")}</b>. Preencha em{" "}
          <Link href="/valores">Valores</Link>.
        </p>
      )}

      {vitrine && (
        <>
          <form className={s.filtros} method="get">
            <Seletor nome="destino" rotulo="Destino" valor={filtros.destino} opcoes={vitrine.opcoes.destinos.map((d) => [d.codigo, d.nome])} />
            <Seletor nome="origem" rotulo="Origem" valor={filtros.origem} opcoes={vitrine.opcoes.origens.map((o) => [o, o])} />
            <Seletor nome="fonte" rotulo="Fonte" valor={filtros.fonte} opcoes={vitrine.opcoes.fontes.map((f) => [f.id, f.nome])} />
            <Seletor nome="mes" rotulo="Mês de embarque" valor={filtros.mes} opcoes={vitrine.opcoes.meses.map((m) => [m, nomeDoMes(m)])} />
            <Seletor nome="classe" rotulo="Classe" valor={filtros.classe} opcoes={[["economica", "econômica"], ["executiva", "executiva"]]} />
            <Seletor
              nome="ordem"
              rotulo="Ordem"
              valor={filtros.ordem}
              semTodos
              opcoes={[["preco", "menor preço"], ["mes", "mês de embarque"], ["destino", "destino (A–Z)"], ["recente", "vistas por último"]]}
            />
            <button className={s.botao} type="submit">Filtrar</button>
            <Link className={s.limpar} href="/">limpar</Link>
          </form>

          <p className={s.contagem}>
            {vitrine.totalOfertas.toLocaleString("pt-BR")} ofertas em {vitrine.totalGrupos.toLocaleString("pt-BR")} rotas/meses
            {vitrine.totalGrupos > vitrine.grupos.length && ` — mostrando os ${vitrine.grupos.length} primeiros; use os filtros`}.
          </p>

          {vitrine.grupos.length === 0 ? (
            <p className={s.vazio}>Nenhuma oferta ainda. Ligue o motor (npm run motor) ou use “Buscar agora” em Pedidos de busca.</p>
          ) : (
            <div className={s.grupos}>
              {vitrine.grupos.map((g) => (
                <Grupo key={g.chave} g={g} agora={agora} pendentes={pendentes} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Seletor(p: { nome: string; rotulo: string; valor?: string; opcoes: [string, string][]; semTodos?: boolean }) {
  return (
    <label className={s.campo}>
      <span>{p.rotulo}</span>
      <select name={p.nome} defaultValue={p.valor ?? ""}>
        {!p.semTodos && <option value="">todos</option>}
        {p.opcoes.map(([v, r]) => (
          <option key={v} value={v}>
            {r}
          </option>
        ))}
      </select>
    </label>
  );
}

function Grupo({ g, agora, pendentes }: { g: GrupoVitrine; agora: number; pendentes: Map<number, string> }) {
  const melhor = g.itens[0];
  const datas = g.itens.filter((i) => i.detalhe !== "mes").length;
  const buscaId = g.buscaIds[0];
  const pendente = buscaId ? pendentes.get(buscaId) : undefined;
  return (
    <details className={s.grupo}>
      <summary className={s.resumo}>
        <span className={s.rota}>
          <b>
            {g.origemCidade ?? g.origem} → {g.destinoCidade ?? g.destino}
          </b>
          <small>
            {g.origem}–{g.destino}
            {g.destinoPais && g.destinoPais !== "Brasil" ? ` · ${g.destinoPais}` : ""}
          </small>
        </span>
        <span className={s.mes}>{nomeDoMes(g.mes)}</span>
        <span className={s.classe}>{CLASSE[g.classe] ?? g.classe}</span>
        <span className={s.preco}>
          <small>a partir de</small>
          <b>{reaisInteiro(g.aPartirDe)}</b>
          {melhor?.preco.parcelas && (
            <small>
              {melhor.preco.parcelas.n}× {reais(melhor.preco.parcelas.valor)} sem juros
            </small>
          )}
          {!g.aPartirDeVenda && g.aPartirDe != null && <small className={s.alerta}>custo (sem venda)</small>}
        </span>
        <span className={s.datas}>{datas ? `${datas} data${datas > 1 ? "s" : ""}` : "só o mês"}</span>
        <span className={s.fontes}>{g.fontes.join(" · ")}</span>
        <span className={s.visto}>{haQuanto(g.vistaEm, agora)}</span>
        {buscaId ? (
          pendente ? (
            <span className={s.etiqueta}>{pendente === "buscando" ? "buscando…" : "na fila…"}</span>
          ) : (
            <form action={buscarAgora.bind(null, buscaId)}>
              <button className={s.botaoPequeno} type="submit">Buscar agora</button>
            </form>
          )
        ) : (
          <span />
        )}
      </summary>
      <table className={s.tabela}>
        <thead>
          <tr>
            <th>Datas</th>
            <th>Companhia</th>
            <th>Voos</th>
            <th>Bagagem</th>
            <th>Custo</th>
            <th>Venda</th>
            <th>Parcelas</th>
            <th>Fonte</th>
            <th>Visto</th>
          </tr>
        </thead>
        <tbody>
          {g.itens.slice(0, 30).map((i) => (
            <Linha key={i.id} i={i} agora={agora} />
          ))}
        </tbody>
      </table>
      {g.itens.length > 30 && <p className={s.nota}>+ {g.itens.length - 30} outras datas mais caras.</p>}
    </details>
  );
}

function Trecho({ saida, chegada, paradas, dur, voos }: { saida: Date | null; chegada: Date | null; paradas: number | null; dur: number | null; voos: string | null }) {
  if (!saida) return null;
  return (
    <div>
      {horaLocal(saida)}→{horaLocal(chegada)} · {paradas === 0 ? "direto" : `${paradas} parada${paradas! > 1 ? "s" : ""}`} · {duracao(dur)}
      <small> {voos}</small>
    </div>
  );
}

/** O selo da conferência na fonte (o revalidador da V1b/V4 grava). */
function Conferencia({ i, agora }: { i: ItemVitrine; agora: number }) {
  if (!i.conferenciaResultado) return <div>não conferida</div>;
  if (i.conferenciaResultado === "nao_deu") {
    return <div className={s.alerta}>não conferida{i.conferenciaMotivo ? ` — ${i.conferenciaMotivo}` : ""}</div>;
  }
  const quando = i.conferidaEm ? haQuanto(i.conferidaEm, agora) : "";
  if (i.conferenciaResultado === "mudou") {
    const v = i.conferenciaVariacao;
    return <div className={s.alerta}>preço mudou{v != null ? ` (${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR")}%)` : ""} {quando}</div>;
  }
  return <div className={s.venda}>✓ conferida {quando}</div>;
}

function Linha({ i, agora }: { i: ItemVitrine; agora: number }) {
  const p = i.preco;
  return (
    <tr>
      <td>
        {i.detalhe === "mes" ? (
          <span className={s.cinza}>menor do mês</span>
        ) : (
          <>
            {data(i.ida)}
            {i.volta && <> – {data(i.volta)}</>}
            {i.noites != null && <small> · {i.noites} noites</small>}
          </>
        )}
      </td>
      <td>{i.companhiaNome ?? (i.companhias.join(", ") || "—")}</td>
      <td className={s.voos}>
        {i.detalhe === "voo" ? (
          <>
            <Trecho saida={i.idaSaida} chegada={i.idaChegada} paradas={i.idaParadas} dur={i.idaDuracaoMin} voos={i.idaVoos} />
            <Trecho saida={i.voltaSaida} chegada={i.voltaChegada} paradas={i.voltaParadas} dur={i.voltaDuracaoMin} voos={i.voltaVoos} />
            {i.assentos != null && i.assentos < 9 && <small className={s.alerta}>{i.assentos} assentos</small>}
          </>
        ) : (
          <span className={s.cinza}>{i.fonteId === "smiles" ? "detalhe na fila do navegador" : "a fonte não informa"}</span>
        )}
      </td>
      <td>{BAGAGEM[i.bagagem] || "—"}</td>
      <td>
        {i.milhas != null ? (
          <>
            {milhas(p.milhasDoCusto ?? i.milhas)} + {reais(i.taxasBrl)}
            {i.taxasEstimadas && <small className={s.cinza}> (taxa estimada)</small>}
            <div>{p.custo != null ? reais(p.custo) : <small className={s.alerta}>falta {p.faltas.join(", ")}</small>}</div>
            {i.precoReferenciaBrl != null && <small className={s.cinza}>em dinheiro na cia: {reais(i.precoReferenciaBrl)}</small>}
          </>
        ) : (
          reais(p.custo)
        )}
      </td>
      <td className={s.venda}>{p.venda != null ? reais(p.venda) : <small className={s.alerta}>{p.faltas.join(", ") || "—"}</small>}</td>
      <td>{p.parcelas ? `${p.parcelas.n}× ${reais(p.parcelas.valor)}` : "—"}</td>
      <td>
        {i.link ? (
          <a href={i.link} target="_blank" rel="noreferrer">
            {i.fonteNome}
          </a>
        ) : (
          i.fonteNome
        )}
        {i.fornecedor && i.fornecedor !== i.fonteNome && <small className={s.cinza}> via {i.fornecedor}</small>}
      </td>
      <td className={s.cinza}>
        {haQuanto(i.vistaEm, agora)}
        {i.emitirAte && <div className={s.alerta}>emitir até {data(i.emitirAte)}</div>}
        <Conferencia i={i} agora={agora} />
      </td>
    </tr>
  );
}
