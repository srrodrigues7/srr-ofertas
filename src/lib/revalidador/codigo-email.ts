import { ImapFlow } from "imapflow";
import { dormir } from "@/pacote/datas";

/**
 * Lê, na caixa do e-mail da operação, o código de verificação que um portal
 * de fornecedor manda no login (a Cativa pede "às vezes").
 *
 * Só LEITURA: a caixa é aberta em modo somente leitura (nada é marcado como
 * lido, movido ou apagado), e só se olham mensagens que chegaram depois do
 * pedido de login. As credenciais vêm do .env (quem põe é o Saulo):
 *   EMAIL_OPERACAO_USUARIO   — o endereço (Gmail / Google Workspace)
 *   EMAIL_OPERACAO_SENHA_APP — uma "senha de app" do Google, não a senha da conta
 *   EMAIL_OPERACAO_SERVIDOR  — opcional; padrão imap.gmail.com
 */

export const VARIAVEIS_DO_EMAIL = ["EMAIL_OPERACAO_USUARIO", "EMAIL_OPERACAO_SENHA_APP"] as const;

export async function esperarCodigo(opcoes: {
  /** Só vale mensagem que chegou depois disto (um minuto de folga para o relógio). */
  desde: Date;
  esperaS: number;
  /** Pista do remetente/assunto (ex.: "cativa"). */
  pista: RegExp;
}): Promise<string> {
  const usuario = process.env.EMAIL_OPERACAO_USUARIO;
  const senha = process.env.EMAIL_OPERACAO_SENHA_APP;
  if (!usuario || !senha) throw new Error("Falta o acesso ao e-mail da operação no .env (EMAIL_OPERACAO_USUARIO e EMAIL_OPERACAO_SENHA_APP).");
  const limite = Date.now() + opcoes.esperaS * 1000;
  const desde = new Date(opcoes.desde.getTime() - 60_000);
  while (Date.now() < limite) {
    const codigo = await procurar(usuario, senha, desde, opcoes.pista);
    if (codigo) return codigo;
    await dormir(10_000);
  }
  throw new Error(`O código de verificação não chegou no e-mail da operação em ${Math.round(opcoes.esperaS / 60)} min.`);
}

async function procurar(usuario: string, senha: string, desde: Date, pista: RegExp): Promise<string | null> {
  const cliente = new ImapFlow({
    host: process.env.EMAIL_OPERACAO_SERVIDOR || "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: usuario, pass: senha },
    logger: false,
  });
  await cliente.connect();
  try {
    const trava = await cliente.getMailboxLock("INBOX", { readOnly: true });
    try {
      const ids = await cliente.search({ since: desde }, { uid: true });
      if (!ids || !ids.length) return null;
      // As mais novas primeiro.
      const candidatas: { em: number; assunto: string; de: string; uid: number }[] = [];
      for await (const m of cliente.fetch(ids.slice(-20), { envelope: true, internalDate: true }, { uid: true })) {
        const em = m.internalDate ? new Date(m.internalDate).getTime() : 0;
        if (em < desde.getTime()) continue;
        const de = (m.envelope?.from ?? []).map((f) => `${f.name ?? ""} ${f.address ?? ""}`).join(" ");
        candidatas.push({ em, assunto: m.envelope?.subject ?? "", de, uid: m.uid });
      }
      candidatas.sort((a, b) => b.em - a.em);
      for (const c of candidatas) {
        if (!pista.test(`${c.de} ${c.assunto}`)) continue;
        const doAssunto = extrairCodigo(c.assunto);
        if (doAssunto) return doAssunto;
        const corpo = await cliente.download(String(c.uid), undefined, { uid: true });
        const texto = await lerTudo(corpo.content);
        const codigo = extrairCodigo(texto.replace(/<[^>]+>/g, " "));
        if (codigo) return codigo;
      }
      return null;
    } finally {
      trava.release();
    }
  } finally {
    await cliente.logout().catch(() => undefined);
  }
}

/** O código: 4 a 8 dígitos sozinhos, perto de "código"/"code" se houver. */
export function extrairCodigo(texto: string): string | null {
  const perto = texto.match(/c[oó]d(?:igo)?[^0-9]{0,40}(\d{4,8})\b/i) ?? texto.match(/code[^0-9]{0,40}(\d{4,8})\b/i);
  if (perto) return perto[1];
  const solto = texto.match(/(?<![\d/.:-])(\d{6})(?![\d/.:-])/);
  return solto ? solto[1] : null;
}

async function lerTudo(fluxo: NodeJS.ReadableStream): Promise<string> {
  const partes: Buffer[] = [];
  for await (const p of fluxo) partes.push(Buffer.isBuffer(p) ? p : Buffer.from(p));
  return Buffer.concat(partes).toString("utf8").slice(0, 200_000);
}
