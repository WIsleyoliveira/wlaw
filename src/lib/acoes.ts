"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ErroAcesso, exigirAcao } from "./auth/sessao";
import { novoId, reiniciar } from "./db";
import { pode } from "./permissoes";
import { bancoPronto, sql } from "./sql";
import { FASES_PADRAO, type SituacaoAtividade } from "./tipos";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const numero = (f: FormData, k: string) => {
  const bruto = texto(f, k).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(bruto);
  return Number.isFinite(n) ? n : 0;
};

async function db() {
  await bancoPronto();
  return sql;
}

function atualizarTudo() {
  revalidatePath("/", "layout");
}

/* ---------------- Processos ---------------- */

export async function criarProcesso(f: FormData) {
  const eu = await exigirAcao("processos", "editar");
  const s = await db();
  const id = novoId("pr");
  const [{ proximo }] = await s<{ proximo: number }[]>`
    select coalesce(max(nullif(regexp_replace(pasta, '\\D', '', 'g'), '')::int), 291) + 1 as proximo from processos`;
  await s`insert into processos ${s({
    id,
    pasta: `PRO.${String(proximo).padStart(7, "0")}`,
    numero: texto(f, "numero"),
    titulo: texto(f, "titulo") || "Processo sem título",
    clienteId: texto(f, "clienteId") || null,
    papel: texto(f, "papel") || "Autor",
    contraria: texto(f, "contraria"),
    tribunal: texto(f, "tribunal"),
    orgao: texto(f, "orgao"),
    comarca: texto(f, "comarca"),
    instancia: texto(f, "instancia") || "1ª",
    classe: texto(f, "classe"),
    assunto: texto(f, "assunto"),
    juiz: "",
    distribuido: new Date().toLocaleDateString("pt-BR"),
    valorCausa: numero(f, "valorCausa"),
    provisao: numero(f, "provisao"),
    exito: Number(texto(f, "exito")) || 50,
    fase: "Distribuição",
    situacao: texto(f, "situacao") || "Ativo",
    responsaveis: [texto(f, "responsavel") || eu.nome],
    grupo: texto(f, "grupo") || "Cível",
    marcadores: [],
    monitorado: f.get("monitorado") === "on",
    observacoes: texto(f, "observacoes"),
    criadoEm: new Date().toISOString(),
  })}`;
  atualizarTudo();
  redirect(`/processos/${id}`);
}

export async function atualizarProcesso(id: string, f: FormData) {
  await exigirAcao("processos", "editar");
  const s = await db();
  const [p] = await s<{ titulo: string; fase: string; situacao: string; exito: number }[]>`
    select titulo, fase, situacao, exito from processos where id = ${id}`;
  if (!p) return;
  await s`update processos set ${s({
    titulo: texto(f, "titulo") || p.titulo,
    fase: texto(f, "fase") || p.fase,
    situacao: texto(f, "situacao") || p.situacao,
    provisao: numero(f, "provisao"),
    exito: Number(texto(f, "exito")) || p.exito,
    observacoes: texto(f, "observacoes"),
  })} where id = ${id}`;
  atualizarTudo();
}

export async function salvarFases(id: string, f: FormData) {
  await exigirAcao("processos", "editar");
  const fases = [...new Set(f.getAll("fases").map((v) => String(v).trim()).filter(Boolean))];
  if (fases.length === 0) return;
  const atual = texto(f, "faseAtual");
  const s = await db();
  const [p] = await s<{ fase: string }[]>`select fase from processos where id = ${id}`;
  if (!p) return;
  const fase = fases.includes(atual) ? atual : fases.includes(p.fase) ? p.fase : fases[0];
  await s`update processos set fases = ${fases}, fase = ${fase} where id = ${id}`;
  atualizarTudo();
}

export async function definirFase(id: string, fase: string) {
  await exigirAcao("processos", "editar");
  const s = await db();
  const [p] = await s<{ fases: string[] | null }[]>`select fases from processos where id = ${id}`;
  if (p && (p.fases?.length ? p.fases : FASES_PADRAO).includes(fase)) {
    await s`update processos set fase = ${fase} where id = ${id}`;
  }
  atualizarTudo();
}

export async function alternarMonitoramento(id: string) {
  await exigirAcao("processos", "editar");
  const s = await db();
  await s`update processos set monitorado = not monitorado where id = ${id}`;
  atualizarTudo();
}

/* ---------------- Pessoas ---------------- */

export async function criarPessoa(f: FormData) {
  await exigirAcao("pessoas", "editar");
  const s = await db();
  await s`insert into pessoas ${s({
    id: novoId("p"),
    nome: texto(f, "nome"),
    tipo: texto(f, "tipo") || "Física",
    doc: texto(f, "doc") || "Não informado",
    email: texto(f, "email") || "—",
    telefone: texto(f, "telefone") || "—",
    cidade: texto(f, "cidade") || "—",
    cliente: f.get("cliente") === "on",
    criadoEm: new Date().toISOString(),
  })}`;
  atualizarTudo();
}

/* ---------------- Atividades ---------------- */

export async function criarAtividade(f: FormData) {
  const eu = await exigirAcao("atividades", "editar");
  const s = await db();
  const [{ total }] = await s<{ total: number }[]>`select count(*)::int as total from atividades`;
  await s`insert into atividades ${s({
    id: novoId("a"),
    identificador: `TAR.${String(total + 250).padStart(7, "0")}`,
    tipo: texto(f, "tipo") || "Diligência",
    descricao: texto(f, "descricao"),
    processoId: texto(f, "processoId") || null,
    prevista: texto(f, "prevista"),
    fatal: texto(f, "fatal") || texto(f, "prevista"),
    responsavel: texto(f, "responsavel") || eu.nome,
    situacao: (texto(f, "situacao") || "Pendente") as SituacaoAtividade,
    criadoEm: new Date().toISOString(),
  })}`;
  atualizarTudo();
}

export async function mudarSituacaoAtividade(id: string, situacao: SituacaoAtividade) {
  await exigirAcao("atividades", "editar");
  const s = await db();
  await s`update atividades set situacao = ${situacao} where id = ${id}`;
  atualizarTudo();
}

export async function excluirAtividade(id: string) {
  await exigirAcao("atividades", "excluir");
  const s = await db();
  await s`delete from atividades where id = ${id}`;
  atualizarTudo();
}

/* ---------------- Andamentos ---------------- */

export async function alternarLido(id: string) {
  await exigirAcao("andamentos", "editar");
  const s = await db();
  await s`update andamentos set lido = not lido where id = ${id}`;
  atualizarTudo();
}

export async function marcarTodosLidos() {
  await exigirAcao("andamentos", "editar");
  const s = await db();
  await s`update andamentos set lido = true where not lido`;
  atualizarTudo();
}

/* ---------------- Intimações ---------------- */

export async function processarIntimacao(id: string, f: FormData) {
  const eu = await exigirAcao("intimacoes", "editar");
  const s = await db();
  await s.begin(async (tx) => {
    const [i] = await tx<{ processoId: string | null; descricao: string }[]>`
      update intimacoes set situacao = 'Processada' where id = ${id} returning processo_id, descricao`;
    if (!i) return;
    const [{ total }] = await tx<{ total: number }[]>`select count(*)::int as total from atividades`;
    await tx`insert into atividades ${tx({
      id: novoId("a"),
      identificador: `INT.${String(total + 250).padStart(7, "0")}`,
      tipo: texto(f, "tipo") || "Manifestação",
      descricao: texto(f, "descricao") || i.descricao,
      processoId: i.processoId,
      prevista: texto(f, "prevista"),
      fatal: texto(f, "fatal") || texto(f, "prevista"),
      responsavel: texto(f, "responsavel") || eu.nome,
      situacao: "Pendente",
      criadoEm: new Date().toISOString(),
    })}`;
  });
  atualizarTudo();
}

export async function arquivarIntimacao(id: string) {
  await exigirAcao("intimacoes", "editar");
  const s = await db();
  await s`update intimacoes set situacao = case when situacao = 'Arquivada' then 'Pendente' else 'Arquivada' end where id = ${id}`;
  atualizarTudo();
}

/* ---------------- Monitoramento ---------------- */

export async function criarCaptura(f: FormData) {
  await exigirAcao("monitoramento", "editar");
  const s = await db();
  await s`insert into capturas ${s({
    id: novoId("c"),
    data: new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
    numero: texto(f, "numero"),
    orgao: texto(f, "orgao") || "Tribunal de Justiça do Pará",
    instancia: texto(f, "instancia") || "1ª",
    status: "Em andamento",
  })}`;
  atualizarTudo();
}

export async function excluirCaptura(id: string) {
  await exigirAcao("monitoramento", "excluir");
  const s = await db();
  await s`delete from capturas where id = ${id}`;
  atualizarTudo();
}

/* ---------------- Timesheet ---------------- */

export async function criarLancamento(f: FormData) {
  const eu = await exigirAcao("timesheet", "editar");
  const [h, m] = (texto(f, "horas") || "00:00").split(":").map(Number);
  const s = await db();
  await s`insert into lancamentos ${s({
    id: novoId("l"),
    data: texto(f, "data") || new Date().toLocaleDateString("pt-BR"),
    minutos: (h || 0) * 60 + (m || 0),
    faturavel: f.get("faturavel") === "on",
    responsavel: pode(eu.perfil, "equipeTimesheet", "editar") ? texto(f, "responsavel") || eu.nome : eu.nome,
    processoId: texto(f, "processoId") || null,
    descricao: texto(f, "descricao"),
  })}`;
  atualizarTudo();
}

export async function excluirLancamento(id: string) {
  const eu = await exigirAcao("timesheet", "excluir");
  const s = await db();
  const [lancamento] = await s<{ responsavel: string }[]>`select responsavel from lancamentos where id = ${id}`;
  if (lancamento && lancamento.responsavel !== eu.nome && !pode(eu.perfil, "equipeTimesheet", "excluir")) {
    throw new ErroAcesso("Você só pode excluir as próprias horas.", 403);
  }
  await s`delete from lancamentos where id = ${id}`;
  atualizarTudo();
}

/* ---------------- Financeiro ---------------- */

export async function criarCobranca(f: FormData) {
  await exigirAcao("financeiro", "editar");
  const s = await db();
  await s`insert into cobrancas ${s({
    id: novoId("cb"),
    descricao: texto(f, "descricao"),
    clienteId: texto(f, "clienteId") || null,
    vencimento: texto(f, "vencimento"),
    valor: numero(f, "valor"),
    situacao: "Em aberto",
  })}`;
  atualizarTudo();
}

export async function quitarCobranca(id: string) {
  await exigirAcao("financeiro", "editar");
  const s = await db();
  await s`update cobrancas set situacao = case when situacao = 'Pago' then 'Em aberto' else 'Pago' end where id = ${id}`;
  atualizarTudo();
}

export async function criarContaPagar(f: FormData) {
  await exigirAcao("financeiro", "editar");
  const s = await db();
  await s`insert into contas_pagar ${s({
    id: novoId("cp"),
    fornecedor: texto(f, "fornecedor"),
    categoria: texto(f, "categoria") || "Outros",
    vencimento: texto(f, "vencimento"),
    valor: numero(f, "valor"),
    situacao: "Em aberto",
  })}`;
  atualizarTudo();
}

export async function pagarConta(id: string) {
  await exigirAcao("financeiro", "editar");
  const s = await db();
  await s`update contas_pagar set situacao = case when situacao = 'Pago' then 'Em aberto' else 'Pago' end where id = ${id}`;
  atualizarTudo();
}

export async function criarContrato(f: FormData) {
  await exigirAcao("honorarios", "editar");
  const s = await db();
  await s`insert into contratos ${s({
    id: novoId("ct"),
    titulo: texto(f, "titulo"),
    clienteId: texto(f, "clienteId") || null,
    modalidade: texto(f, "modalidade") || "Fixo mensal",
    valor: numero(f, "valor"),
    inicio: texto(f, "inicio") || new Date().toLocaleDateString("pt-BR"),
    proxima: texto(f, "proxima") || "—",
    situacao: "Habilitado",
  })}`;
  atualizarTudo();
}

export async function alternarContrato(id: string) {
  await exigirAcao("honorarios", "editar");
  const s = await db();
  await s`update contratos set situacao = case when situacao = 'Habilitado' then 'Desabilitado' else 'Habilitado' end where id = ${id}`;
  atualizarTudo();
}

/* ---------------- Documentos ---------------- */

export async function criarDocumento(f: FormData) {
  const eu = await exigirAcao("documentos", "editar");
  const s = await db();
  await s`insert into documentos ${s({
    id: novoId("d"),
    nome: texto(f, "nome"),
    tipo: texto(f, "tipo") || "Petição",
    processoId: texto(f, "processoId") || null,
    tamanho: texto(f, "tamanho") || "0 KB",
    data: new Date().toLocaleDateString("pt-BR"),
    autor: texto(f, "autor") || eu.nome,
  })}`;
  atualizarTudo();
}

export async function excluirDocumento(id: string) {
  await exigirAcao("documentos", "excluir");
  const s = await db();
  await s`delete from documentos where id = ${id}`;
  atualizarTudo();
}

/* ---------------- Configurações ---------------- */

const CAMPOS_CONFIG = [
  "razaoSocial", "cnpj", "oab", "telefone", "endereco", "fuso", "primeiroDia",
  "resumoEmail", "antecedencia", "margem", "art220", "modeloIA",
] as const;

export async function salvarConfig(f: FormData) {
  await exigirAcao("configuracoes", "editar");
  const mudancas: Record<string, string> = {};
  for (const campo of CAMPOS_CONFIG) {
    const valor = f.get(campo);
    if (valor !== null) mudancas[campo === "modeloIA" ? "modeloIa" : campo] = String(valor);
  }
  if (Object.keys(mudancas).length === 0) return;
  const s = await db();
  await s`update config set ${s(mudancas)} where id = 1`;
  atualizarTudo();
}

export async function criarUsuario(f: FormData) {
  await exigirAcao("configuracoes", "editar");
  const email = texto(f, "email").toLowerCase();
  const s = await db();
  const [repetido] = await s`select 1 from usuarios where lower(email) = ${email}`;
  if (repetido) throw new Error("Já existe um usuário com este e-mail.");
  await s`insert into usuarios ${s({
    id: novoId("u"),
    nome: texto(f, "nome"),
    email,
    oab: texto(f, "oab") || "—",
    perfil: texto(f, "perfil") || "Advogado",
    grupos: texto(f, "grupo") ? [texto(f, "grupo")] : [],
    ativo: true,
  })}`;
  atualizarTudo();
}

export async function alternarUsuario(id: string): Promise<{ ok: boolean; mensagem: string }> {
  const eu = await exigirAcao("configuracoes", "editar");
  const s = await db();
  const [alvo] = await s<{ ativo: boolean; perfil: string; nome: string }[]>`select ativo, perfil, nome from usuarios where id = ${id}`;
  if (!alvo) return { ok: false, mensagem: "Usuário não encontrado." };
  if (alvo.ativo && id === eu.id) return { ok: false, mensagem: "Você não pode desativar o próprio acesso." };
  if (alvo.ativo && alvo.perfil === "Administrador") {
    const [{ outros }] = await s<{ outros: number }[]>`
      select count(*)::int as outros from usuarios where perfil = 'Administrador' and ativo and id <> ${id}`;
    if (outros === 0) return { ok: false, mensagem: "O escritório precisa de pelo menos um administrador ativo." };
  }
  await s`update usuarios set ativo = not ativo where id = ${id}`;
  if (alvo.ativo) await s`delete from sessoes where usuario_id = ${id}`;
  atualizarTudo();
  return { ok: true, mensagem: alvo.ativo ? `${alvo.nome} foi desativado e desconectado.` : `${alvo.nome} foi reativado.` };
}

export async function criarTipoTarefa(f: FormData) {
  await exigirAcao("configuracoes", "editar");
  const s = await db();
  await s`insert into tipos_tarefa ${s({
    id: novoId("t"),
    nome: texto(f, "nome"),
    cor: texto(f, "cor") || "#71717a",
    prazoPadrao: texto(f, "prazoPadrao") || "Livre",
    diasUteis: f.get("diasUteis") === "on",
  })}`;
  atualizarTudo();
}

export async function excluirTipoTarefa(id: string) {
  await exigirAcao("configuracoes", "excluir");
  const s = await db();
  await s`delete from tipos_tarefa where id = ${id}`;
  atualizarTudo();
}

export async function criarFeriado(f: FormData) {
  await exigirAcao("configuracoes", "editar");
  const s = await db();
  await s`insert into feriados ${s({
    id: novoId("f"),
    data: texto(f, "data"),
    nome: texto(f, "nome"),
    tipo: texto(f, "tipo") || "Local",
  })}`;
  atualizarTudo();
}

export async function excluirFeriado(id: string) {
  await exigirAcao("configuracoes", "excluir");
  const s = await db();
  await s`delete from feriados where id = ${id}`;
  atualizarTudo();
}

/* ---------------- Atendimentos ---------------- */

export async function criarAtendimento(f: FormData) {
  const eu = await exigirAcao("atendimentos", "editar");
  const s = await db();
  await s`insert into atendimentos ${s({
    id: novoId("at"),
    data: texto(f, "data") || new Date().toLocaleDateString("pt-BR"),
    clienteId: texto(f, "clienteId") || null,
    tipo: texto(f, "tipo") || "Reunião",
    assunto: texto(f, "assunto"),
    responsavel: texto(f, "responsavel") || eu.nome,
    processoId: texto(f, "processoId") || null,
  })}`;
  atualizarTudo();
}

export async function excluirAtendimento(id: string) {
  await exigirAcao("atendimentos", "excluir");
  const s = await db();
  await s`delete from atendimentos where id = ${id}`;
  atualizarTudo();
}

export async function reiniciarDados() {
  await exigirAcao("configuracoes", "excluir");
  await reiniciar();
  atualizarTudo();
}
