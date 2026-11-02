"use client";

import { useState } from "react";
import { CORES, pintarAgora, type Visual } from "./visual";
import s from "./SeletorDeVisual.module.css";

/**
 * O seletor de tema e cor do kit da SRR (etapa D): a lua (ou o sol) troca o
 * tema, a paleta abre as seis cores. É o mesmo no VoePro e no Radar de ofertas.
 *
 * Ele pinta a página na hora (`pintarAgora`) e avisa quem usa (`aoMudar`):
 * guardar a escolha é de cada sistema — o VoePro guarda na pessoa, com uma
 * ação de servidor; outro sistema pode guardar só no cookie.
 *
 * Os ícones são desenhados aqui mesmo, para o kit não depender de biblioteca.
 */
export default function SeletorDeVisual({
  visual,
  aoMudar,
  emPe = false,
  aviso = "Fica guardada em você: vale em qualquer computador.",
  children,
}: {
  visual: Visual;
  aoMudar: (mudanca: Partial<Visual>) => void;
  /** Os botões um embaixo do outro, e a paleta abrindo ao lado (o menu
   *  recolhido do VoePro). */
  emPe?: boolean;
  /** A frase no pé da paleta: onde a escolha fica guardada. */
  aviso?: string;
  /** Botões a mais no mesmo grupo — o "sair" do VoePro. Use
   *  `classeDoBotaoDoSeletor` neles para ficarem iguais. */
  children?: React.ReactNode;
}) {
  const [paleta, setPaleta] = useState(false);
  const escuro = visual.tema === "escuro";

  function mudar(mudanca: Partial<Visual>) {
    pintarAgora({ ...visual, ...mudanca });
    aoMudar(mudanca);
  }

  return (
    <div className={`${s.seletor} ${emPe ? s.emPe : ""}`}>
      <div className={s.grupo}>
        <button
          type="button"
          className={s.bt}
          onClick={() => mudar({ tema: escuro ? "claro" : "escuro" })}
          aria-label={escuro ? "Usar o tema claro" : "Usar o tema escuro"}
          title={escuro ? "Tema claro" : "Tema escuro"}
        >
          {escuro ? <IconeSol /> : <IconeLua />}
        </button>
        <button
          type="button"
          className={`${s.bt} ${paleta ? s.btOn : ""}`}
          onClick={() => setPaleta(!paleta)}
          aria-label="Cor de destaque"
          aria-expanded={paleta}
          title="Cor de destaque"
        >
          <IconePaleta />
        </button>
        {children}
      </div>

      {paleta && (
        <>
          <button type="button" className={s.fundo} aria-label="Fechar a escolha de cor" onClick={() => setPaleta(false)} />
          <div className={s.paleta} role="dialog" aria-label="Cor de destaque">
            <b>Cor de destaque</b>
            <div className={s.cores}>
              {CORES.map((c) => (
                <button
                  key={c.chave}
                  type="button"
                  className={s.cor}
                  style={{ background: escuro ? c.escuro : c.claro }}
                  aria-label={c.nome}
                  aria-pressed={visual.cor === c.chave}
                  title={c.nome}
                  onClick={() => {
                    mudar({ cor: c.chave });
                    setPaleta(false);
                  }}
                />
              ))}
            </div>
            <small>{aviso}</small>
          </div>
        </>
      )}
    </div>
  );
}

/** Para um botão a mais dentro do seletor ficar igual aos dele. */
export const classeDoBotaoDoSeletor = s.bt;

const traco = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconeLua() {
  return (
    <svg {...traco}>
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
    </svg>
  );
}

function IconeSol() {
  return (
    <svg {...traco}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconePaleta() {
  return (
    <svg {...traco}>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z" />
      <circle cx="7.5" cy="11" r="1.2" />
      <circle cx="10.5" cy="7" r="1.2" />
      <circle cx="15" cy="7.5" r="1.2" />
    </svg>
  );
}
