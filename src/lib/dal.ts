import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { findUserById } from "./users";

export type CurrentUser = { id: number; name: string; email: string; role: "admin" | "user" };

/** Toda leitura/escrita de dados começa aqui. Usuário inativo/removido perde acesso na hora. */
export const getUser = cache(async (): Promise<CurrentUser> => {
  const session = await readSession();
  if (!session) redirect("/login");
  const user = findUserById(session.userId);
  // Cookie válido mas usuário removido/inativo: precisa apagar o cookie, senão o proxy
  // devolve /login → / e vira loop. Server Component não apaga cookie; o route handler apaga.
  if (!user || !user.active) redirect("/api/sessao/encerrar");
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

export async function requireAdmin() {
  const user = await getUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
