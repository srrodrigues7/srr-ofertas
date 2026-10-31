"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

/**
 * O captcha da Cloudflare (Turnstile), o mesmo do VoePro e do MilesPro.
 *
 * O Auth de produção (o do MilesPro) exige a prova do captcha em todo login.
 * Sem ela, o Supabase recusa com "captcha protection: request disallowed".
 * Quem confere a prova é o próprio Supabase, não o Radar.
 *
 * A chave pública vem de NEXT_PUBLIC_TURNSTILE_SITE_KEY, e o endereço do
 * Radar precisa estar cadastrado no widget da Cloudflare. Sem a chave, não
 * desenha nada (o Auth de testes não exige captcha).
 *
 * Dentro de um formulário, o widget cria o campo escondido
 * `cf-turnstile-response` com a prova. A prova vale uma tentativa só; como a
 * tela de entrada recarrega depois de cada erro, sempre nasce uma nova.
 */

const CHAVE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

type Api = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Api;
  }
}

export default function Turnstile() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CHAVE) return;
    let id: string | undefined;
    const montar = () => {
      if (id || !ref.current || !window.turnstile) return;
      id = window.turnstile.render(ref.current, { sitekey: CHAVE, language: "pt-br", theme: "auto" });
      clearInterval(relogio);
    };
    const relogio = setInterval(montar, 200);
    montar();
    return () => {
      clearInterval(relogio);
      if (id) window.turnstile?.remove(id);
    };
  }, []);

  if (!CHAVE) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={ref} style={{ display: "flex", justifyContent: "center", minHeight: 65 }} />
    </>
  );
}
