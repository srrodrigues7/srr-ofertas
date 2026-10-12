"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Pede ao servidor a tela de novo a cada `segundos`, sem recarregar a página.
 *  Pausa enquanto a aba está escondida: ninguém está olhando. */
export default function Atualizador({ segundos }: { segundos: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, segundos * 1000);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [router, segundos]);

  return null;
}
