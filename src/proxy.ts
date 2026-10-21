import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

// Checagem otimista (só cookie). Proteção real fica no DAL (src/lib/dal.ts).
const publicRoutes = ["/login"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublic = publicRoutes.includes(path);
  const session = await decrypt(req.cookies.get(SESSION_COOKIE)?.value);

  if (!isPublic && !session) {
    const url = new URL("/login", req.nextUrl);
    if (path !== "/") url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (isPublic && session) return NextResponse.redirect(new URL("/", req.nextUrl));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
