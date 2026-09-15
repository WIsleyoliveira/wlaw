import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { type Acao, type Recurso, pode } from "../permissoes";
import { bancoPronto, sql } from "../sql";
import type { Usuario } from "../tipos";
import { hashToken, novoToken } from "./senha";

export const COOKIE_SESSAO = "wlaw_sessao";
const DURACAO_MS = 7 * 86_400_000;

/** O que as telas podem saber de quem está logado — nada de hash, tentativas ou sessões. */
export type UsuarioSessao = { id: string; nome: string; email: string; perfil: Usuario["perfil"]; oab: string };

export class ErroAcesso extends Error {
  readonly status: 401 | 403;
  constructor(mensagem: string, status: 401 | 403) {
    super(mensagem);
    this.status = status;
  }
}

type LeitorCabecalho = { get(nome: string): string | null };

export function ipDe(h: LeitorCabecalho) {
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null;
}

export async function criarSessao(usuarioId: string) {
  const token = novoToken();
  const expira = new Date(Date.now() + DURACAO_MS);
  const h = await headers();
  await sql`
    insert into sessoes (id, usuario_id, expira_em, ip, agente)
    values (${hashToken(token)}, ${usuarioId}, ${expira}, ${ipDe(h)}, ${(h.get("user-agent") ?? "").slice(0, 300)})`;
  await sql`update usuarios set ultimo_acesso = now(), tentativas_falhas = 0, bloqueado_ate = null where id = ${usuarioId}`;
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expira,
  });
}

/** Conferência segura: a sessão precisa existir no banco, estar no prazo e o usuário estar ativo. */
export const usuarioAtual = cache(async (): Promise<UsuarioSessao | null> => {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  await bancoPronto();
  const id = hashToken(token);
  const [usuario] = await sql<UsuarioSessao[]>`
    select u.id, u.nome, u.email, u.perfil, u.oab
    from sessoes s join usuarios u on u.id = s.usuario_id
    where s.id = ${id} and s.expira_em > now() and u.ativo`;
  if (usuario) await sql`update sessoes set ultimo_uso = now() where id = ${id} and ultimo_uso < now() - interval '5 minutes'`;
  return usuario ?? null;
});

export async function exigirUsuario() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  return usuario;
}

/** Páginas: sem sessão vai para /entrar; sem permissão, para /sem-acesso. */
export async function exigirPagina(recurso: Recurso, acao: Acao = "ver") {
  const usuario = await exigirUsuario();
  if (!pode(usuario.perfil, recurso, acao)) redirect("/sem-acesso");
  return usuario;
}

/** Server Actions: a interface já esconde o que o perfil não pode; isto barra chamadas forjadas. */
export async function exigirAcao(recurso: Recurso, acao: Acao) {
  const usuario = await usuarioAtual();
  if (!usuario) throw new ErroAcesso("Sua sessão expirou. Entre novamente.", 401);
  if (!pode(usuario.perfil, recurso, acao)) throw new ErroAcesso("Seu perfil não tem permissão para esta ação.", 403);
  return usuario;
}

/** Route Handlers: devolve o usuário ou a resposta 401/403 pronta. */
export async function exigirApi(recurso: Recurso, acao: Acao = "ver") {
  const usuario = await usuarioAtual();
  if (!usuario) return { resposta: Response.json({ erro: "Não autenticado." }, { status: 401 }) } as const;
  if (!pode(usuario.perfil, recurso, acao)) return { resposta: Response.json({ erro: "Sem permissão." }, { status: 403 }) } as const;
  return { usuario } as const;
}

export async function existeSenhaCadastrada() {
  await bancoPronto();
  const [{ existe }] = await sql<{ existe: boolean }[]>`select exists(select 1 from usuarios where senha_hash is not null) as existe`;
  return existe;
}

export async function validarConvite(token: string) {
  if (!token) return null;
  await bancoPronto();
  const [convite] = await sql<{ usuarioId: string; nome: string; email: string; finalidade: "primeiro-acesso" | "redefinir"; expiraEm: Date }[]>`
    select c.usuario_id, u.nome, u.email, c.finalidade, c.expira_em
    from convites c join usuarios u on u.id = c.usuario_id
    where c.token_hash = ${hashToken(token)} and c.usado_em is null and c.expira_em > now() and u.ativo`;
  return convite ?? null;
}
