import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Frame, type Locator, type Page } from "playwright-core";
import { dormir } from "@/pacote/datas";
import { esperarCodigo } from "./codigo-email";

/**
 * O robô do portal do agente da Cativa (Infotravel) — só para CONFERIR preço e
 * vaga de uma oferta já achada. Desenho: docs/fontes/revalidador-cativa.md.
 *
 * Usa o Microsoft Edge que já vem no Windows, invisível (sem baixar navegador).
 * O portal é JSF/PrimeFaces: cada tela guarda estado no servidor e não há
 * chamada de dados limpa, por isso o robô faz o que a pessoa faz na tela.
 *
 * Regras que NÃO se negociam (estão no código, não só no costume):
 * - nunca clica em reservar, adicionar, emitir, pagar (ver `clicar`);
 * - senha recusada: para e avisa, sem insistir (insistir bloqueia o usuário);
 * - toda conferência tem prazo e o navegador sempre fecha (lição 9).
 *
 * Credenciais no .env (quem põe é o Saulo): CATIVA_USUARIO, CATIVA_SENHA — o
 * usuário SÓ DO ROBÔ, cadastrado com o e-mail da operação.
 */

export const VARIAVEIS_DA_CATIVA = ["CATIVA_USUARIO", "CATIVA_SENHA"] as const;
const BASE = "https://reservas.cativaoperadora.com.br/infotravel";
const PASTA_DADOS = process.env.DADOS_PASTA || join(process.cwd(), ".dados");
const ARQ_SESSAO = join(PASTA_DADOS, "cativa-sessao.json");
const PROIBIDO = /reserv|adicionar|carrinho|emitir|finaliz|pagar|pagamento|comprar|confirmar reserva/i;

export class SenhaRecusada extends Error {
  constructor(m: string) {
    super(m);
    this.name = "SenhaRecusada";
  }
}

/** A impressão digital da credencial (para não insistir na mesma senha recusada). */
export function marcaDaCredencial(): string | null {
  const u = process.env.CATIVA_USUARIO;
  const s = process.env.CATIVA_SENHA;
  if (!u || !s) return null;
  return createHash("sha256").update(`${u}\n${s}`).digest("hex").slice(0, 16);
}

export type ResultadoPortal = { resultado: "ok" | "esgotou" | "nao_deu"; valor?: number | null; motivo?: string | null };

export type BloqueioNoPortal = {
  ida: string; // "2026-10-17"
  volta: string | null;
  idaSai: string | null; // "0800"
  tarifa: number;
  deadline: Date | null;
  disponiveis: number;
  companhia: string | null;
};

export class PortalCativa {
  private navegador: Browser | null = null;
  private contexto: BrowserContext | null = null;
  private pagina: Page | null = null;
  /** O robô entrou de verdade (fez login) nesta sessão? */
  entrou = false;

  constructor(private readonly opcoes: { codigoEsperaS: number; log: (m: string) => void }) {}

  async abrir(): Promise<void> {
    await mkdir(PASTA_DADOS, { recursive: true });
    this.navegador = await chromium.launch({ channel: "msedge", headless: true });
    this.contexto = await this.navegador.newContext({
      storageState: existsSync(ARQ_SESSAO) ? ARQ_SESSAO : undefined,
      locale: "pt-BR",
      viewport: { width: 1366, height: 900 },
    });
    this.pagina = await this.contexto.newPage();
    this.pagina.setDefaultTimeout(30_000);
  }

  /** Sempre: guarda a sessão (menos códigos por e-mail) e fecha o navegador. */
  async fechar(): Promise<void> {
    try {
      if (this.contexto && this.entrou) await this.contexto.storageState({ path: ARQ_SESSAO });
    } catch {
      // sem a sessão guardada, só se perde o "dispositivo conhecido"
    }
    await this.navegador?.close().catch(() => undefined);
    this.navegador = null;
    this.contexto = null;
    this.pagina = null;
  }

  private get p(): Page {
    if (!this.pagina) throw new Error("O navegador do robô não está aberto.");
    return this.pagina;
  }

  /** Garante a sessão logada. Pode pedir o código por e-mail. */
  async garantirLogin(): Promise<void> {
    const p = this.p;
    await p.goto(`${BASE}/admin/main.xhtml`, { waitUntil: "domcontentloaded" });
    if (!/login\.xhtml/i.test(p.url())) {
      this.entrou = true;
      return;
    }
    const usuario = process.env.CATIVA_USUARIO;
    const senha = process.env.CATIVA_SENHA;
    if (!usuario || !senha) throw new Error("Falta CATIVA_USUARIO / CATIVA_SENHA no .env.");
    const pedidoEm = new Date();
    await p.getByPlaceholder(/usu[aá]rio/i).fill(usuario);
    await p.getByPlaceholder(/senha/i).fill(senha);
    await clicar(p.getByRole("button", { name: /^\s*entrar\s*$/i }));
    await p.waitForURL(/(main|auth)\.xhtml|login\.xhtml/i, { timeout: 30_000 }).catch(() => undefined);
    await dormir(2000);

    if (/login\.xhtml/i.test(p.url())) {
      const aviso = (await p.locator(".ui-messages, .ui-growl, .ui-message").allInnerTexts().catch(() => [])).join(" ").trim();
      throw new SenhaRecusada(`O portal recusou o login do robô${aviso ? `: ${aviso.slice(0, 200)}` : ""}.`);
    }
    if (/auth\.xhtml/i.test(p.url()) && (await temCampoDeCodigo(p))) {
      this.opcoes.log("Cativa pediu código por e-mail; lendo a caixa da operação.");
      const codigo = await esperarCodigo({ desde: pedidoEm, esperaS: this.opcoes.codigoEsperaS, pista: /cativa|infotravel|infotera/i });
      await p.locator("input[type=text]:visible, input[type=tel]:visible, input[type=number]:visible, input:not([type]):visible").first().fill(codigo);
      await clicar(p.getByRole("button", { name: /confirm|valid|enviar|entrar|continuar|acessar|verificar/i }).first());
      await p.waitForURL(/main\.xhtml/i, { timeout: 30_000 });
    }
    if (!/main\.xhtml/i.test(p.url())) {
      await p.goto(`${BASE}/admin/main.xhtml`, { waitUntil: "domcontentloaded" });
      if (/login\.xhtml|auth\.xhtml/i.test(p.url())) throw new Error("O login não terminou (o portal não chegou à tela inicial).");
    }
    this.entrou = true;
    this.opcoes.log("Robô entrou no portal da Cativa.");
  }

  /** Abre uma tela do menu do portal (cada tela vive num quadro interno). */
  private async abrirTela(nome: string, caminho: string): Promise<Frame> {
    const p = this.p;
    if (!/main\.xhtml/i.test(p.url())) await p.goto(`${BASE}/admin/main.xhtml`, { waitUntil: "domcontentloaded" });
    await p.evaluate(
      ([n, c]) => (window as unknown as { montaMenu: { addTab: (a: string, b: string, d: string) => void } }).montaMenu.addTab(n, c, "null"),
      [nome, `/infotravel${caminho}`] as const,
    );
    const alvo = new RegExp(caminho.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"));
    for (let i = 0; i < 30; i++) {
      const f = p.frames().find((x) => alvo.test(x.url()));
      if (f) {
        await f.waitForLoadState("domcontentloaded");
        return f;
      }
      await dormir(500);
    }
    throw new Error(`A tela "${nome}" do portal não abriu.`);
  }

  // --- pacote ---------------------------------------------------------------

  /**
   * Confere os hotéis de um pacote: mesma saída, destino, datas e pacote, com
   * UMA busca no portal; cada hotel se lê pelo filtro de nome. Devolve, por hotel, o
   * preço POR PESSOA com as taxas (o que a vitrine guarda).
   */
  async conferirPacote(
    l: { origem: string; destino: string; ida: string; volta: string; pacote: string },
    hoteis: string[],
  ): Promise<Map<string, ResultadoPortal>> {
    const todos = (r: ResultadoPortal) => new Map(hoteis.map((h) => [h, r]));
    const f = await this.abrirTela("Reservar", "/admin/venda/venda.xhtml");
    await clicar(f.getByText(/CATIVA COMISSIONADO/i).first());
    await f.getByPlaceholder("Cidade ou aeroporto de origem").waitFor();

    // Origem: a sugestão do próprio componente.
    await f.evaluate((t) => (window as unknown as Pf).PrimeFaces.widgets["widget_frmMotorPacoteLocal_idAeroOrigem"].search(t), l.origem);
    const sugestao = f.locator(`tr.ui-autocomplete-item[data-item-value*="(${l.origem})"]`).first();
    await sugestao.waitFor({ timeout: 20_000 });
    await sugestao.click();
    await dormir(2500);

    // Destino: a lista (233 de BSB). Cidade ("M-…") primeiro; senão, o que contiver o nome.
    const escolha = await f.evaluate((nome) => {
      const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
      const sel = [...document.querySelectorAll("select")].find((s) =>
        [...s.options].some((o) => o.value.startsWith("M-") || o.value.startsWith("E!")),
      );
      if (!sel) return null;
      const alvo = n(nome);
      const opcoes = [...sel.options].map((o) => ({ v: o.value, t: n(o.text) }));
      const cidade = opcoes.find((o) => o.v.startsWith("M-") && (o.t === alvo || o.t.startsWith(`${alvo},`)));
      const qualquer = opcoes.find((o) => o.t.includes(alvo));
      const achou = cidade ?? qualquer;
      return achou ? { valor: achou.v, widget: `widget_${sel.id.replace(/_input$/, "").replace(/:/g, "_")}` } : null;
    }, l.destino);
    if (!escolha) return todos({ resultado: "nao_deu", motivo: `o destino "${l.destino}" não está na lista do portal` });
    await f.evaluate(([w, v]) => (window as unknown as Pf).PrimeFaces.widgets[w].selectValue(v), [escolha.widget, escolha.valor] as const);
    await dormir(1500);

    const [ai, mi, di] = l.ida.split("-").map(Number);
    const [av, mv, dv] = l.volta.split("-").map(Number);
    await f.evaluate(
      ([a, b]) => {
        (window as unknown as Pf).PrimeFaces.widgets["widget_frmMotorPacoteLocal_dtPartidaPacoteLocal"].setDate(new Date(a[0], a[1] - 1, a[2]));
        (window as unknown as Pf).PrimeFaces.widgets["widget_frmMotorPacoteLocal_dtRetornoPacoteLocal"].setDate(new Date(b[0], b[1] - 1, b[2]));
      },
      [[ai, mi, di], [av, mv, dv]] as const,
    );
    await dormir(800);
    await clicar(f.getByRole("button", { name: /^\s*pesquisar\s*$/i }).first());
    const achou = await esperarTexto(f, /Hot[eé]is Dispon[ií]veis|Nenhum (registro|resultado|pacote)|n[aã]o (foram )?encontrad/i, 90_000);
    if (!achou || !/Hot[eé]is Dispon/i.test(achou)) return todos({ resultado: "nao_deu", motivo: "o portal não trouxe pacotes para estas datas" });

    // O pacote certo (abas "25690 - Porto de Galinhas com …").
    const aba = f.locator("a, li, span, div").filter({ hasText: new RegExp(`^\\s*\\d+\\s*-\\s*${escapar(l.pacote)}\\s*$`, "i") }).first();
    if (await aba.count()) {
      await aba.click().catch(() => undefined);
      await dormir(6000);
    } else {
      return todos({ resultado: "nao_deu", motivo: `o pacote "${l.pacote}" não apareceu nesta data no portal` });
    }

    // Cada hotel: o filtro por nome do próprio portal (sem buscar de novo).
    const saida = new Map<string, ResultadoPortal>();
    const filtro = f.locator("#idNomeHotelFiltro");
    for (const hotel of hoteis) {
      if (await filtro.count()) {
        await filtro.fill(primeirasPalavras(hotel, 3));
        await filtro.press("Enter");
        await dormir(5000);
      }
      const preco = precoDoHotel(await f.locator("body").innerText(), hotel);
      saida.set(
        hotel,
        preco == null
          ? { resultado: "esgotou", motivo: `o hotel ${hotel} não aparece mais neste pacote e data` }
          : { resultado: "ok", valor: preco },
      );
    }
    return saida;
  }

  // --- bloqueios ------------------------------------------------------------

  /** Todos os bloqueios de uma rota num período (uma consulta confere vários). */
  async bloqueiosDaRota(origem: string, destino: string, de: string, ate: string): Promise<BloqueioNoPortal[]> {
    const f = await this.abrirTela("Bloqueios de voo", "/admin/voo/voo.xhtml");
    await f.locator("#idSgOrigem").waitFor();
    await f.locator("#idSgOrigem").fill(origem);
    await f.locator("#idSgDestino").fill(destino);
    const [a1, m1, d1] = de.split("-").map(Number);
    const [a2, m2, d2] = ate.split("-").map(Number);
    await f.evaluate(
      ([x, y]) => {
        (window as unknown as Pf).PrimeFaces.widgets["widget_dtInicial"].setDate(new Date(x[0], x[1] - 1, x[2]));
        (window as unknown as Pf).PrimeFaces.widgets["widget_dtFinal"].setDate(new Date(y[0], y[1] - 1, y[2]));
      },
      [[a1, m1, d1], [a2, m2, d2]] as const,
    );
    await clicar(f.getByRole("button", { name: /^\s*pesquisar\s*$/i }).first());
    await esperarTexto(f, /Resultado de sua pesquisa/i, 60_000);
    await dormir(1500);

    const linhas: BloqueioNoPortal[] = [];
    for (let pagina = 0; pagina < 10; pagina++) {
      const brutas = await f.locator("tbody tr").evaluateAll((trs) =>
        trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => (td as HTMLElement).innerText.trim())).filter((c) => c.length >= 7),
      );
      for (const c of brutas) {
        const b = lerLinhaDeBloqueio(c);
        if (b) linhas.push(b);
      }
      const proxima = f.locator(".ui-paginator-next:not(.ui-state-disabled)").first();
      if (!(await proxima.count())) break;
      await proxima.click();
      await dormir(2500);
    }
    return linhas;
  }
}

// --- miúdos ---------------------------------------------------------------------

/** O único jeito de clicar: recusa qualquer coisa que reserve, adicione ou pague. */
async function clicar(alvo: Locator): Promise<void> {
  const texto = ((await alvo.innerText().catch(() => "")) || (await alvo.getAttribute("value").catch(() => "")) || "").trim();
  if (PROIBIDO.test(texto)) throw new Error(`Trava de segurança: o robô não clica em "${texto}".`);
  await alvo.click();
}

async function temCampoDeCodigo(p: Page): Promise<boolean> {
  return (await p.locator("input[type=text]:visible, input[type=tel]:visible, input[type=number]:visible, input:not([type]):visible").count()) > 0;
}

async function esperarTexto(f: Frame, re: RegExp, prazoMs: number): Promise<string | null> {
  const fim = Date.now() + prazoMs;
  while (Date.now() < fim) {
    const t = await f.locator("body").innerText().catch(() => "");
    const m = t.match(re);
    if (m) return m[0];
    await dormir(1500);
  }
  return null;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
const primeirasPalavras = (s: string, n: number) => s.split(/\s+/).slice(0, n).join(" ");

/** "Por pessoa BRL 10.338,27" do cartão do hotel (o primeiro com aquele nome). */
export function precoDoHotel(texto: string, hotel: string): number | null {
  const t = semAcento(texto);
  const alvo = semAcento(hotel).replace(/\s+-\s+all inclusive$/, "");
  const i = t.indexOf(alvo);
  if (i < 0) return null;
  const trecho = texto.slice(i, i + 2500);
  const m = trecho.match(/Por pessoa\s*BRL\s*([\d.]+,\d{2})/i);
  return m ? Number(m[1].replace(/\./g, "").replace(",", ".")) : null;
}

/**
 * Uma linha da tela de bloqueios, coluna por coluna:
 * partida ("BSB17/10/26 08:00h\nREC24/10/26 08:30h"), chegada, companhia,
 * tarifa ("R$757,00 - CDR704\nBloqueio"), deadline ("14/10/26 08:00h"), status, disponíveis.
 */
export function lerLinhaDeBloqueio(c: string[]): BloqueioNoPortal | null {
  const datas = [...c[0].matchAll(/(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/g)];
  const tarifa = c[3]?.match(/R\$\s*([\d.]+,\d{2})/);
  if (!datas.length || !tarifa) return null;
  const iso = (m: RegExpMatchArray) => `20${m[3]}-${m[2]}-${m[1]}`;
  const dl = c[4]?.match(/(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
  return {
    ida: iso(datas[0]),
    volta: datas[1] ? iso(datas[1]) : null,
    idaSai: `${datas[0][4]}${datas[0][5]}`,
    tarifa: Number(tarifa[1].replace(/\./g, "").replace(",", ".")),
    deadline: dl ? new Date(`20${dl[3]}-${dl[2]}-${dl[1]}T${dl[4]}:${dl[5]}:00-03:00`) : null,
    disponiveis: Number(c[6]?.match(/-?\d+/)?.[0] ?? "0"),
    companhia: c[2]?.split("\n")[0]?.trim() || null,
  };
}

/** Os componentes do PrimeFaces, como a página do portal os expõe. */
type Pf = {
  PrimeFaces: {
    widgets: Record<string, { search: (t: string) => void; selectValue: (v: string) => void; setDate: (d: Date) => void }>;
  };
};
