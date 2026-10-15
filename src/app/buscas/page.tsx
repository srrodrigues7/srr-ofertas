import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { lerConfiguracao } from "@/lib/configuracao";
import { alternarBusca, apagarBusca, buscarAgora, salvarBusca } from "../acoes";
import Atualizador from "../_componentes/Atualizador";
import Cabecalho from "../_componentes/Cabecalho";
import { CLASSE, haQuanto } from "../_componentes/formato";
import s from "../tela.module.css";

/**
 * Pedidos de busca — o que o motor busca. Hoje são os destinos principais da
 * agência; a mesma tabela recebe, no futuro, o pedido de um cliente.
 */
export default async function BuscasPage() {
  await connection();
  const [buscas, lugares, contagens, ultimosAgora, cfg] = await Promise.all([
    prisma.busca.findMany({ orderBy: [{ classe: "asc" }, { origem: "asc" }, { destino: "asc" }] }),
    prisma.lugar.findMany({ select: { codigo: true, cidade: true, pais: true } }),
    prisma.oferta.groupBy({ by: ["buscaId"], where: { ativa: true, buscaId: { not: null } }, _count: true }),
    prisma.buscaAgora.findMany({ orderBy: { pedidoEm: "desc" }, take: 200 }),
    lerConfiguracao(["busca.estadia_min_padrao", "busca.estadia_max_padrao"]),
  ]);
  const lugar = new Map(lugares.map((l) => [l.codigo, l]));
  const ofertas = new Map(contagens.map((c) => [c.buscaId, c._count]));
  const agoraDe = new Map<number, (typeof ultimosAgora)[number]>();
  for (const a of ultimosAgora) if (!agoraDe.has(a.buscaId)) agoraDe.set(a.buscaId, a);
  const agora = new Date().getTime();

  return (
    <div className={s.larga}>
      <Atualizador segundos={10} />
      <Cabecalho atual="/buscas" subtitulo="Pedidos de busca — o que o motor procura" />

      <section className={s.bloco}>
        <h2>Novo pedido</h2>
        <p className={s.explica}>
          Nacional sai de Brasília (BSB); internacional pode sair de São Paulo (GRU) ou do Rio (GIG). Códigos de 3 letras
          dos aeroportos. Se o destino for novo, escreva também o nome da cidade.
        </p>
        <form action={salvarBusca} className={s.linhaForm}>
          <label className={s.campo}>
            <span>Origem</span>
            <input className={s.entrada} name="origem" defaultValue="BSB" maxLength={3} required />
          </label>
          <label className={s.campo}>
            <span>Destino</span>
            <input className={s.entrada} name="destino" placeholder="SSA" maxLength={3} required list="lugares" />
          </label>
          <datalist id="lugares">
            {lugares.map((l) => (
              <option key={l.codigo} value={l.codigo}>
                {l.cidade}
              </option>
            ))}
          </datalist>
          <label className={s.campo}>
            <span>Cidade (se nova)</span>
            <input className={s.entrada} name="cidade" />
          </label>
          <label className={s.campo}>
            <span>Estadia mín. (dias)</span>
            <input className={s.entrada} name="estadiaMin" type="number" defaultValue={cfg["busca.estadia_min_padrao"]} min={1} />
          </label>
          <label className={s.campo}>
            <span>Estadia máx. (dias)</span>
            <input className={s.entrada} name="estadiaMax" type="number" defaultValue={cfg["busca.estadia_max_padrao"]} min={1} />
          </label>
          <label className={s.campo}>
            <span>Classe</span>
            <select name="classe" defaultValue="economica">
              <option value="economica">econômica</option>
              <option value="executiva">executiva</option>
            </select>
          </label>
          <label className={s.campo}>
            <span>Só ida</span>
            <input type="checkbox" name="soIda" />
          </label>
          <button className={s.botao} type="submit">Adicionar</button>
        </form>
      </section>

      <section className={s.bloco}>
        <h2>Pedidos da agência ({buscas.length})</h2>
        <table className={s.tabela}>
          <thead>
            <tr>
              <th>Rota</th>
              <th>Classe</th>
              <th>Estadia</th>
              <th>Ofertas na vitrine</th>
              <th>Último “Buscar agora”</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {buscas.map((b) => {
              const l = lugar.get(b.destino);
              const a = agoraDe.get(b.id);
              const pendente = a && (a.status === "na_fila" || a.status === "buscando");
              return (
                <tr key={b.id} className={b.ligada ? undefined : s.desligada}>
                  <td>
                    <b>
                      {lugar.get(b.origem)?.cidade ?? b.origem} → {l?.cidade ?? b.destino}
                    </b>{" "}
                    <small className={s.cinza}>
                      {b.origem}–{b.destino}
                      {l?.pais && l.pais !== "Brasil" ? ` · ${l.pais}` : ""}
                    </small>
                  </td>
                  <td>{CLASSE[b.classe] ?? b.classe}</td>
                  <td>{b.idaVolta ? `${b.estadiaMin}–${b.estadiaMax} dias` : "só ida"}</td>
                  <td>{ofertas.get(b.id) ?? 0}</td>
                  <td className={s.cinza}>
                    {a
                      ? `${a.status === "na_fila" ? "na fila" : a.status === "buscando" ? "buscando…" : a.status === "erro" ? "com erro" : "feito"} ${haQuanto(a.pedidoEm, agora)}${a.resumo ? ` — ${a.resumo}` : ""}`
                      : "—"}
                  </td>
                  <td>
                    <div className={s.acoes}>
                      {b.ligada && !pendente && (
                        <form action={buscarAgora.bind(null, b.id)}>
                          <button className={s.botaoPequeno} type="submit">Buscar agora</button>
                        </form>
                      )}
                      <form action={alternarBusca.bind(null, b.id, !b.ligada)}>
                        <button className={s.botaoSecundario} type="submit">{b.ligada ? "Desligar" : "Ligar"}</button>
                      </form>
                      <form action={apagarBusca.bind(null, b.id)}>
                        <button className={s.botaoSecundario} type="submit">Tirar</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
