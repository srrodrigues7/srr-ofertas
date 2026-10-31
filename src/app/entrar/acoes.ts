"use server";

import { redirect } from "next/navigation";
import { destinoSeguro, quemEntrou } from "@/lib/acesso/acesso";
import { clienteSupabase } from "@/lib/acesso/supabase";

/** Entrar: e-mail e senha do MilesPro. Depois, a conta tem de estar liberada no Radar. */
export async function entrar(f: FormData) {
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const senha = String(f.get("senha") ?? "");
  const de = destinoSeguro(String(f.get("de") ?? ""));
  const voltar = (erro: string) => redirect(`/entrar?erro=${erro}${de !== "/" ? `&de=${encodeURIComponent(de)}` : ""}`);

  if (!email || !senha) voltar("campos");

  // A prova do captcha (Turnstile). Quem confere é o próprio Supabase: um robô
  // que pule esta tela também é barrado.
  const captchaToken = String(f.get("cf-turnstile-response") ?? "") || undefined;

  const supabase = await clienteSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (error) {
    const captcha = error.code === "captcha_failed" || /captcha/i.test(error.message);
    voltar(captcha ? "captcha" : "senha");
  }

  if (!(await quemEntrou())) {
    // Senha certa, mas a conta não está na lista de liberados: a sessão que o
    // Auth acabou de abrir é fechada na mesma hora.
    await supabase.auth.signOut();
    voltar("liberacao");
  }

  redirect(de);
}

export async function sair() {
  const supabase = await clienteSupabase();
  await supabase.auth.signOut();
  redirect("/entrar");
}
