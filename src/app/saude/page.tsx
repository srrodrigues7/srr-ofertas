import { connection } from "next/server";
import { duracao, lerSaude, type Saude } from "@/lib/motor/saude";
import { mensagemDe } from "@/lib/erros";
import { lerSaudeDasOperadoras, type SaudeOperadora } from "@/lib/revalidador/saude";
import { lerSaudeDosAlertas, type SaudeDosAlertas } from "@/lib/alertas/saude";
import Atualizador from "../_componentes/Atualizador";
import Cabecalho from "../_componentes/Cabecalho";
import s from "./page.module.css";

/**
 * Saúde — a prova de que motor → banco → painel conversam.
 *
 * Tudo vem do banco a cada visita (e a cada 10 segundos, pelo Atualizador).
 * Se o banco não responder, a tela diz isso em vermelho em vez de quebrar.
 */

const ATUALIZA_A_CADA_S = 10;

const fmtHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtDiaHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const TIPO_EVENTO: Record<string, string> = {
  subiu: "Subiu",
  assumiu: "Assumiu",
  perdeu: "Perdeu a vez",
  esperando: "Esperando",
  parou: "Parou",
  sem_configuracao: "Sem configuração",
  aviso_do_vigia: "Aviso do vigia",
};

const ESTADO: Record<string, string> = {
  trabalhando: "trabalhando",
  esperando: "esperando a vez",
};

export default async function SaudePage() {
  await connection();

  let saude: Saude | null = null;
  let operadoras: SaudeOperadora[] = [];
  let alertas: SaudeDosAlertas | string | null = null;
  let falha: string | null = null;
  try {
    saude = await lerSaude();
    operadoras = await lerSaudeDasOperadoras();
    // Os alertas não derrubam a tela: um problema neles aparece no bloco deles.
    alertas = await lerSaudeDosAlertas().catch((e) => mensagemDe(e));
  } catch (e) {
    falha = mensagemDe(e);
  }

  return (
    <div className={s.pagina}>
      <Atualizador segundos={ATUALIZA_A_CADA_S} />

      <Cabecalho atual="/saude" subtitulo="Saúde do sistema" />

      {falha || !saude ? (
        <section className={`${s.semaforo} ${s.vermelho}`}>
          <span className={s.luz} />
          <div>
            <h2 className={s.titulo}>Não consegui ler o banco</h2>
            <p className={s.motivo}>{falha}</p>
          </div>
        </section>
      ) : (
        <>
          <Conteudo saude={saude} />
          <Operadoras lista={operadoras} />
          {alertas && <Alertas a={alertas} />}
        </>
      )}

      <footer className={s.rodape}>
        Atualiza sozinho a cada {ATUALIZA_A_CADA_S} segundos.
        {saude?.limites &&
          ` Amarelo depois de ${duracao(saude.limites.amareloS)} sem sinal; vermelho depois de ${duracao(saude.limites.vermelhoS)}.`}
      </footer>
    </div>
  );
}

function Conteudo({ saude }: { saude: Saude }) {
  const { batimento, ultimaPassada: ultima } = saude;
  return (
    <>
      <section className={`${s.semaforo} ${s[saude.cor]}`} aria-live="polite">
        <span className={s.luz} />
        <div>
          <h2 className={s.titulo}>{saude.titulo}</h2>
          <p className={s.motivo}>{saude.motivo}</p>
        </div>
      </section>

      <section className={s.numeros}>
        <div className={s.numero}>
          <span className={s.rotulo}>O motor bateu há</span>
          <strong className={s.valor}>{batimento ? duracao(batimento.segundos) : "—"}</strong>
          <span className={s.detalhe}>
            {batimento
              ? `${batimento.maquina ?? "?"} · versão ${batimento.versao ?? "?"}`
              : "nenhum sinal ainda"}
          </span>
        </div>
        <div className={s.numero}>
          <span className={s.rotulo}>Última passada</span>
          <strong className={s.valor}>{ultima ? `às ${fmtHora.format(ultima.comecouEm)}` : "—"}</strong>
          <span className={s.detalhe}>
            {ultima
              ? `nº ${ultima.numero} · ${ultima.status === "ok" ? "deu certo" : ultima.status === "erro" ? "deu erro" : "rodando"}` +
                (ultima.duracaoMs !== null ? ` · ${ultima.duracaoMs} ms` : "")
              : "nenhuma passada ainda"}
          </span>
        </div>
        <div className={s.numero}>
          <span className={s.rotulo}>Passadas hoje</span>
          <strong className={s.valor}>{saude.passadasHoje.toLocaleString("pt-BR")}</strong>
          <span className={s.detalhe}>
            {saude.errosHoje ? `${saude.errosHoje} com erro` : "nenhuma com erro"}
          </span>
        </div>
      </section>

      {ultima?.status === "erro" && ultima.erro && (
        <p className={s.erro}>
          <b>Erro da última passada:</b> {ultima.erro}
        </p>
      )}

      <section className={s.bloco}>
        <h3 className={s.blocoTitulo}>Motores ligados</h3>
        {saude.instancias.length === 0 ? (
          <p className={s.vazio}>Nenhum motor deu sinal nos últimos 2 minutos.</p>
        ) : (
          <ul className={s.lista}>
            {saude.instancias.map((i, n) => (
              <li key={n} className={s.linha}>
                <span className={`${s.etiqueta} ${i.estado === "trabalhando" ? s.etqOk : s.etqEspera}`}>
                  {ESTADO[i.estado] ?? i.estado}
                </span>
                <span className={s.linhaTexto}>
                  <b>{i.maquina}</b> · versão {i.versao}
                </span>
                <span className={s.linhaHora}>visto há {duracao(i.segundos)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={s.bloco}>
        <h3 className={s.blocoTitulo}>Últimos acontecimentos</h3>
        {saude.eventos.length === 0 ? (
          <p className={s.vazio}>Nada registrado ainda.</p>
        ) : (
          <ul className={s.lista}>
            {saude.eventos.map((e, n) => (
              <li key={n} className={s.linha}>
                <span className={s.linhaHora}>{fmtDiaHora.format(e.em)}</span>
                <span className={s.linhaTexto}>
                  <b>{TIPO_EVENTO[e.tipo] ?? e.tipo}</b> · {e.maquina} — {e.mensagem}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

const ESTADO_ACESSO: Record<string, string> = {
  ok: "login ok",
  desligado: "desligado",
  caiu: "login caiu",
  senha_recusada: "senha recusada",
  aguardando_codigo: "esperando o código",
};

/** V1b — as operadoras: a leitura da vitrine delas e o revalidador (o robô no portal). */
function Operadoras({ lista }: { lista: SaudeOperadora[] }) {
  if (!lista.length) return null;
  const cor = { verde: s.etqOk, amarelo: s.etqAlerta, vermelho: s.etqCrit };
  return (
    <section className={s.bloco}>
      <h3 className={s.blocoTitulo}>Operadoras</h3>
      <ul className={s.lista}>
        {lista.map((o) => (
          <li key={o.fonteId} className={s.linha}>
            <span className={`${s.etiqueta} ${cor[o.cor]}`}>{o.nome}</span>
            <span className={s.linhaTexto}>
              <b>Vitrine:</b>{" "}
              {o.leitura
                ? `${o.leitura.status === "ok" ? "" : `${o.leitura.status} — `}${o.leitura.resumo ?? o.leitura.erro ?? ""}`
                : "ainda não lida (ligue o motor)"}
              <br />
              <b>Conferência no portal:</b>{" "}
              {!o.ligado
                ? "desligada na configuração (revalidador.ligado = 0)"
                : o.acesso
                  ? `${ESTADO_ACESSO[o.acesso.estado] ?? o.acesso.estado}${o.acesso.mensagem ? ` — ${o.acesso.mensagem}` : ""}`
                  : "sem registro"}
              <br />
              <small>
                {o.consultasHoje} de {o.teto} consultas hoje · {o.naFila} na fila
                {o.acesso?.ultimaConferenciaEm && ` · última conferência ${fmtDiaHora.format(o.acesso.ultimaConferenciaEm)}`}
                {o.acesso?.ultimoLoginEm && ` · último login ${fmtDiaHora.format(o.acesso.ultimoLoginEm)}`}
              </small>
            </span>
            <span className={s.linhaHora}>{o.leitura ? `lida ${fmtDiaHora.format(o.leitura.em)}` : ""}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** V6 — os alertas do grupo de passagens do WhatsApp: o que chegou hoje, o que
 *  virou oferta, e se o monitor e a ponte estão mandando. */
function Alertas({ a }: { a: SaudeDosAlertas | string }) {
  const cor = { verde: s.etqOk, amarelo: s.etqAlerta, vermelho: s.etqCrit };
  if (typeof a === "string") {
    return (
      <section className={s.bloco}>
        <h3 className={s.blocoTitulo}>Alertas do WhatsApp</h3>
        <p className={s.motivo}>Não consegui ler: {a}</p>
      </section>
    );
  }
  const n = (k: string) => a.hoje[k] ?? 0;
  return (
    <section className={s.bloco}>
      <h3 className={s.blocoTitulo}>Alertas do WhatsApp</h3>
      <ul className={s.lista}>
        <li className={s.linha}>
          <span className={`${s.etiqueta} ${cor[a.cor]}`}>Alerta CPM</span>
          <span className={s.linhaTexto}>
            <b>Hoje:</b> {a.recebidosHoje} alerta{a.recebidosHoje === 1 ? "" : "s"} recebido{a.recebidosHoje === 1 ? "" : "s"}
            {" · "}
            {n("oferta")} viraram oferta · {n("fora_origem")} fora de origem · {n("fora_programa")} fora de programa
            {n("fora_classe") ? ` · ${n("fora_classe")} fora de classe` : ""}
            {n("sem_datas") ? ` · ${n("sem_datas")} sem datas` : ""}
            {" · "}
            {n("nao_entendido")} não entendido{n("nao_entendido") === 1 ? "" : "s"}
            {n("falta_ler") ? ` · ${n("falta_ler")} esperando leitura` : ""}
            {a.repetidosHoje ? ` (${a.repetidosHoje} repetido${a.repetidosHoje === 1 ? "" : "s"})` : ""}
            <br />
            <b>Na vitrine:</b> {a.naVitrine} oferta{a.naVitrine === 1 ? "" : "s"} de alerta
            {a.semConferencia ? `, ${a.semConferencia} esperando conferência` : ""}
            {a.avisos.map((x) => (
              <span key={x}>
                <br />
                <b className={s.motivo}>⚠ {x}</b>
              </span>
            ))}
            <br />
            <small>
              {a.ponte?.lidaEm ? `ponte leu ${fmtDiaHora.format(a.ponte.lidaEm)}${a.ponte.maquina ? ` (${a.ponte.maquina})` : ""}` : "ponte nunca leu"}
              {a.monitor?.em && ` · monitor deu sinal ${fmtDiaHora.format(a.monitor.em)}`}
              {a.monitor?.whatsapp && ` · WhatsApp ${a.monitor.whatsapp === "CONNECTED" ? "conectado" : a.monitor.whatsapp}`}
              {a.monitor?.grupo && ` · grupo ${a.monitor.grupo}`}
            </small>
          </span>
          <span className={s.linhaHora}>{a.ultimoAlertaEm ? `último alerta ${fmtDiaHora.format(a.ultimoAlertaEm)}` : ""}</span>
        </li>
      </ul>
    </section>
  );
}
