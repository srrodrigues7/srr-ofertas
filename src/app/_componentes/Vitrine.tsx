import Link from "next/link";
import { lerFilasDaVitrine } from "@/pacote/leituras";
import { mensagemDe } from "@/pacote/erros";
import { nomeDaCompanhia } from "@/pacote/companhias";
import { lerVitrine, type Filtros, type GrupoVitrine, type ItemVitrine } from "@/pacote/vitrine";
import { buscarAgora, conferirAgora } from "../acoes";
import Atualizador from "./Atualizador";
import Cabecalho from "./Cabecalho";
import { ConferenciaDoAlerta, DatasDoAlerta, ReferenciaDoAlerta } from "./Alerta";
import { BAGAGEM, CLASSE, data, duracao, haQuanto, horaLocal, milhas, nomeDoMes, prazo, reais, reaisInteiro } from "@/pacote/formato";
import s from "../tela.module.css";

/**
 * A vitrine da equipe (tela grande), em duas abas: Passagens e Pacotes. Mostra
 * tudo, inclusive a fonte. Agrupa por rota + mês; abrindo o grupo, cada data
 * com o que se sabe. Ainda sem nota, aprovação ou card (V2, V4).
 */

type Tipo = Filtros["tipo"];
type Busca = Record<string, string | string[] | undefined>;

const REGIME: Record<string, string> = {
  all_inclusive: "all inclusive",
  pensao_completa: "pensão completa",
  meia_pensao: "meia pensão",
  cafe: "café da manhã",
  sem_refeicao: "sem refeição",
};

export default async function Vitrine({ tipo, sp }: { tipo: Tipo; sp: Busca }) {
  const um = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const filtros: Filtros = {
    tipo,
    destino: um("destino"),
    origem: um("origem"),
    fonte: um("fonte"),
    mes: um("mes"),
    classe: um("classe"),
    companhia: um("companhia"),
    regime: um("regime"),
    noites: um("noites"),
    ordem: (um("ordem") as Filtros["ordem"]) ?? "preco",
  };
  const passagem = tipo === "passagem";
  const aqui = passagem ? "/" : "/pacotes";

  let vitrine: Awaited<ReturnType<typeof lerVitrine>> | null = null;
  let falha: string | null = null;
  let pendentes = new Map<number, string>();
  let conferindo = new Map<string, string>();
  let revalidaveis = new Set<string>();
  try {
    vitrine = await lerVitrine(filtros);
    // A fila ao lado: "Buscar agora" e a conferência na fonte (V1b), e quais fontes têm revalidador.
    ({ pendentes, conferindo, revalidaveis } = await lerFilasDaVitrine());
  } catch (e) {
    falha = mensagemDe(e);
  }
  const agora = new Date().getTime();

  return (
    <div className={s.larga}>
      <Atualizador segundos={30} />
      <Cabecalho
        atual={aqui}
        subtitulo={passagem ? "Passagens encontradas — visão da equipe" : "Pacotes encontrados — visão da equipe"}
      />

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
            {passagem ? (
              <>
                <Seletor nome="classe" rotulo="Classe" valor={filtros.classe} opcoes={[["economica", "econômica"], ["executiva", "executiva"]]} />
                <Seletor
                  nome="companhia"
                  rotulo="Companhia"
                  valor={filtros.companhia}
                  opcoes={vitrine.opcoes.companhias.map((c) => [c, nomeDaCompanhia(c) ?? c])}
                />
              </>
            ) : (
              <>
                <Seletor nome="regime" rotulo="Regime" valor={filtros.regime} opcoes={vitrine.opcoes.regimes.map((r) => [r, REGIME[r] ?? r])} />
                <Seletor nome="noites" rotulo="Noites" valor={filtros.noites} opcoes={vitrine.opcoes.noites.map((n) => [String(n), `${n} noites`])} />
              </>
            )}
            <Seletor
              nome="ordem"
              rotulo="Ordem"
              valor={filtros.ordem}
              semTodos
              opcoes={[["preco", "menor preço"], ["mes", "mês de embarque"], ["destino", "destino (A–Z)"], ["recente", "vistas por último"]]}
            />
            <button className={s.botao} type="submit">Filtrar</button>
            <Link className={s.limpar} href={aqui}>limpar</Link>
          </form>

          <p className={s.contagem}>
            {vitrine.totalOfertas.toLocaleString("pt-BR")} ofertas em {vitrine.totalGrupos.toLocaleString("pt-BR")} rotas/meses
            {vitrine.totalGrupos > vitrine.grupos.length && ` — mostrando os ${vitrine.grupos.length} primeiros; use os filtros`}.
          </p>

          {vitrine.grupos.length === 0 ? (
            <p className={s.vazio}>
              {passagem
                ? "Nenhuma passagem ainda. Ligue o motor (npm run motor) ou use “Buscar agora” em Pedidos de busca."
                : "Nenhum pacote ainda. Ligue o motor (npm run motor) para buscar os pacotes das operadoras."}
            </p>
          ) : (
            <div className={s.grupos}>
              {vitrine.grupos.map((g) => (
                <Grupo key={g.chave} g={g} agora={agora} pendentes={pendentes} conf={{ conferindo, revalidaveis }} />
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

type Conf = { conferindo: Map<string, string>; revalidaveis: Set<string> };

function Grupo({ g, agora, pendentes, conf }: { g: GrupoVitrine; agora: number; pendentes: Map<number, string>; conf: Conf }) {
  const melhor = g.itens[0];
  // Oferta de alerta (V6) é uma por mês, com várias datas dentro.
  const datas = g.itens.reduce((n, i) => n + (i.alerta ? i.alerta.datasIda.length : i.detalhe !== "mes" ? 1 : 0), 0);
  const buscaId = g.buscaIds[0];
  const pendente = buscaId ? pendentes.get(buscaId) : undefined;
  const pacote = g.tipo === "pacote";
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
        <span className={s.classe}>{pacote ? "pacote" : (CLASSE[g.classe] ?? g.classe)}</span>
        <span className={s.preco}>
          <small>a partir de</small>
          <b>{reaisInteiro(g.aPartirDe)}</b>
          <small>{porPessoa(g.tipo, melhor?.composicao)}</small>
          {melhor?.preco.parcelas && (
            <small>
              {melhor.preco.parcelas.n}× de {reais(melhor.preco.parcelas.valor)} por pessoa, sem juros
            </small>
          )}
          {!g.aPartirDeVenda && g.aPartirDe != null && <small className={s.alerta}>custo (sem venda)</small>}
          {melhor?.taxasEstimadas && <small className={s.alerta}>com taxa estimada</small>}
          {melhor?.preco.maisTaxas && <small className={s.alerta}>+ taxas (a conferir)</small>}
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
            <th>{pacote ? "Hotel e aéreo" : "Voo"}</th>
            <th>Ver</th>
            <th>Custo</th>
            <th>Venda</th>
            <th>Parcelas</th>
            <th>Fonte</th>
            <th>Visto</th>
          </tr>
        </thead>
        <tbody>
          {g.itens.slice(0, 30).map((i) => (
            <Linha key={i.id} i={i} g={g} agora={agora} conf={conf} />
          ))}
        </tbody>
      </table>
      {g.itens.length > 30 && <p className={s.nota}>+ {g.itens.length - 30} outras datas mais caras.</p>}
    </details>
  );
}

/** A busca do Google Flights já preenchida, para a pessoa ver horários e
 *  conexões. Só um link: o sistema não lê nada de lá. */
function linkGoogleFlights(origem: string, destino: string, ida: Date, volta: Date | null): string {
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const q = volta
    ? `Flights from ${origem} to ${destino} on ${d(ida)} through ${d(volta)}`
    : `One way flights from ${origem} to ${destino} on ${d(ida)}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}&hl=pt-BR&curr=BRL`;
}

function Trecho(p: { rotulo: string; saida: Date | null; chegada: Date | null; paradas: number | null; dur: number | null; voos: string | null }) {
  if (!p.saida) return null;
  return (
    <div>
      {p.rotulo} {horaLocal(p.saida)}→{horaLocal(p.chegada)}
      {p.paradas != null && ` · ${p.paradas === 0 ? "direto" : `${p.paradas} parada${p.paradas > 1 ? "s" : ""}`}`}
      {p.dur != null && ` · ${duracao(p.dur)}`}
      <small> {p.voos}</small>
    </div>
  );
}

/** O que se sabe do voo — companhia, classe, bagagem, horários e conexões
 *  (quando a fonte dá), assentos e prazo de emissão (bloqueio de operadora). */
function Voo({ i }: { i: ItemVitrine }) {
  const companhia = i.companhiaNome ?? (i.companhias.map((c) => nomeDaCompanhia(c)).join(" / ") || null);
  return (
    <>
      <div>
        <b>{companhia ?? "companhia não informada"}</b> · {CLASSE[i.classe] ?? i.classe}
        {BAGAGEM[i.bagagem] ? ` · ${BAGAGEM[i.bagagem]}` : ""}
      </div>
      {i.detalhe === "voo" ? (
        <>
          <Trecho rotulo="ida" saida={i.idaSaida} chegada={i.idaChegada} paradas={i.idaParadas} dur={i.idaDuracaoMin} voos={i.idaVoos} />
          <Trecho rotulo="volta" saida={i.voltaSaida} chegada={i.voltaChegada} paradas={i.voltaParadas} dur={i.voltaDuracaoMin} voos={i.voltaVoos} />
        </>
      ) : (
        i.detalhe !== "mes" && <small className={s.cinza}>horários e conexões: nos botões ao lado</small>
      )}
      {i.assentos != null && <div className={i.assentos < 5 ? s.alerta : s.cinza}>{i.assentos} assento{i.assentos === 1 ? "" : "s"} restante{i.assentos === 1 ? "" : "s"}</div>}
      {i.emitirAte && <div className={s.alerta}>emitir até {prazo(i.emitirAte)}</div>}
    </>
  );
}

function Pacote({ i }: { i: ItemVitrine }) {
  return (
    <>
      <div>
        <b>{i.hotelNome ?? "hotel não informado"}</b>
        {i.hotelCategoria != null && ` · ${"★".repeat(Math.round(i.hotelCategoria))}`}
      </div>
      <div>
        {i.regime ? (REGIME[i.regime] ?? i.regime) : "regime não informado"} · {i.adultos} adulto{i.adultos > 1 ? "s" : ""}
        {i.criancas ? ` + ${i.criancas} criança${i.criancas > 1 ? "s" : ""}` : ""}
      </div>
      <small className={s.cinza}>
        aéreo {i.companhiaNome ?? (i.companhias.map((c) => nomeDaCompanhia(c)).join(", ") || "incluso (companhia não informada)")}
      </small>
      {i.etiquetas.includes("crianca_gratis") && <div className={s.venda}>criança grátis</div>}
    </>
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

function Linha({ i, g, agora, conf }: { i: ItemVitrine; g: GrupoVitrine; agora: number; conf: Conf }) {
  const p = i.preco;
  return (
    <tr>
      <td>
        {i.alerta ? (
          <DatasDoAlerta a={i.alerta} />
        ) : i.detalhe === "mes" ? (
          <span className={s.cinza}>menor do mês</span>
        ) : (
          <>
            <div>ida {data(i.ida)}</div>
            {i.volta && <div>volta {data(i.volta)}</div>}
            {i.noites != null && <small className={s.cinza}>{i.noites} noites</small>}
          </>
        )}
      </td>
      <td className={s.voos}>{g.tipo === "pacote" ? <Pacote i={i} /> : <Voo i={i} />}</td>
      <td>
        <div className={s.acoes}>
          {/* O pacote de fonte com portal tem o "Abrir na …" junto do "Conferir agora". */}
          {i.link && !abreNaFonte(i, conf) && (
            <a className={s.botaoSecundario} href={i.link} target="_blank" rel="noreferrer" title={`Abrir em ${i.fornecedor ?? i.fonteNome}`}>
              {i.fornecedor ?? i.fonteNome}
            </a>
          )}
          {g.tipo === "passagem" && i.ida && (
            <a className={s.botaoSecundario} href={linkGoogleFlights(g.origem, g.destino, i.ida, i.volta)} target="_blank" rel="noreferrer">
              Google Flights
            </a>
          )}
        </div>
      </td>
      <td>
        {i.milhas != null ? (
          <>
            {milhas(p.milhasDoCusto ?? i.milhas)} + {reais(i.taxasBrl)}
            {i.taxasEstimadas && <small className={s.alerta}> (taxa ESTIMADA — confirmar na emissão)</small>}
            {p.maisTaxas && <small className={s.alerta}> (taxa a conferir)</small>}
            {i.alerta && <ReferenciaDoAlerta a={i.alerta} />}
            <div>{p.custo != null ? reais(p.custo) : <small className={s.alerta}>falta {p.faltas.join(", ")}</small>}</div>
            {i.precoReferenciaBrl != null && <small className={s.cinza}>em dinheiro na cia: {reais(i.precoReferenciaBrl)}</small>}
          </>
        ) : (
          <>
            {reais(p.custo)}
            {i.taxasBrl != null && i.taxasBrl > 0 && <small className={s.cinza}> (com taxa de {reais(i.taxasBrl)})</small>}
          </>
        )}
      </td>
      <td className={s.venda}>
        {p.venda != null ? (
          <>
            {reais(p.venda)}
            {p.maisTaxas && " + taxas"}
            <div>
              <small className={s.cinza}>{porPessoa(g.tipo, i.composicao)}</small>
            </div>
          </>
        ) : (
          <small className={s.alerta}>{p.faltas.join(", ") || "—"}</small>
        )}
      </td>
      <td>
        {p.parcelas ? `${p.parcelas.n}× de ${reais(p.parcelas.valor)} por pessoa${p.parcelas.daFonte ? " (da fonte)" : ""}` : "—"}
        {p.parcelas && p.maisTaxas && " + taxas"}
      </td>
      <td>{i.fonteNome}</td>
      <td className={s.cinza}>
        {haQuanto(i.vistaEm, agora)}
        <Conferencia i={i} agora={agora} />
        {i.alerta && <ConferenciaDoAlerta i={i} naFila={conf.conferindo.get(i.id)} />}
        {conf.revalidaveis.has(i.fonteId) &&
          (conf.conferindo.has(i.id) ? (
            <span className={s.etiqueta}>{conf.conferindo.get(i.id) === "conferindo" ? "conferindo…" : "na fila…"}</span>
          ) : (
            <form action={conferirAgora.bind(null, i.id)}>
              <button className={s.botaoPequeno} type="submit">Conferir agora</button>
            </form>
          ))}
        {abreNaFonte(i, conf) && (
          <a className={s.botaoPequeno} href={i.link!} target="_blank" rel="noreferrer" title="O orçamento deste pacote no sistema da operadora">
            Abrir na {i.fonteNome}
          </a>
        )}
      </td>
    </tr>
  );
}

/** Pacote de fonte com portal (Cativa): o link é o orçamento dele lá. */
function abreNaFonte(i: ItemVitrine, conf: Conf): boolean {
  return i.tipo === "pacote" && !!i.link && conf.revalidaveis.has(i.fonteId);
}

/** Todo preço é guardado por pessoa; a tela diz isso, e do quê. */
function porPessoa(tipo: string, composicao: string | undefined): string {
  if (tipo === "pacote") return "por pessoa · quarto duplo";
  return composicao === "so_ida" ? "por pessoa · só ida" : "por pessoa · ida e volta";
}
