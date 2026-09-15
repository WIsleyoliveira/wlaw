import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import * as erp from "@/lib/acoes";
import * as captura from "@/lib/captura/acoes";
import { lerPainelCaptura } from "@/lib/captura/painel";
import { ler } from "@/lib/db";
import { semente } from "@/lib/semente";
import { bancoPronto, sql } from "@/lib/sql";
import { hashToken, novoToken } from "@/lib/auth/senha";
import { gerarPfx } from "./apoio";

/** Monta FormData como o navegador enviaria. */
const form = (campos: Record<string, string | string[] | File>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) {
    if (Array.isArray(v)) v.forEach((x) => f.append(k, x));
    else f.append(k, v);
  }
  return f;
};

const MARCA = "[teste-automatizado]";
const umaLinha = async <T>(consulta: Promise<T[]>) => {
  const [linha] = await consulta;
  assert.ok(linha, "registro esperado não encontrado");
  return linha;
};

before(async () => {
  await bancoPronto();
  // As ações agora exigem sessão: entra como a administradora da semente (u1).
  const token = novoToken();
  await sql`insert into sessoes (id, usuario_id, expira_em) values (${hashToken(token)}, 'u1', now() + interval '1 hour')`;
  (globalThis as unknown as { __wlawCookies: Map<string, string> }).__wlawCookies.set("wlaw_sessao", token);
});

after(async () => {
  await sql.end({ timeout: 5 });
});

describe("leitura do banco (db.ler)", () => {
  it("devolve todas as coleções no formato antigo do JSON", async () => {
    const b = await ler();
    for (const colecao of ["processos", "pessoas", "atividades", "andamentos", "intimacoes", "usuarios", "tiposTarefa", "feriados"] as const) {
      assert.ok(b[colecao].length > 0, `${colecao} vazio`);
    }
    assert.ok(b.config.modeloIA, "modeloIA com a grafia do tipo");
    assert.equal("seq" in b.processos[0], false);
    assert.equal("resumoIa" in b.processos[0], false);
    assert.ok(Array.isArray(b.processos[0].responsaveis));
    assert.equal(typeof b.processos[0].valorCausa, "number");
  });
});

describe("ações do ERP", () => {
  it("processos: criar, editar, fases e monitoramento", async () => {
    let destino = "";
    await assert.rejects(
      erp.criarProcesso(form({ numero: "0000001-00.2026.8.14.0001", titulo: `${MARCA} processo`, clienteId: "p1", valorCausa: "12.345,67", monitorado: "on" })),
      (e: Error & { destino?: string }) => {
        destino = e.destino ?? "";
        return /^\/processos\/pr/.test(destino);
      },
    );
    const id = destino.split("/").pop()!;
    try {
      const p = await umaLinha(sql<{ pasta: string; valorCausa: number; fase: string; monitorado: boolean; clienteId: string }[]>`
        select pasta, valor_causa, fase, monitorado, cliente_id from processos where id = ${id}`);
      assert.match(p.pasta, /^PRO\.\d{7}$/);
      assert.deepEqual([p.valorCausa, p.fase, p.monitorado, p.clienteId], [12345.67, "Distribuição", true, "p1"]);

      await erp.atualizarProcesso(id, form({ titulo: "", fase: "Citação", situacao: "Suspenso", provisao: "1.000,00", exito: "80", observacoes: "obs" }));
      const editado = await umaLinha(sql<{ titulo: string; fase: string; situacao: string; provisao: number; exito: number }[]>`
        select titulo, fase, situacao, provisao, exito from processos where id = ${id}`);
      assert.deepEqual({ ...editado }, { titulo: `${MARCA} processo`, fase: "Citação", situacao: "Suspenso", provisao: 1000, exito: 80 });

      await erp.salvarFases(id, form({ fases: ["Inicial", " Perícia ", "Inicial", "", "Final"], faseAtual: "Inexistente" }));
      const fases = await umaLinha(sql<{ fases: string[]; fase: string }[]>`select fases, fase from processos where id = ${id}`);
      assert.deepEqual([fases.fases, fases.fase], [["Inicial", "Perícia", "Final"], "Inicial"], "remove vazias e duplicadas; fase inválida volta para a primeira");

      await erp.definirFase(id, "Perícia");
      await erp.definirFase(id, "Fase que não existe");
      assert.equal((await umaLinha(sql<{ fase: string }[]>`select fase from processos where id = ${id}`)).fase, "Perícia");

      await erp.alternarMonitoramento(id);
      assert.equal((await umaLinha(sql<{ monitorado: boolean }[]>`select monitorado from processos where id = ${id}`)).monitorado, false);
    } finally {
      await sql`delete from processos where id = ${id}`;
    }
  });

  it("pessoas e atendimentos", async () => {
    await erp.criarPessoa(form({ nome: `${MARCA} pessoa`, tipo: "Jurídica", cliente: "on" }));
    const pessoa = await umaLinha(sql<{ id: string; doc: string; cliente: boolean }[]>`select id, doc, cliente from pessoas where nome = ${`${MARCA} pessoa`}`);
    assert.deepEqual([pessoa.doc, pessoa.cliente], ["Não informado", true]);

    await erp.criarAtendimento(form({ clienteId: pessoa.id, assunto: MARCA, tipo: "Ligação" }));
    const atendimento = await umaLinha(sql<{ id: string; tipo: string }[]>`select id, tipo from atendimentos where assunto = ${MARCA}`);
    assert.equal(atendimento.tipo, "Ligação");
    await erp.excluirAtendimento(atendimento.id);
    assert.equal((await sql`select 1 from atendimentos where id = ${atendimento.id}`).length, 0);
    await sql`delete from pessoas where id = ${pessoa.id}`;
  });

  it("atividades: criar, mudar situação e excluir", async () => {
    await erp.criarAtividade(form({ descricao: MARCA, prevista: "20/09/2026", processoId: "pr1" }));
    const a = await umaLinha(sql<{ id: string; identificador: string; fatal: string; situacao: string; tipo: string }[]>`
      select id, identificador, fatal, situacao, tipo from atividades where descricao = ${MARCA}`);
    assert.match(a.identificador, /^TAR\.\d{7}$/);
    assert.deepEqual([a.fatal, a.situacao, a.tipo], ["20/09/2026", "Pendente", "Diligência"], "sem fatal, usa a prevista");
    await erp.mudarSituacaoAtividade(a.id, "Concluída");
    assert.equal((await umaLinha(sql<{ situacao: string }[]>`select situacao from atividades where id = ${a.id}`)).situacao, "Concluída");
    await erp.excluirAtividade(a.id);
    assert.equal((await sql`select 1 from atividades where id = ${a.id}`).length, 0);
  });

  it("andamentos: alternar lido e marcar todos", async () => {
    const antes = await sql<{ id: string; lido: boolean }[]>`select id, lido from andamentos`;
    try {
      const alvo = antes[0];
      await erp.alternarLido(alvo.id);
      assert.equal((await umaLinha(sql<{ lido: boolean }[]>`select lido from andamentos where id = ${alvo.id}`)).lido, !alvo.lido);
      await erp.marcarTodosLidos();
      assert.equal((await sql`select 1 from andamentos where not lido`).length, 0);
    } finally {
      for (const a of antes) await sql`update andamentos set lido = ${a.lido} where id = ${a.id}`;
    }
  });

  it("intimações: processar vira tarefa e arquivar alterna", async () => {
    const id = "i-teste-automatizado";
    await sql`insert into intimacoes ${sql({ id, disponibilizacao: "10/09/2026", publicacao: "11/09/2026", numero: "x", processoId: "pr1", descricao: MARCA, situacao: "Pendente", teor: "t" })}`;
    try {
      await erp.processarIntimacao(id, form({ tipo: "Contrarrazões", prevista: "20/09/2026", fatal: "22/09/2026", responsavel: "Wisley Oliveira" }));
      assert.equal((await umaLinha(sql<{ situacao: string }[]>`select situacao from intimacoes where id = ${id}`)).situacao, "Processada");
      const tarefa = await umaLinha(sql<{ id: string; identificador: string; tipo: string; processoId: string; descricao: string }[]>`
        select id, identificador, tipo, processo_id, descricao from atividades where descricao = ${MARCA}`);
      assert.match(tarefa.identificador, /^INT\./);
      assert.deepEqual([tarefa.tipo, tarefa.processoId], ["Contrarrazões", "pr1"]);
      await sql`delete from atividades where id = ${tarefa.id}`;

      await erp.arquivarIntimacao(id);
      assert.equal((await umaLinha(sql<{ situacao: string }[]>`select situacao from intimacoes where id = ${id}`)).situacao, "Arquivada");
      await erp.arquivarIntimacao(id);
      assert.equal((await umaLinha(sql<{ situacao: string }[]>`select situacao from intimacoes where id = ${id}`)).situacao, "Pendente");
    } finally {
      await sql`delete from intimacoes where id = ${id}`;
    }
  });

  it("timesheet, capturas e documentos", async () => {
    await erp.criarLancamento(form({ horas: "01:45", descricao: MARCA, faturavel: "on", processoId: "pr1" }));
    const l = await umaLinha(sql<{ id: string; minutos: number; faturavel: boolean }[]>`select id, minutos, faturavel from lancamentos where descricao = ${MARCA}`);
    assert.deepEqual([l.minutos, l.faturavel], [105, true]);
    await erp.excluirLancamento(l.id);
    assert.equal((await sql`select 1 from lancamentos where id = ${l.id}`).length, 0);

    await erp.criarCaptura(form({ numero: MARCA }));
    const c = await umaLinha(sql<{ id: string; status: string }[]>`select id, status from capturas where numero = ${MARCA}`);
    assert.equal(c.status, "Em andamento");
    await erp.excluirCaptura(c.id);
    assert.equal((await sql`select 1 from capturas where id = ${c.id}`).length, 0);

    await erp.criarDocumento(form({ nome: `${MARCA}.pdf`, processoId: "pr1" }));
    const d = await umaLinha(sql<{ id: string; tipo: string }[]>`select id, tipo from documentos where nome = ${`${MARCA}.pdf`}`);
    assert.equal(d.tipo, "Petição");
    await erp.excluirDocumento(d.id);
    assert.equal((await sql`select 1 from documentos where id = ${d.id}`).length, 0);
  });

  it("financeiro: cobrança, conta a pagar e contrato", async () => {
    await erp.criarCobranca(form({ descricao: MARCA, clienteId: "p1", vencimento: "30/09/2026", valor: "R$ 1.234,56" }));
    const cb = await umaLinha(sql<{ id: string; valor: number; situacao: string }[]>`select id, valor, situacao from cobrancas where descricao = ${MARCA}`);
    assert.deepEqual([cb.valor, cb.situacao], [1234.56, "Em aberto"]);
    await erp.quitarCobranca(cb.id);
    assert.equal((await umaLinha(sql<{ situacao: string }[]>`select situacao from cobrancas where id = ${cb.id}`)).situacao, "Pago");
    await sql`delete from cobrancas where id = ${cb.id}`;

    await erp.criarContaPagar(form({ fornecedor: MARCA, valor: "99,90" }));
    const cp = await umaLinha(sql<{ id: string; valor: number; categoria: string }[]>`select id, valor, categoria from contas_pagar where fornecedor = ${MARCA}`);
    assert.deepEqual([cp.valor, cp.categoria], [99.9, "Outros"]);
    await erp.pagarConta(cp.id);
    assert.equal((await umaLinha(sql<{ situacao: string }[]>`select situacao from contas_pagar where id = ${cp.id}`)).situacao, "Pago");
    await sql`delete from contas_pagar where id = ${cp.id}`;

    await erp.criarContrato(form({ titulo: MARCA, clienteId: "p1", valor: "2.500" }));
    const ct = await umaLinha(sql<{ id: string; valor: number; situacao: string }[]>`select id, valor, situacao from contratos where titulo = ${MARCA}`);
    assert.deepEqual([ct.valor, ct.situacao], [2500, "Habilitado"]);
    await erp.alternarContrato(ct.id);
    assert.equal((await umaLinha(sql<{ situacao: string }[]>`select situacao from contratos where id = ${ct.id}`)).situacao, "Desabilitado");
    await sql`delete from contratos where id = ${ct.id}`;
  });

  it("configurações: dados do escritório, equipe, tipos de tarefa e feriados", async () => {
    const antes = await umaLinha(sql<{ razaoSocial: string; modeloIa: string; cnpj: string }[]>`select razao_social, modelo_ia, cnpj from config`);
    try {
      await erp.salvarConfig(form({ razaoSocial: MARCA, modeloIA: "gemma3:4b" }));
      const depois = await umaLinha(sql<{ razaoSocial: string; modeloIa: string; cnpj: string }[]>`select razao_social, modelo_ia, cnpj from config`);
      assert.deepEqual({ ...depois }, { razaoSocial: MARCA, modeloIa: "gemma3:4b", cnpj: antes.cnpj }, "só altera os campos enviados");
      assert.equal((await ler()).config.modeloIA, "gemma3:4b");
    } finally {
      await sql`update config set razao_social = ${antes.razaoSocial}, modelo_ia = ${antes.modeloIa}`;
    }

    await erp.criarUsuario(form({ nome: MARCA, email: "t@t.com", grupo: "Cível" }));
    const u = await umaLinha(sql<{ id: string; grupos: string[]; ativo: boolean }[]>`select id, grupos, ativo from usuarios where nome = ${MARCA}`);
    assert.deepEqual([u.grupos, u.ativo], [["Cível"], true]);
    assert.equal((await erp.alternarUsuario(u.id)).ok, true);
    assert.equal((await umaLinha(sql<{ ativo: boolean }[]>`select ativo from usuarios where id = ${u.id}`)).ativo, false);
    await sql`delete from usuarios where id = ${u.id}`;

    await erp.criarTipoTarefa(form({ nome: MARCA, diasUteis: "on" }));
    const t = await umaLinha(sql<{ id: string; diasUteis: boolean; prazoPadrao: string }[]>`select id, dias_uteis, prazo_padrao from tipos_tarefa where nome = ${MARCA}`);
    assert.deepEqual([t.diasUteis, t.prazoPadrao], [true, "Livre"]);
    await erp.excluirTipoTarefa(t.id);

    await erp.criarFeriado(form({ data: "31/12/2026", nome: MARCA }));
    const f = await umaLinha(sql<{ id: string; tipo: string }[]>`select id, tipo from feriados where nome = ${MARCA}`);
    assert.equal(f.tipo, "Local");
    await erp.excluirFeriado(f.id);
    assert.equal((await sql`select 1 from feriados where id = ${f.id}`).length, 0);
  });
});

describe("ações de captura", () => {
  it("certificado: guarda cifrado, recusa duplicado e senha errada, remove", async () => {
    const arquivo = new File([gerarPfx({ cn: `${MARCA}:98765432100` })], "teste.pfx");
    assert.match((await captura.enviarCertificado(null, form({ arquivo, senha: "errada" })))!.mensagem, /senha incorreta/);
    assert.match((await captura.enviarCertificado(null, form({ senha: "x" })))!.mensagem, /Escolha o arquivo/);

    const ok = await captura.enviarCertificado(null, form({ arquivo, senha: "segredo", usuarioId: "" }));
    assert.equal(ok?.ok, true, ok?.mensagem);
    const cert = await umaLinha(sql<{ id: string; cpf: string; pfxCifrado: Buffer; senhaCifrada: Buffer }[]>`
      select id, cpf, pfx_cifrado, senha_cifrada from certificados where titular = ${MARCA}`);
    try {
      assert.equal(cert.cpf, "98765432100");
      assert.ok(!cert.senhaCifrada.toString("utf8").includes("segredo"), "senha nunca em claro");
      assert.match((await captura.enviarCertificado(null, form({ arquivo, senha: "segredo" })))!.mensagem, /já está cadastrado/);

      const painel = await lerPainelCaptura();
      const noPainel = painel.certificados.find((c) => c.id === cert.id);
      assert.ok(noPainel);
      assert.equal("pfxCifrado" in noPainel!, false, "o painel nunca carrega o arquivo cifrado");
    } finally {
      await captura.removerCertificado(cert.id);
    }
    assert.equal((await sql`select 1 from certificados where id = ${cert.id}`).length, 0);
  });

  it("conector: valida, salva, testa em modo simulado e remove", async () => {
    assert.match((await captura.salvarConector(null, form({ tribunal: "TJPA", url: "http://inseguro" })))!.mensagem, /https/);
    assert.match((await captura.salvarConector(null, form({ tribunal: "TJPA", url: "https://x.invalid", modo: "real" })))!.mensagem, /certificado/);

    const salvo = await captura.salvarConector(null, form({ id: "teste-auto", tribunal: "tjpa", grau: "1º grau", url: "https://simulado.invalid/intercomunicacao", modo: "simulado", consultarAvisos: "on", senhaConsultante: "abc" }));
    assert.equal(salvo?.ok, true, salvo?.mensagem);
    try {
      const linha = await umaLinha(sql<{ tribunal: string; senhaConsultanteCifrada: Buffer | null }[]>`
        select tribunal, senha_consultante_cifrada from mni_conectores where id = 'teste-auto'`);
      assert.equal(linha.tribunal, "TJPA");
      assert.ok(linha.senhaConsultanteCifrada && !linha.senhaConsultanteCifrada.toString("utf8").includes("abc"));

      const teste = await captura.testarConectorAgora("teste-auto");
      assert.equal(teste.ok, true);
      if (teste.ok) {
        assert.equal(teste.modo, "simulado");
        assert.deepEqual(teste.passos.map((p) => [p.operacao, p.ok]), [["consultarAlteracao", true], ["consultarProcesso", true], ["consultarAvisosPendentes", true]]);
      }
      assert.equal((await captura.testarConectorAgora("nao-existe")).ok, false);
    } finally {
      await captura.removerConector("teste-auto");
    }
  });

  it("alvos: desligar, religar e retomar pausa", async () => {
    const alvo = "oab:teste-auto/PA";
    await sql`insert into captura_estado (fonte, alvo, falhas_seguidas, pausado_ate) values ('djen', ${alvo}, 3, now() + interval '1 hour')`;
    try {
      await captura.alternarAlvo("djen", alvo);
      assert.equal((await umaLinha(sql<{ ativo: boolean }[]>`select ativo from captura_estado where alvo = ${alvo}`)).ativo, false);
      await captura.retomarAlvo("djen", alvo);
      const e = await umaLinha(sql<{ falhasSeguidas: number; pausadoAte: Date | null }[]>`select falhas_seguidas, pausado_ate from captura_estado where alvo = ${alvo}`);
      assert.deepEqual([e.falhasSeguidas, e.pausadoAte], [0, null]);
    } finally {
      await sql`delete from captura_estado where alvo = ${alvo}`;
    }
  });

  it("abrir teor só vale para avisos do MNI e a chave mestra confere", async () => {
    const r = await captura.abrirTeorAviso("i1");
    assert.equal(r?.ok, false);
    assert.match(r!.mensagem, /não veio de um aviso/);
    assert.equal(await captura.conferirChaveMestra(), true);
  });
});

describe("reiniciar dados de demonstração", () => {
  it("volta exatamente para a semente (roda por último)", async () => {
    await erp.reiniciarDados();
    const b = await ler();
    const s = semente();
    for (const colecao of ["processos", "pessoas", "atividades", "andamentos", "intimacoes", "usuarios", "feriados"] as const) {
      assert.equal(b[colecao].length, s[colecao].length, colecao);
    }
    assert.deepEqual(b.processos.map((p) => p.id), s.processos.map((p) => p.id), "ordem preservada");
    assert.equal(b.config.razaoSocial, s.config.razaoSocial);
  });
});
