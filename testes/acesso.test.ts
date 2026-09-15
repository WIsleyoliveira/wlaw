import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import * as erp from "@/lib/acoes";
import * as acesso from "@/lib/auth/acoes";
import { hashSenha, hashToken, novoToken } from "@/lib/auth/senha";
import { exigirAcao, exigirApi, usuarioAtual, validarConvite } from "@/lib/auth/sessao";
import { ler } from "@/lib/db";
import { bancoPronto, sql } from "@/lib/sql";

const g = globalThis as unknown as { __wlawCookies: Map<string, string>; __wlawCabecalhos: Map<string, string> };
const SENHA = "SenhaDeTeste2026";
const IDS = { admin: "u-teste-admin", advogado: "u-teste-adv", estagiario: "u-teste-est", inativo: "u-teste-inativo" };
const PERFIL = { admin: "Administrador", advogado: "Advogado", estagiario: "Estagiário", inativo: "Advogado" } as const;
const email = (id: string) => `${id}@wlaw.test`;
const destino = (erro: unknown) => (erro as { destino?: string }).destino;
const status = (codigo: number) => (erro: unknown) => (erro as { status?: number }).status === codigo;
const form = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
};

async function comoUsuario(id: string | null) {
  g.__wlawCookies.delete("wlaw_sessao");
  if (!id) return null;
  const token = novoToken();
  await sql`insert into sessoes (id, usuario_id, expira_em) values (${hashToken(token)}, ${id}, now() + interval '1 hour')`;
  g.__wlawCookies.set("wlaw_sessao", token);
  return token;
}

async function sessoesDe(id: string) {
  const [{ total }] = await sql<{ total: number }[]>`select count(*)::int as total from sessoes where usuario_id = ${id}`;
  return total;
}

before(async () => {
  await bancoPronto();
  // IP próprio por execução: o limite por rede não acumula entre rodadas de teste.
  g.__wlawCabecalhos.set("x-forwarded-for", `10.77.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`);
  const hash = await hashSenha(SENHA);
  await sql`delete from usuarios where id in ${sql(Object.values(IDS))}`;
  for (const [papel, id] of Object.entries(IDS) as [keyof typeof IDS, string][]) {
    await sql`insert into usuarios ${sql({
      id, nome: `Teste ${papel}`, email: email(id), oab: "—", perfil: PERFIL[papel], grupos: [], ativo: papel !== "inativo", senhaHash: hash,
    })}`;
  }
});

after(async () => {
  g.__wlawCookies.delete("wlaw_sessao");
  await sql`delete from auditoria_acesso where email like '%@wlaw.test' or usuario_id like 'u-teste-%' or detalhes->>'para' like 'u-teste-%'`;
  await sql`delete from lancamentos where descricao like '[teste-acesso]%'`;
  await sql`delete from atividades where descricao like '[teste-acesso]%'`;
  await sql`delete from usuarios where id in ${sql(Object.values(IDS))}`;
  await sql.end({ timeout: 5 });
});

describe("login", () => {
  it("entra com a senha certa, respeita destino interno e cria sessão válida", async () => {
    await comoUsuario(null);
    await assert.rejects(acesso.entrar(null, form({ email: email(IDS.advogado).toUpperCase(), senha: SENHA, de: "/processos?q=x" })), (e) => destino(e) === "/processos?q=x");
    assert.ok(g.__wlawCookies.get("wlaw_sessao"));
    const eu = await usuarioAtual();
    assert.equal(eu?.id, IDS.advogado);
    assert.equal("senhaHash" in (eu ?? {}), false, "a sessão não carrega o hash");
  });

  it("recusa redirecionar para fora do sistema", async () => {
    for (const de of ["//evil.example", "https://evil.example", "/\\evil.example"]) {
      await comoUsuario(null);
      await assert.rejects(acesso.entrar(null, form({ email: email(IDS.advogado), senha: SENHA, de })), (e) => destino(e) === "/", de);
    }
  });

  it("mesma mensagem para senha errada, e-mail inexistente e usuário inativo", async () => {
    await comoUsuario(null);
    const casos = [
      { email: email(IDS.advogado), senha: "errada123errada" },
      { email: "ninguem@wlaw.test", senha: SENHA },
      { email: email(IDS.inativo), senha: SENHA },
    ];
    for (const c of casos) assert.equal((await acesso.entrar(null, form(c)))?.mensagem, "E-mail ou senha incorretos.");
    assert.equal(g.__wlawCookies.has("wlaw_sessao"), false);
  });

  it("bloqueia depois de 5 falhas, mesmo com a senha certa", async () => {
    await comoUsuario(null);
    for (let i = 0; i < 5; i++) await acesso.entrar(null, form({ email: email(IDS.estagiario), senha: "errada123errada" }));
    assert.match((await acesso.entrar(null, form({ email: email(IDS.estagiario), senha: SENHA })))!.mensagem, /bloqueado/);
    const [u] = await sql<{ bloqueadoAte: Date | null }[]>`select bloqueado_ate from usuarios where id = ${IDS.estagiario}`;
    assert.ok(u.bloqueadoAte && u.bloqueadoAte > new Date());
    await sql`update usuarios set bloqueado_ate = null, tentativas_falhas = 0 where id = ${IDS.estagiario}`;
    await assert.rejects(acesso.entrar(null, form({ email: email(IDS.estagiario), senha: SENHA })), (e) => destino(e) === "/");
    const [z] = await sql<{ tentativasFalhas: number }[]>`select tentativas_falhas from usuarios where id = ${IDS.estagiario}`;
    assert.equal(z.tentativasFalhas, 0, "login certo zera as falhas");
  });

  it("limita tentativas por rede", async () => {
    await comoUsuario(null);
    const ip = g.__wlawCabecalhos.get("x-forwarded-for")!;
    await sql`insert into auditoria_acesso (evento, ip, email) select 'login_falhou', ${ip}, 'rede@wlaw.test' from generate_series(1, 20)`;
    assert.match((await acesso.entrar(null, form({ email: email(IDS.advogado), senha: SENHA })))!.mensagem, /desta rede/);
    await sql`delete from auditoria_acesso where ip = ${ip}`;
  });

  it("sair apaga a sessão no banco e o cookie", async () => {
    const token = await comoUsuario(IDS.advogado);
    await assert.rejects(acesso.sair(), (e) => destino(e) === "/entrar");
    assert.equal(g.__wlawCookies.has("wlaw_sessao"), false);
    assert.equal((await sql`select 1 from sessoes where id = ${hashToken(token!)}`).length, 0);
  });

  it("sessão expirada ou de usuário desativado não vale", async () => {
    const expirado = novoToken();
    await sql`insert into sessoes (id, usuario_id, expira_em) values (${hashToken(expirado)}, ${IDS.advogado}, now() - interval '1 minute')`;
    g.__wlawCookies.set("wlaw_sessao", expirado);
    assert.equal(await usuarioAtual(), null);

    await comoUsuario(IDS.advogado);
    await sql`update usuarios set ativo = false where id = ${IDS.advogado}`;
    assert.equal(await usuarioAtual(), null);
    await sql`update usuarios set ativo = true where id = ${IDS.advogado}`;
    assert.equal((await usuarioAtual())?.id, IDS.advogado);
  });
});

describe("convites e senha", () => {
  it("administrador gera link de uso único; sessões antigas caem e a senha antiga para de valer", async () => {
    await comoUsuario(IDS.estagiario);
    assert.equal(await sessoesDe(IDS.estagiario) >= 1, true);

    await comoUsuario(IDS.admin);
    const r = await acesso.gerarLinkAcesso(IDS.estagiario);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.finalidade, "redefinir");
    const token = new URL(r.link).searchParams.get("token")!;
    assert.equal((await validarConvite(token))?.usuarioId, IDS.estagiario);

    assert.match((await acesso.definirSenha(null, form({ token, senha: "NovaSenha2026x", confirmacao: "outra" })))!.mensagem, /não conferem/);
    assert.match((await acesso.definirSenha(null, form({ token, senha: "fraca", confirmacao: "fraca" })))!.mensagem, /10 caracteres/);
    await assert.rejects(acesso.definirSenha(null, form({ token, senha: "NovaSenha2026x", confirmacao: "NovaSenha2026x" })), (e) => destino(e) === "/");
    assert.equal(await sessoesDe(IDS.estagiario), 1, "só a sessão criada agora");
    assert.equal(await validarConvite(token), null);
    assert.match((await acesso.definirSenha(null, form({ token, senha: "NovaSenha2026x", confirmacao: "NovaSenha2026x" })))!.mensagem, /inválido/);

    await comoUsuario(null);
    assert.equal((await acesso.entrar(null, form({ email: email(IDS.estagiario), senha: SENHA })))?.mensagem, "E-mail ou senha incorretos.");
    await assert.rejects(acesso.entrar(null, form({ email: email(IDS.estagiario), senha: "NovaSenha2026x" })), (e) => destino(e) === "/");
  });

  it("novo link invalida o anterior; só administrador gera", async () => {
    await comoUsuario(IDS.admin);
    const primeiro = await acesso.gerarLinkAcesso(IDS.advogado);
    const segundo = await acesso.gerarLinkAcesso(IDS.advogado);
    assert.ok(primeiro.ok && segundo.ok);
    if (!primeiro.ok || !segundo.ok) return;
    assert.equal(await validarConvite(new URL(primeiro.link).searchParams.get("token")!), null);
    assert.ok(await validarConvite(new URL(segundo.link).searchParams.get("token")!));
    assert.match((await acesso.gerarLinkAcesso(IDS.inativo)).ok ? "" : "inativo", /inativo/);

    await comoUsuario(IDS.advogado);
    await assert.rejects(acesso.gerarLinkAcesso(IDS.estagiario), status(403));
    await comoUsuario(null);
    await assert.rejects(acesso.gerarLinkAcesso(IDS.estagiario), status(401));
  });

  it("trocar senha confere a atual e encerra as outras sessões", async () => {
    const outra = novoToken();
    await sql`insert into sessoes (id, usuario_id, expira_em) values (${hashToken(outra)}, ${IDS.advogado}, now() + interval '1 hour')`;
    await comoUsuario(IDS.advogado);
    assert.match((await acesso.trocarSenha(null, form({ atual: "errada", nova: "TrocaSenha2026", confirmacao: "TrocaSenha2026" })))!.mensagem, /atual não confere/);
    assert.match((await acesso.trocarSenha(null, form({ atual: SENHA, nova: "TrocaSenha2026", confirmacao: "x" })))!.mensagem, /não conferem/);
    assert.equal((await acesso.trocarSenha(null, form({ atual: SENHA, nova: "TrocaSenha2026", confirmacao: "TrocaSenha2026" })))?.ok, true);
    assert.equal(await sessoesDe(IDS.advogado), 1);
    assert.equal((await sql`select 1 from sessoes where id = ${hashToken(outra)}`).length, 0);
    await sql`update usuarios set senha_hash = ${await hashSenha(SENHA)} where id = ${IDS.advogado}`;
  });
});

describe("administração da equipe", () => {
  it("administrador não se rebaixa nem se desativa; mudança de perfil vale na hora; desativar derruba a sessão", async () => {
    await comoUsuario(IDS.admin);
    assert.match((await acesso.mudarPerfil(IDS.admin, "Advogado"))!.mensagem, /próprio acesso/);
    assert.match((await acesso.mudarPerfil(IDS.advogado, "Chefe"))!.mensagem, /inválido/);
    assert.match((await erp.alternarUsuario(IDS.admin)).mensagem, /próprio acesso/);

    const tokenAdv = await comoUsuario(IDS.advogado);
    assert.ok(await exigirAcao("processos", "editar"));

    await comoUsuario(IDS.admin);
    assert.equal((await acesso.mudarPerfil(IDS.advogado, "Estagiário"))?.ok, true);
    g.__wlawCookies.set("wlaw_sessao", tokenAdv!);
    await assert.rejects(exigirAcao("processos", "editar"), status(403));

    await comoUsuario(IDS.admin);
    assert.equal((await erp.alternarUsuario(IDS.advogado)).ok, true);
    assert.equal(await sessoesDe(IDS.advogado), 0);
    g.__wlawCookies.set("wlaw_sessao", tokenAdv!);
    assert.equal(await usuarioAtual(), null);

    await sql`update usuarios set perfil = 'Advogado', ativo = true where id = ${IDS.advogado}`;
  });
});

describe("ações e APIs barram quem não pode", () => {
  it("sem sessão: 401 nas ações e nas APIs", async () => {
    await comoUsuario(null);
    await assert.rejects(erp.criarPessoa(form({ nome: "[teste-acesso] x" })), status(401));
    const api = await exigirApi("ia");
    assert.equal("resposta" in api ? api.resposta?.status : 0, 401);
  });

  it("estagiário cria tarefa em nome próprio, mas não edita processo, financeiro, configurações nem abre teor", async () => {
    await comoUsuario(IDS.estagiario);
    await erp.criarAtividade(form({ descricao: "[teste-acesso] tarefa do estagiário", prevista: "20/09/2026" }));
    const [tarefa] = await sql<{ responsavel: string }[]>`select responsavel from atividades where descricao = '[teste-acesso] tarefa do estagiário'`;
    assert.equal(tarefa.responsavel, "Teste estagiario");

    await assert.rejects(erp.atualizarProcesso("pr1", form({ titulo: "x" })), status(403));
    await assert.rejects(erp.criarCobranca(form({ descricao: "x", valor: "1" })), status(403));
    await assert.rejects(erp.salvarConfig(form({ razaoSocial: "x" })), status(403));
    await assert.rejects(erp.excluirAtividade("a1"), status(403));
    const api = await exigirApi("financeiro");
    assert.equal("resposta" in api ? api.resposta?.status : 0, 403);
    const apiIa = await exigirApi("ia", "editar");
    assert.ok("usuario" in apiIa, "estagiário usa a IA");
  });

  it("timesheet: sem permissão de equipe, lança só em nome próprio e não exclui horas alheias", async () => {
    await comoUsuario(IDS.advogado);
    await erp.criarLancamento(form({ horas: "00:30", descricao: "[teste-acesso] horas", responsavel: "Alanna Correa Halliday e Silva" }));
    const [meu] = await sql<{ id: string; responsavel: string }[]>`select id, responsavel from lancamentos where descricao = '[teste-acesso] horas'`;
    assert.equal(meu.responsavel, "Teste advogado");

    const [alheio] = await sql<{ id: string }[]>`select id from lancamentos where responsavel <> 'Teste advogado' limit 1`;
    if (alheio) await assert.rejects(erp.excluirLancamento(alheio.id), (e: unknown) => status(403)(e) && /próprias/.test((e as Error).message));
    await erp.excluirLancamento(meu.id);
    assert.equal((await sql`select 1 from lancamentos where id = ${meu.id}`).length, 0);
  });

  it("ler() nunca entrega hash de senha às telas", async () => {
    await comoUsuario(IDS.admin);
    const b = await ler();
    const testes = b.usuarios.filter((u) => u.id.startsWith("u-teste-"));
    assert.ok(testes.length >= 3);
    for (const u of b.usuarios) {
      assert.equal("senhaHash" in u, false);
      assert.equal(typeof u.temSenha, "boolean");
    }
  });
});

describe("primeiro acesso", () => {
  it("exige o código de instalação e só funciona enquanto ninguém tem senha", async () => {
    await comoUsuario(null);
    const codigo = process.env.WLAW_CODIGO_INSTALACAO!;
    assert.ok(codigo, "WLAW_CODIGO_INSTALACAO no .env");
    const pedido = (c: string, e = email(IDS.admin)) => form({ codigo: c, email: e, senha: "Primeira2026ok", confirmacao: "Primeira2026ok" });

    assert.match((await acesso.primeiroAcesso(null, pedido("codigo-errado")))!.mensagem, /incorreto/);
    assert.match((await acesso.primeiroAcesso(null, pedido(codigo)))!.mensagem, /já foi feito/, "usuários de teste já têm senha");

    const [{ reais }] = await sql<{ reais: number }[]>`
      select count(*)::int as reais from usuarios where senha_hash is not null and id not like 'u-teste-%'`;
    if (reais > 0) return; // o escritório já configurou senhas: não mexe nelas
    await sql`update usuarios set senha_hash = null where id like 'u-teste-%'`;
    try {
      assert.match((await acesso.primeiroAcesso(null, pedido(codigo, email(IDS.advogado))))!.mensagem, /administrador ativo/);
      await assert.rejects(acesso.primeiroAcesso(null, pedido(codigo)), (e) => destino(e) === "/");
      assert.equal((await usuarioAtual())?.id, IDS.admin);
      assert.match((await acesso.primeiroAcesso(null, pedido(codigo)))!.mensagem, /já foi feito/);
    } finally {
      await sql`update usuarios set senha_hash = ${await hashSenha(SENHA)} where id like 'u-teste-%'`;
    }
  });
});
