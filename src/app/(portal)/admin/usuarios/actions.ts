"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { insertUser, updateUserRaw } from "@/lib/users";

export type UserState = { error?: string; values?: Record<string, string> } | undefined;

const name = z.string().trim().min(1, "Informe o nome").max(100, "Nome: máximo de 100 caracteres");
const role = z.enum(["admin", "user"], "Perfil inválido");
const password = z.string().min(8, "A senha deve ter no mínimo 8 caracteres").max(200);

const CreateSchema = z.object({ name, email: z.string().trim().max(200).pipe(z.email("E-mail inválido")), password, role });
const UpdateSchema = z.object({ name, role, active: z.boolean(), password: z.union([z.literal(""), password]) });

const values = (fd: FormData) => Object.fromEntries([...fd].filter(([k]) => k !== "password").map(([k, v]) => [k, String(v)]));

export async function createUserAction(_: UserState, formData: FormData): Promise<UserState> {
  await requireAdmin();
  const parsed = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: values(formData) };
  try {
    insertUser(parsed.data);
  } catch (e) {
    if (e instanceof Error && e.message.includes("UNIQUE")) return { error: "Já existe um usuário com este e-mail.", values: values(formData) };
    throw e;
  }
  redirect("/admin/usuarios");
}

export async function updateUserAction(id: number, _: UserState, formData: FormData): Promise<UserState> {
  const me = await requireAdmin();
  const parsed = UpdateSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    active: formData.get("active") === "on",
    password: formData.get("password") ?? "",
  });
  const v = { ...values(formData), active: formData.get("active") === "on" ? "on" : "" };
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: v };
  if (!Number.isInteger(id)) return { error: "Usuário inválido.", values: v };
  if (id === me.id && (!parsed.data.active || parsed.data.role !== "admin")) {
    return { error: "Você não pode desativar nem remover o perfil de administrador da sua própria conta.", values: v };
  }
  updateUserRaw(id, { ...parsed.data, password: parsed.data.password || undefined });
  redirect("/admin/usuarios");
}
