"use client";

import { useState } from "react";
import SeletorDeVisual from "./SeletorDeVisual";
import { COOKIE_COR, COOKIE_TEMA, type Visual } from "./visual";

/**
 * O seletor do kit para o sistema que não guarda nada na pessoa (o Radar de
 * ofertas): a escolha fica num cookie deste navegador, o mesmo que o layout lê
 * com `visualDoNavegador`. Uso: `<SeletorNoNavegador inicial={visual} />`,
 * com o `visual` que o layout calculou.
 */
export default function SeletorNoNavegador({ inicial, emPe }: { inicial: Visual; emPe?: boolean }) {
  const [visual, setVisual] = useState(inicial);

  function guardar(mudanca: Partial<Visual>) {
    setVisual({ ...visual, ...mudanca });
    const umAno = 60 * 60 * 24 * 365;
    if (mudanca.tema) document.cookie = `${COOKIE_TEMA}=${mudanca.tema}; path=/; max-age=${umAno}; SameSite=Lax`;
    if (mudanca.cor) document.cookie = `${COOKIE_COR}=${mudanca.cor}; path=/; max-age=${umAno}; SameSite=Lax`;
  }

  return <SeletorDeVisual visual={visual} aoMudar={guardar} emPe={emPe} aviso="Fica guardada neste navegador." />;
}
