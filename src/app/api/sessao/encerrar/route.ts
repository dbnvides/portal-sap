import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/session";

/**
 * Apaga o cookie e manda para o login. Usado pelo DAL quando o cookie é válido mas o usuário
 * foi desativado/removido: Server Component não pode apagar cookie, route handler pode.
 * GET de propósito (vem de redirect). Pior caso de uso indevido: deslogar alguém — sem risco de dados.
 */
export async function GET() {
  await deleteSession();
  redirect("/login");
}
