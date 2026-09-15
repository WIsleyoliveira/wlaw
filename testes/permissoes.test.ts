import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { conferirSenha, hashSenha, hashToken, iguaisEmTempoConstante, novoToken, problemaNaSenha } from "@/lib/auth/senha";
import { NAV } from "@/lib/nav";
import { PERFIS, PERMISSOES, pode, recursoDaRota } from "@/lib/permissoes";

describe("matriz de permissões", () => {
  it("administrador pode tudo o que existe na matriz", () => {
    for (const [recurso, regra] of Object.entries(PERMISSOES)) {
      for (const acao of ["ver", "editar", "excluir"] as const) {
        if ((regra[acao] as string[]).length) assert.ok(pode("Administrador", recurso as keyof typeof PERMISSOES, acao), `${recurso}.${acao}`);
      }
    }
  });
  it("financeiro não vê processos nem configurações, mas vê e edita o financeiro", () => {
    assert.equal(pode("Financeiro", "processos"), false);
    assert.equal(pode("Financeiro", "configuracoes"), false);
    assert.equal(pode("Financeiro", "financeiro", "editar"), true);
    assert.equal(pode("Financeiro", "honorarios", "editar"), true);
    assert.equal(pode("Financeiro", "financeiro", "excluir"), false);
  });
  it("estagiário lê processos e cuida de tarefas, mas não edita processo, financeiro nem abre teor", () => {
    assert.equal(pode("Estagiário", "processos"), true);
    assert.equal(pode("Estagiário", "processos", "editar"), false);
    assert.equal(pode("Estagiário", "atividades", "editar"), true);
    assert.equal(pode("Estagiário", "atividades", "excluir"), false);
    assert.equal(pode("Estagiário", "intimacoes", "editar"), false);
    assert.equal(pode("Estagiário", "financeiro"), false);
    assert.equal(pode("Estagiário", "equipeTimesheet"), false);
  });
  it("advogado edita processos e intimações, vê monitoramento sem rodar captura", () => {
    assert.equal(pode("Advogado", "processos", "editar"), true);
    assert.equal(pode("Advogado", "intimacoes", "editar"), true);
    assert.equal(pode("Advogado", "monitoramento"), true);
    assert.equal(pode("Advogado", "monitoramento", "editar"), false);
    assert.equal(pode("Advogado", "indicadores"), false);
  });
  it("sem perfil não pode nada", () => {
    assert.equal(pode(null, "painel"), false);
    assert.equal(pode(undefined, "relatorios"), false);
  });
  it("toda rota do menu tem recurso e todo perfil vê pelo menos o painel", () => {
    for (const item of NAV.flatMap((g) => g.items)) {
      const recurso = recursoDaRota(item.href);
      assert.ok(item.href === "/" ? recurso === "painel" : recurso !== "painel", `rota sem recurso: ${item.href}`);
    }
    for (const perfil of PERFIS) assert.ok(pode(perfil, "painel"), perfil);
    assert.equal(recursoDaRota("/processos/pr1"), "processos");
    assert.equal(recursoDaRota("/processosx"), "painel");
    assert.equal(recursoDaRota("/atividades/kanban"), "atividades");
  });
});

describe("senhas e tokens", () => {
  it("scrypt: confere a senha certa, recusa a errada e usa sal diferente a cada hash", async () => {
    const a = await hashSenha("CorretaSenha123");
    const b = await hashSenha("CorretaSenha123");
    assert.match(a, /^scrypt\$16384\$8\$1\$/);
    assert.notEqual(a, b);
    assert.equal(await conferirSenha("CorretaSenha123", a), true);
    assert.equal(await conferirSenha("corretasenha123", a), false);
    assert.equal(await conferirSenha("qualquer", null), false);
    assert.equal(await conferirSenha("qualquer", "formato-invalido"), false);
  });
  it("política de senha", () => {
    assert.match(problemaNaSenha("curta1")!, /10 caracteres/);
    assert.match(problemaNaSenha("somenteletrasaqui")!, /letras e números/);
    assert.match(problemaNaSenha("1234567890123")!, /letras e números/);
    assert.match(problemaNaSenha("alanna2026xyz", "alanna@escritorio.adv.br")!, /e-mail/);
    assert.equal(problemaNaSenha("Processo2026Seguro", "alanna@escritorio.adv.br"), null);
  });
  it("tokens aleatórios, hash estável e comparação em tempo constante", () => {
    const t = novoToken();
    assert.match(t, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(t, novoToken());
    assert.equal(hashToken(t), hashToken(t));
    assert.match(hashToken(t), /^[0-9a-f]{64}$/);
    assert.equal(iguaisEmTempoConstante("abc", "abc"), true);
    assert.equal(iguaisEmTempoConstante("abc", "abd"), false);
    assert.equal(iguaisEmTempoConstante("abc", "abcd"), false);
  });
});
