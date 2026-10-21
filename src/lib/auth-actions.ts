"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { DUMMY_HASH, verifyPassword } from "./db";
import { findUserByEmail } from "./users";
import { createSession, deleteSession } from "./session";

const LoginSchema = z.object({
  // trim ANTES de validar: e-mail colado com espaço não deve ser recusado.
  email: z.string().trim().pipe(z.email("E-mail inválido")),
  password: z.string().min(1, "Informe a senha"),
  next: z.string().optional(),
});

export type LoginState = { error?: string; email?: string } | undefined;

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: String(formData.get("email") ?? "") };

  const { email, password, next } = parsed.data;
  const user = findUserByEmail(email);
  // Sempre roda o scrypt (hash falso sem usuário): o tempo de resposta não revela e-mails cadastrados.
  const passwordOk = verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  // Mesma mensagem para usuário inexistente e senha errada.
  if (!user || !user.active || !passwordOk) {
    return { error: "E-mail ou senha inválidos", email };
  }

  await createSession({ userId: user.id, role: user.role });
  redirect(safeNext(next));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

/**
 * Destino pós-login só dentro do portal (evita open redirect). Usa o parser de URL do padrão
 * WHATWG, o mesmo do navegador: `//host`, `/\host` e `/<TAB>/host` resolvem para outra origem e caem em "/".
 * Não exportada: todo export de arquivo 'use server' vira endpoint público.
 */
function safeNext(next: string | undefined) {
  if (!next) return "/";
  const base = "http://portal.invalid";
  const url = new URL(next, base);
  return url.origin === base ? url.pathname + url.search + url.hash : "/";
}
