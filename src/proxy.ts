import { NextResponse, type NextRequest } from "next/server";

const PUBLICAS = ["/entrar", "/primeiro-acesso", "/definir-senha"];

/**
 * Checagem otimista: só olha se o cookie existe. A conferência de verdade (sessão no banco,
 * usuário ativo, permissão) acontece em cada página, Server Action e Route Handler.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Protegida pelo CRON_SECRET, chamada por agendador sem navegador.
  if (pathname.startsWith("/api/robo/")) return NextResponse.next();
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (req.cookies.has("wlaw_sessao")) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const destino = new URL("/entrar", req.url);
  if (pathname !== "/") destino.searchParams.set("de", `${pathname}${search}`);
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)"],
};
