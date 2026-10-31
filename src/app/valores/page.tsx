import { connection } from "next/server";
import { exigirAcessoNaTela } from "@/lib/acesso/acesso";
import { prisma } from "@/lib/prisma";
import {
  alternarAcesso,
  alternarFonte,
  liberarAcesso,
  tirarAcesso,
  apagarFaixa,
  salvarConfiguracao,
  salvarFaixa,
  salvarMargem,
  salvarParcela,
  salvarPrograma,
  salvarAlertaOrigem,
  salvarAlertaPrograma,
  tirarAlertaOrigem,
} from "../acoes";
import Cabecalho from "../_componentes/Cabecalho";
import s from "../tela.module.css";

/** Valores — tudo o que o Saulo muda sem programador: milheiro, margens,
 *  parcelas, horizonte, fontes e o ritmo da coleta. */

const MARGENS = [
  ["nacional", "Nacional"],
  ["internacional", "Internacional"],
  ["executiva", "Executiva"],
  ["pacote", "Pacote"],
] as const;

const fmt = (v: { toString(): string } | null | undefined) => (v == null ? "" : v.toString().replace(".", ","));

export default async function ValoresPage() {
  await connection();
  const eu = await exigirAcessoNaTela();
  const [programas, margens, parcelas, faixas, fontes, config, alertaOrigens, alertaProgramas] = await Promise.all([
    prisma.programa.findMany({ orderBy: { nome: "asc" } }),
    prisma.margem.findMany(),
    prisma.parcelaTaxa.findMany({ orderBy: { parcelas: "asc" } }),
    prisma.faixaBusca.findMany({ orderBy: { deMes: "asc" } }),
    prisma.fonte.findMany({ orderBy: { nome: "asc" } }),
    prisma.configuracao.findMany({ orderBy: { chave: "asc" } }),
    prisma.alertaOrigem.findMany({ orderBy: { codigo: "asc" } }),
    prisma.alertaPrograma.findMany({ orderBy: [{ vezes: "desc" }, { exemplo: "asc" }] }),
  ]);
  const acessos = await prisma.acesso.findMany({ orderBy: { email: "asc" } });
  const margem = new Map(margens.map((m) => [m.tipo, m]));
  const horizonte = faixas.length ? Math.max(...faixas.map((f) => f.ateMes)) + 1 : 0;
  const ajustaveis = config.filter((c) => !c.chave.startsWith("motor.") && !c.chave.startsWith("saude."));

  return (
    <div className={s.larga}>
      <Cabecalho atual="/valores" subtitulo="Valores — o que muda sem programador" />

      <section className={s.bloco}>
        <h2>Preço do milheiro</h2>
        <p className={s.explica}>
          Custo em milhas = milhas ÷ 1000 × milheiro + taxas. Vazio = sem custo na vitrine (o sistema não inventa).
          “Clube” usa a tarifa do clube do programa (Clube Smiles).
        </p>
        {programas.map((p) => (
          <form key={p.id} action={salvarPrograma} className={s.linhaForm}>
            <input type="hidden" name="id" value={p.id} />
            <b style={{ width: 150 }}>{p.nome}</b>
            <label className={s.campo}>
              <span>R$ por mil milhas</span>
              <input className={s.entrada} name="precoMilheiro" defaultValue={fmt(p.precoMilheiro)} inputMode="decimal" />
            </label>
            <label className={s.campo}>
              <span>Clube</span>
              <input type="checkbox" name="usaClube" defaultChecked={p.usaClube} />
            </label>
            <button className={s.botaoPequeno} type="submit">Salvar</button>
          </form>
        ))}
      </section>

      <section className={s.bloco}>
        <h2>Margem (milhas e preço de mercado)</h2>
        <p className={s.explica}>
          Vale o maior entre o percentual e o mínimo. Operadora e consolidadora não levam margem: o preço delas já é o de
          venda.
        </p>
        {MARGENS.map(([tipo, nome]) => (
          <form key={tipo} action={salvarMargem} className={s.linhaForm}>
            <input type="hidden" name="tipo" value={tipo} />
            <b style={{ width: 150 }}>{nome}</b>
            <label className={s.campo}>
              <span>%</span>
              <input className={s.entrada} name="percentual" defaultValue={fmt(margem.get(tipo)?.percentual)} inputMode="decimal" />
            </label>
            <label className={s.campo}>
              <span>mínimo R$</span>
              <input className={s.entrada} name="minimo" defaultValue={fmt(margem.get(tipo)?.minimoBrl)} inputMode="decimal" />
            </label>
            <button className={s.botaoPequeno} type="submit">Salvar</button>
          </form>
        ))}
      </section>

      <section className={s.bloco}>
        <h2>Parcelas no link de pagamento</h2>
        <p className={s.explica}>
          O cliente vê “N× sem juros”; a taxa vem embutida: total = venda × (1 + taxa). O número em destaque na vitrine é a
          chave <code>parcelas.destaque</code>, abaixo. Para tirar uma linha, apague a taxa e salve.
        </p>
        {[...parcelas.map((p) => ({ n: p.parcelas, taxa: fmt(p.taxa) })), { n: null, taxa: "" }].map((p) => (
          <form key={p.n ?? "nova"} action={salvarParcela} className={s.linhaForm}>
            <label className={s.campo}>
              <span>parcelas</span>
              <input className={s.entrada} name="parcelas" defaultValue={p.n ?? ""} readOnly={p.n != null} type="number" />
            </label>
            <label className={s.campo}>
              <span>taxa %</span>
              <input className={s.entrada} name="taxa" defaultValue={p.taxa} inputMode="decimal" />
            </label>
            <button className={s.botaoPequeno} type="submit">{p.n == null ? "Adicionar" : "Salvar"}</button>
          </form>
        ))}
      </section>

      <section className={s.bloco}>
        <h2>Horizonte e frequência ({horizonte} meses à frente)</h2>
        <p className={s.explica}>Meses a partir de hoje (0 = este mês). Os próximos, mais vezes; os distantes, menos.</p>
        {[...faixas, null].map((f) => (
          <div key={f?.id ?? "nova"} className={s.linhaForm}>
            <form action={salvarFaixa} className={s.linhaForm}>
              <input type="hidden" name="id" value={f?.id ?? ""} />
              <label className={s.campo}>
                <span>do mês</span>
                <input className={s.entrada} name="deMes" type="number" defaultValue={f?.deMes ?? ""} />
              </label>
              <label className={s.campo}>
                <span>até o mês</span>
                <input className={s.entrada} name="ateMes" type="number" defaultValue={f?.ateMes ?? ""} />
              </label>
              <label className={s.campo}>
                <span>a cada (horas)</span>
                <input className={s.entrada} name="intervaloHoras" type="number" defaultValue={f?.intervaloHoras ?? ""} />
              </label>
              <button className={s.botaoPequeno} type="submit">{f ? "Salvar" : "Adicionar"}</button>
            </form>
            {f && (
              <form action={apagarFaixa.bind(null, f.id)}>
                <button className={s.botaoSecundario} type="submit">Tirar</button>
              </form>
            )}
          </div>
        ))}
      </section>

      <section className={s.bloco}>
        <h2>Fontes</h2>
        {fontes.map((f) => (
          <div key={f.id} className={`${s.linhaForm} ${f.ligada ? "" : s.desligada}`}>
            <b style={{ width: 150 }}>{f.nome}</b>
            <span className={s.explica} style={{ flex: 1 }}>
              {f.ligada ? "ligada" : "desligada"} · degrau {f.degrau} · {f.aplicaMargem ? "soma margem" : "preço já é o de venda"}
              {f.observacao ? ` — ${f.observacao}` : ""}
            </span>
            <form action={alternarFonte.bind(null, f.id, !f.ligada)}>
              <button className={s.botaoSecundario} type="submit">{f.ligada ? "Desligar" : "Ligar"}</button>
            </form>
          </div>
        ))}
      </section>

      <section className={s.bloco}>
        <h2>Alertas do WhatsApp</h2>
        <p className={s.explica}>
          Os alertas do grupo &quot;Alerta Passagens CPM&quot; viram oferta só se saem de uma destas origens e usam um
          programa ligado a um programa nosso. O preço é sempre o nosso (milheiro + margem). Mudou aqui, os alertas
          recentes são lidos de novo na hora.
        </p>
        <h3>Origens</h3>
        {alertaOrigens.map((o) => (
          <div key={o.codigo} className={s.linhaForm}>
            <b style={{ width: 150 }}>{o.codigo}</b>
            <span className={s.explica} style={{ flex: 1 }}>
              {o.soInternacional ? "só quando o destino é internacional" : "qualquer destino"}
            </span>
            <form action={tirarAlertaOrigem.bind(null, o.codigo)}>
              <button className={s.botaoSecundario} type="submit">Tirar</button>
            </form>
          </div>
        ))}
        <form action={salvarAlertaOrigem} className={s.linhaForm}>
          <label className={s.campo}>
            <span>origem (código)</span>
            <input className={s.entrada} name="codigo" maxLength={3} placeholder="VCP" />
          </label>
          <label className={s.campo}>
            <span>só internacional</span>
            <input type="checkbox" name="soInternacional" defaultChecked />
          </label>
          <button className={s.botaoPequeno} type="submit">Adicionar</button>
        </form>
        <h3>Programas (como aparecem nos alertas)</h3>
        {alertaProgramas.map((p) => (
          <form key={p.nome} action={salvarAlertaPrograma.bind(null, p.nome)} className={`${s.linhaForm} ${p.programaId ? "" : s.desligada}`}>
            <b style={{ width: 230 }}>{p.exemplo}</b>
            <label className={s.campo}>
              <span>vira oferta como</span>
              <select className={s.entrada} name="programa" defaultValue={p.programaId ?? ""}>
                <option value="">— fora da vitrine —</option>
                {programas.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </select>
            </label>
            <span className={s.explica} style={{ flex: 1 }}>
              {p.vezes ? `apareceu em ${p.vezes} alerta${p.vezes === 1 ? "" : "s"}` : "ainda não apareceu"}
            </span>
            <button className={s.botaoPequeno} type="submit">Salvar</button>
          </form>
        ))}
      </section>

      <section className={s.bloco}>
        <h2>Ritmo e ajustes</h2>
        {ajustaveis.map((c) => (
          <form key={c.chave} action={salvarConfiguracao} className={s.linhaForm}>
            <input type="hidden" name="chave" value={c.chave} />
            <label className={s.campo}>
              <span>{c.chave}</span>
              <input className={s.entrada} name="valor" defaultValue={String(c.valor)} type="number" />
            </label>
            <span className={s.explica} style={{ flex: 1 }}>{c.descricao}</span>
            <button className={s.botaoPequeno} type="submit">Salvar</button>
          </form>
        ))}
      </section>
      <section className={s.bloco}>
        <h2>Quem entra no Radar</h2>
        <p className={s.explica}>
          A conta é a do MilesPro (mesmo e-mail, mesma senha). Aqui você diz quais contas o Radar aceita: quem não
          está na lista, ou está desligado, não entra. Você não consegue desligar a sua própria conta.
        </p>
        {acessos.map((a) => (
          <div key={a.email} className={a.ativo ? s.linhaForm : `${s.linhaForm} ${s.desligada}`}>
            <b style={{ width: 300 }}>
              {a.email}
              {a.email === eu.email ? <small> (você)</small> : null}
            </b>
            <span className={s.explica} style={{ flex: 1 }}>
              {a.ativo ? "pode entrar" : "desligado"}
              {a.liberadoPor ? ` · liberado por ${a.liberadoPor}` : ""}
            </span>
            {a.email === eu.email ? null : (
              <span className={s.acoes}>
                <form action={alternarAcesso.bind(null, a.email, !a.ativo)}>
                  <button className={s.botaoSecundario} type="submit">
                    {a.ativo ? "Desligar" : "Religar"}
                  </button>
                </form>
                <form action={tirarAcesso.bind(null, a.email)}>
                  <button className={s.botaoSecundario} type="submit">
                    Tirar
                  </button>
                </form>
              </span>
            )}
          </div>
        ))}
        <form action={liberarAcesso} className={s.linhaForm}>
          <label className={s.campo}>
            <span>E-mail da conta do MilesPro</span>
            <input className={s.entrada} style={{ width: 300 }} name="email" type="email" required placeholder="nome@srrviagens.com.br" />
          </label>
          <button className={s.botaoPequeno} type="submit">Liberar</button>
        </form>
      </section>
    </div>
  );
}
