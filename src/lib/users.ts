import "server-only";
import { db, hashPassword } from "./db";

export type Role = "admin" | "user";

export type UserRow = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  active: number;
  created_at: string;
};

/** Sem auth check: uso interno do login e do DAL. Telas usam as funções do DAL. */
export function findUserByEmail(email: string) {
  return db.prepare("select * from users where email = ?").get(email) as UserRow | undefined;
}

export function findUserById(id: number) {
  return db.prepare("select * from users where id = ?").get(id) as UserRow | undefined;
}

export function listUsersRaw() {
  return db
    .prepare("select id, email, name, role, active, created_at from users order by name")
    .all() as Omit<UserRow, "password_hash">[];
}

export function insertUser(u: { email: string; name: string; password: string; role: Role }) {
  return db
    .prepare("insert into users (email, name, password_hash, role) values (?, ?, ?, ?)")
    .run(u.email, u.name, hashPassword(u.password), u.role);
}

export function updateUserRaw(id: number, u: { name: string; role: Role; active: boolean; password?: string }) {
  db.prepare("update users set name = ?, role = ?, active = ? where id = ?").run(u.name, u.role, u.active ? 1 : 0, id);
  if (u.password) db.prepare("update users set password_hash = ? where id = ?").run(hashPassword(u.password), id);
}
