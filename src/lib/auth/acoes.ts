"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PERFIS, type Perfil } from "../permissoes";
import { bancoPronto, sql } from "../sql";
import { conferirSenha, hashSenha, hashToken, iguaisEmTempoConstante, novoToken, problemaNaSenha } from "./senha";
import { COOKIE_SESSAO, criarSessao, exigirAcao, exigirUsuario, ipDe } from "./sessao";

export type EstadoAcesso = { ok: boolean; mensagem: string } | null;

const MAX_FALHAS = 5;
const BLOQUEIO_MINUTOS = 15;
const MAX_FALHAS_POR_IP = 20;
const VALIDADE_CONVITE_HORAS = 72;

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function registrar(evento: string, usuarioId: string | null, email: string | null, detalhes: Record<string, string> = {}) {
  const h = await headers();
  await sql`
    insert into auditoria_acesso (usuario_id, email, evento, ip, detalhes)
    values (${usuarioId}, ${email}, ${evento}, ${ipDe(h)}, ${sql.json(detalhes)})`;
}

/** Só aceita caminho interno: impede redirecionar para outro site depois do login. */
function destinoSeguro(valor: FormDataEntryValue | null) {
  const d = typeof valor === "string" ? valor : "";
  return d.startsWith("/") && !d.startsWith("//") && !d.startsWith("/\\") && !d.startsWith("/entrar") ? d : "/";
}

export async function entrar(_anterior: EstadoAcesso, f: FormData): Promise<EstadoAcesso> {
  const email = texto(f, "email").toLowerCase();
  const senha = String(f.get("senha") ?? "");
  if (!email || !senha) return { ok: false, mensagem: "Informe e-mail e senha." };
  await bancoPronto();

  const ip = ipDe(await headers());
  if (ip) {
    const [{ falhas }] = await sql<{ falhas: number }[]>`
      select count(*)::int as falhas from auditoria_acesso
      where evento = 'login_falhou' and ip = ${ip} and criado_em > now() - interval '15 minutes'`;
    if (falhas >= MAX_FALHAS_POR_IP) return { ok: false, mensagem: "Muitas tentativas a partir desta rede. Aguarde 15 minutos." };
  }

  const [usuario] = await sql<{ id: string; senhaHash: string | null; ativo: boolean; bloqueadoAte: Date | null }[]>`
    select id, senha_hash, ativo, bloqueado_ate from usuarios where lower(email) = ${email}`;
  const senhaCorreta = await conferirSenha(senha, usuario?.senhaHash);

  if (usuario?.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
    await registrar("login_bloqueado", usuario.id, email);
    const hora = usuario.bloqueadoAte.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Belem" });
    return { ok: false, mensagem: `Acesso bloqueado por excesso de tentativas. Tente de novo às ${hora}.` };
  }

  if (!usuario || !usuario.ativo || !senhaCorreta) {
    if (usuario) {
      await sql`
        update usuarios set tentativas_falhas = tentativas_falhas + 1,
          bloqueado_ate = case when tentativas_falhas + 1 >= ${MAX_FALHAS} then now() + make_interval(mins => ${BLOQUEIO_MINUTOS}) else bloqueado_ate end
        where id = ${usuario.id}`;
    }
    await registrar("login_falhou", usuario?.id ?? null, email);
    // Mesma mensagem para e-mail inexistente, usuário inativo ou senha errada.
    return { ok: false, mensagem: "E-mail ou senha incorretos." };
  }

  await criarSessao(usuario.id);
  await registrar("login", usuario.id, email);
  redirect(destinoSeguro(f.get("de")));
}

export async function sair() {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (token) {
    const [sessao] = await sql<{ usuarioId: string }[]>`delete from sessoes where id = ${hashToken(token)} returning usuario_id`;
    if (sessao) await registrar("logout", sessao.usuarioId, null);
  }
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/entrar");
}

export async function sairDeTodosOsDispositivos() {
  const usuario = await exigirUsuario();
  await sql`delete from sessoes where usuario_id = ${usuario.id}`;
  await registrar("logout_todos", usuario.id, usuario.email);
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/entrar");
}

export async function primeiroAcesso(_anterior: EstadoAcesso, f: FormData): Promise<EstadoAcesso> {
  const esperado = process.env.WLAW_CODIGO_INSTALACAO ?? "";
  if (!esperado) return { ok: false, mensagem: "Defina WLAW_CODIGO_INSTALACAO no .env do servidor." };
  if (!iguaisEmTempoConstante(texto(f, "codigo"), esperado)) {
    await registrar("primeiro_acesso_codigo_invalido", null, texto(f, "email"));
    return { ok: false, mensagem: "Código de instalação incorreto." };
  }
  await bancoPronto();
  const [{ existe }] = await sql<{ existe: boolean }[]>`select exists(select 1 from usuarios where senha_hash is not null) as existe`;
  if (existe) return { ok: false, mensagem: "O primeiro acesso já foi feito. Entre com sua senha." };

  const email = texto(f, "email").toLowerCase();
  const [admin] = await sql<{ id: string }[]>`
    select id from usuarios where lower(email) = ${email} and ativo and perfil = 'Administrador'`;
  if (!admin) return { ok: false, mensagem: "Este e-mail não é de um administrador ativo cadastrado." };

  const senha = String(f.get("senha") ?? "");
  if (senha !== String(f.get("confirmacao") ?? "")) return { ok: false, mensagem: "As senhas não conferem." };
  const problema = problemaNaSenha(senha, email);
  if (problema) return { ok: false, mensagem: problema };

  await sql`update usuarios set senha_hash = ${await hashSenha(senha)}, senha_definida_em = now() where id = ${admin.id}`;
  await criarSessao(admin.id);
  await registrar("primeiro_acesso", admin.id, email);
  redirect("/");
}

export async function definirSenha(_anterior: EstadoAcesso, f: FormData): Promise<EstadoAcesso> {
  await bancoPronto();
  const token = texto(f, "token");
  const [convite] = await sql<{ usuarioId: string; email: string }[]>`
    select c.usuario_id, u.email from convites c join usuarios u on u.id = c.usuario_id
    where c.token_hash = ${hashToken(token)} and c.usado_em is null and c.expira_em > now() and u.ativo`;
  if (!convite) return { ok: false, mensagem: "Link inválido, já usado ou expirado. Peça um novo ao administrador." };

  const senha = String(f.get("senha") ?? "");
  if (senha !== String(f.get("confirmacao") ?? "")) return { ok: false, mensagem: "As senhas não conferem." };
  const problema = problemaNaSenha(senha, convite.email);
  if (problema) return { ok: false, mensagem: problema };

  const hash = await hashSenha(senha);
  await sql.begin(async (tx) => {
    await tx`update usuarios set senha_hash = ${hash}, senha_definida_em = now(), tentativas_falhas = 0, bloqueado_ate = null where id = ${convite.usuarioId}`;
    await tx`update convites set usado_em = now() where usuario_id = ${convite.usuarioId} and usado_em is null`;
    await tx`delete from sessoes where usuario_id = ${convite.usuarioId}`;
  });
  await criarSessao(convite.usuarioId);
  await registrar("senha_definida", convite.usuarioId, convite.email);
  redirect("/");
}

export async function trocarSenha(_anterior: EstadoAcesso, f: FormData): Promise<EstadoAcesso> {
  const usuario = await exigirUsuario();
  const [atual] = await sql<{ senhaHash: string | null }[]>`select senha_hash from usuarios where id = ${usuario.id}`;
  if (!(await conferirSenha(String(f.get("atual") ?? ""), atual?.senhaHash))) {
    await registrar("troca_senha_falhou", usuario.id, usuario.email);
    return { ok: false, mensagem: "A senha atual não confere." };
  }
  const nova = String(f.get("nova") ?? "");
  if (nova !== String(f.get("confirmacao") ?? "")) return { ok: false, mensagem: "As senhas novas não conferem." };
  const problema = problemaNaSenha(nova, usuario.email);
  if (problema) return { ok: false, mensagem: problema };

  await sql`update usuarios set senha_hash = ${await hashSenha(nova)}, senha_definida_em = now() where id = ${usuario.id}`;
  // Troca de senha derruba as outras sessões; esta continua com uma sessão nova.
  await sql`delete from sessoes where usuario_id = ${usuario.id}`;
  await criarSessao(usuario.id);
  await registrar("senha_trocada", usuario.id, usuario.email);
  return { ok: true, mensagem: "Senha alterada. As outras sessões foram encerradas." };
}

/* ---------------- Administração da equipe ---------------- */

export async function gerarLinkAcesso(usuarioId: string): Promise<{ ok: true; link: string; expiraEm: string; finalidade: string } | { ok: false; mensagem: string }> {
  const admin = await exigirAcao("configuracoes", "editar");
  const [alvo] = await sql<{ email: string; ativo: boolean; senhaHash: string | null }[]>`
    select email, ativo, senha_hash from usuarios where id = ${usuarioId}`;
  if (!alvo) return { ok: false, mensagem: "Usuário não encontrado." };
  if (!alvo.ativo) return { ok: false, mensagem: "Ative o usuário antes de gerar o link." };
  if (!alvo.email || !alvo.email.includes("@")) return { ok: false, mensagem: "Cadastre um e-mail válido para este usuário." };

  const finalidade = alvo.senhaHash ? "redefinir" : "primeiro-acesso";
  const token = novoToken();
  const expira = new Date(Date.now() + VALIDADE_CONVITE_HORAS * 3_600_000);
  await sql`update convites set usado_em = now() where usuario_id = ${usuarioId} and usado_em is null`;
  await sql`
    insert into convites (token_hash, usuario_id, finalidade, criado_por, expira_em)
    values (${hashToken(token)}, ${usuarioId}, ${finalidade}, ${admin.id}, ${expira})`;
  await registrar("link_acesso_gerado", admin.id, admin.email, { para: usuarioId, finalidade });

  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost"}`;
  return {
    ok: true,
    link: `${origem}/definir-senha?token=${token}`,
    expiraEm: expira.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Belem" }),
    finalidade,
  };
}

export async function encerrarSessoesDoUsuario(usuarioId: string) {
  const admin = await exigirAcao("configuracoes", "editar");
  await sql`delete from sessoes where usuario_id = ${usuarioId}`;
  await registrar("sessoes_encerradas", admin.id, admin.email, { para: usuarioId });
  revalidatePath("/configuracoes");
}

export async function mudarPerfil(usuarioId: string, perfil: string): Promise<EstadoAcesso> {
  const admin = await exigirAcao("configuracoes", "editar");
  if (!PERFIS.includes(perfil as Perfil)) return { ok: false, mensagem: "Perfil inválido." };
  if (usuarioId === admin.id && perfil !== "Administrador") {
    return { ok: false, mensagem: "Você não pode tirar o próprio acesso de administrador. Peça a outro administrador." };
  }
  const [{ outros }] = await sql<{ outros: number }[]>`
    select count(*)::int as outros from usuarios where perfil = 'Administrador' and ativo and id <> ${usuarioId}`;
  if (perfil !== "Administrador" && outros === 0) return { ok: false, mensagem: "O escritório precisa de pelo menos um administrador ativo." };

  await sql`update usuarios set perfil = ${perfil} where id = ${usuarioId}`;
  await registrar("perfil_alterado", admin.id, admin.email, { para: usuarioId, perfil });
  revalidatePath("/", "layout");
  return { ok: true, mensagem: `Perfil alterado para ${perfil}.` };
}
