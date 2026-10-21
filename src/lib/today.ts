import "server-only";
import { connection } from "next/server";

/** Fuso do negócio, não do servidor (host em UTC viraria o dia às 21h de Brasília). */
const TIME_ZONE = process.env.APP_TIME_ZONE ?? "America/Sao_Paulo";

/** Hoje como `yyyy-mm-dd` no fuso do negócio. `connection()` marca o render como dinâmico. */
export async function today() {
  await connection();
  return new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}
