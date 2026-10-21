import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const path = process.env.SQLITE_PATH ?? "data/portal.db";
mkdirSync(dirname(path), { recursive: true });

// Reaproveita a conexão entre hot reloads do dev.
const g = globalThis as unknown as { portalDb?: DatabaseSync };
export const db = (g.portalDb ??= new DatabaseSync(path));

db.exec(`
  create table if not exists users (
    id integer primary key,
    email text not null unique collate nocase,
    name text not null,
    password_hash text not null,
    role text not null default 'user' check (role in ('admin', 'user')),
    active integer not null default 1,
    created_at text not null default current_timestamp
  )
`);

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, Buffer.from(salt, "hex"), 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Hash de uma senha aleatória: o login verifica contra ele quando o e-mail não existe (tempo constante). */
export const DUMMY_HASH = hashPassword(randomBytes(16).toString("hex"));

// Primeiro admin vem do .env quando a tabela está vazia.
const { n } = db.prepare("select count(*) as n from users").get() as { n: number };
if (n === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  db.prepare("insert into users (email, name, password_hash, role) values (?, ?, ?, 'admin')").run(
    process.env.ADMIN_EMAIL,
    "Administrador",
    hashPassword(process.env.ADMIN_PASSWORD),
  );
}
