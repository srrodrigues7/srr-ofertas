import { prisma } from "../banco";
import { CHAVES_DA_SAUDE, lerConfiguracao } from "../configuracao";
import { ErroDeConfiguracao, mensagemDe } from "../erros";

/**
 * O retrato da saúde do motor, lido do banco. Usado pela tela de Saúde e pelo
 * "Conferir motor" do computador dedicado.
 *
 * Os "há quantos segundos" são calculados pelo banco (`now() - ...`), pela
 * mesma razão da trava: um relógio só.
 */

export type Cor = "verde" | "amarelo" | "vermelho";

export type Saude = {
  cor: Cor;
  /** A frase do semáforo: "Motor trabalhando", "Motor atrasado"... */
  titulo: string;
  /** Por que a cor é essa, em uma linha. */
  motivo: string;
  batimento: {
    segundos: number;
    maquina: string | null;
    versao: string | null;
    comTrava: boolean;
  } | null;
  ultimaPassada: {
    numero: number;
    comecouEm: Date;
    status: string;
    duracaoMs: number | null;
    resumo: string | null;
    erro: string | null;
  } | null;
  passadasHoje: number;
  errosHoje: number;
  instancias: {
    maquina: string;
    versao: string;
    estado: string;
    segundos: number;
  }[];
  eventos: { em: Date; maquina: string; tipo: string; mensagem: string }[];
  limites: { amareloS: number; vermelhoS: number } | null;
};

export async function lerSaude(): Promise<Saude> {
  let limites: Saude["limites"] = null;
  let erroConfig: string | null = null;
  try {
    const c = await lerConfiguracao(CHAVES_DA_SAUDE);
    limites = { amareloS: c["saude.amarelo_apos_s"], vermelhoS: c["saude.vermelho_apos_s"] };
  } catch (e) {
    if (!(e instanceof ErroDeConfiguracao)) throw e;
    erroConfig = mensagemDe(e);
  }

  const [trava] = await prisma.$queryRaw<
    {
      segundos: number | null;
      maquina: string | null;
      versao: string | null;
      com_trava: boolean;
    }[]
  >`
    SELECT EXTRACT(EPOCH FROM now() - batimento_em)::int AS segundos,
           maquina, versao,
           COALESCE(travado_ate > now(), false) AS com_trava
      FROM "ofertas"."motor_trava" WHERE id = 'motor'`;

  const ultima = await prisma.passada.findFirst({
    orderBy: { comecouEm: "desc" },
    select: {
      numero: true,
      comecouEm: true,
      status: true,
      duracaoMs: true,
      resumo: true,
      erro: true,
    },
  });

  // "Hoje" é o dia de Brasília, não o do servidor da Vercel (que vive em UTC).
  const [hoje] = await prisma.$queryRaw<{ total: number; erros: number }[]>`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE status = 'erro')::int AS erros
      FROM "ofertas"."passada"
     WHERE comecou_em >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')
                          AT TIME ZONE 'America/Sao_Paulo')`;

  const instancias = await prisma.$queryRaw<
    { maquina: string; versao: string; estado: string; segundos: number }[]
  >`
    SELECT maquina, versao, estado,
           EXTRACT(EPOCH FROM now() - visto_em)::int AS segundos
      FROM "ofertas"."motor_instancia"
     WHERE visto_em > now() - interval '2 minutes' AND estado <> 'parou'
     ORDER BY estado DESC, visto_em DESC`;

  const eventos = await prisma.motorEvento.findMany({
    orderBy: { em: "desc" },
    take: 8,
    select: { em: true, maquina: true, tipo: true, mensagem: true },
  });

  const batimento =
    trava && trava.segundos !== null
      ? {
          segundos: trava.segundos,
          maquina: trava.maquina,
          versao: trava.versao,
          comTrava: trava.com_trava,
        }
      : null;

  const base = {
    batimento,
    ultimaPassada: ultima,
    passadasHoje: hoje?.total ?? 0,
    errosHoje: hoje?.erros ?? 0,
    instancias,
    eventos,
    limites,
  };

  if (!limites) {
    return {
      ...base,
      cor: "vermelho",
      titulo: "Configuração incompleta",
      motivo: erroConfig ?? "falta configuração",
    };
  }
  if (!batimento) {
    return {
      ...base,
      cor: "vermelho",
      titulo: "Motor nunca bateu",
      motivo: "Nenhum motor deu sinal de vida até agora.",
    };
  }

  const s = batimento.segundos;
  if (s > limites.vermelhoS) {
    return {
      ...base,
      cor: "vermelho",
      titulo: "Motor parado",
      motivo: `Sem sinal de vida há ${duracao(s)} (o limite é ${duracao(limites.vermelhoS)}).`,
    };
  }
  if (s > limites.amareloS) {
    return {
      ...base,
      cor: "amarelo",
      titulo: "Motor atrasado",
      motivo: `Sem sinal de vida há ${duracao(s)} (o normal é menos de ${duracao(limites.amareloS)}).`,
    };
  }
  // Batendo, mas sem produzir: vigiar produção, não só processo vivo (lição 6
  // do Radar da HUB 92).
  if (ultima?.status === "erro") {
    return {
      ...base,
      cor: "amarelo",
      titulo: "Motor com erro",
      motivo: "O motor está vivo, mas a última passada deu erro.",
    };
  }
  return {
    ...base,
    cor: "verde",
    titulo: "Motor trabalhando",
    motivo: `Bateu há ${duracao(s)}.`,
  };
}

/** 45 → "45 segundos"; 190 → "3 min e 10 s"; 180 → "3 minutos"; 7300 → "2 horas".
 *  Abaixo de 10 minutos mostra os segundos: é perto dos limites do semáforo,
 *  e "3 minutos" sozinho não diria se passou ou não dos 3. */
export function duracao(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  if (s < 90) return s === 1 ? "1 segundo" : `${s} segundos`;
  if (s < 600) return s % 60 ? `${Math.floor(s / 60)} min e ${s % 60} s` : `${s / 60} minutos`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} minutos`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} horas`;
  return `${Math.round(h / 24)} dias`;
}
