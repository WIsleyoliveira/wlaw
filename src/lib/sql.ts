import "server-only";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { semente } from "./semente";
import type { Banco } from "./tipos";

type Global = { __wlawSql?: postgres.Sql; __wlawPronto?: Promise<void> };
const g = globalThis as unknown as Global;

function criar() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida. Suba o banco com `docker compose up -d db` e confira o .env.");
  return postgres(url, {
    max: 5,
    idle_timeout: 30,
    // Colunas snake_case no banco, camelCase no código; undefined vira null.
    transform: { ...postgres.camel, undefined: null },
    onnotice: () => {},
  });
}

/** Conexão única por processo (sobrevive ao hot reload do `next dev`). */
export const sql: postgres.Sql = (g.__wlawSql ??= criar());

const PASTA_MIGRACOES = path.join(process.cwd(), "db", "migracoes");

async function migrar() {
  const arquivos = fs.readdirSync(PASTA_MIGRACOES).filter((f) => f.endsWith(".sql")).sort();
  await sql.begin(async (tx) => {
    // Várias instâncias subindo juntas não aplicam a mesma migração duas vezes.
    await tx`select pg_advisory_xact_lock(724100)`;
    await tx`create table if not exists schema_migracoes (nome text primary key, aplicada_em timestamptz not null default now())`;
    const feitas = new Set((await tx<{ nome: string }[]>`select nome from schema_migracoes`).map((r) => r.nome));
    for (const arquivo of arquivos) {
      if (feitas.has(arquivo)) continue;
      await tx.unsafe(fs.readFileSync(path.join(PASTA_MIGRACOES, arquivo), "utf8"));
      await tx`insert into schema_migracoes (nome) values (${arquivo})`;
    }
  });
}

/** Coleções que crescem no fim da lista; as demais mostram o mais recente primeiro. */
export const EM_ORDEM_DE_CRIACAO = new Set(["usuarios", "tipos_tarefa", "feriados"]);

/** O transform camelCase do postgres.js grava "resumoIA" como "resumo_i_a"; estes campos mudam de grafia na fronteira. */
export const PARA_BANCO: Record<string, string> = { resumoIA: "resumoIa", modeloIA: "modeloIa" };
export const DO_BANCO: Record<string, string> = Object.fromEntries(Object.entries(PARA_BANCO).map(([a, b]) => [b, a]));
const renomear = (linha: Record<string, unknown>, mapa: Record<string, string>) =>
  Object.fromEntries(Object.entries(linha).map(([k, v]) => [mapa[k] ?? k, v]));

/** Ordem de inserção respeita as chaves estrangeiras. */
export const TABELAS: [keyof Omit<Banco, "config">, string][] = [
  ["pessoas", "pessoas"],
  ["usuarios", "usuarios"],
  ["processos", "processos"],
  ["atividades", "atividades"],
  ["andamentos", "andamentos"],
  ["intimacoes", "intimacoes"],
  ["capturas", "capturas"],
  ["contratos", "contratos"],
  ["cobrancas", "cobrancas"],
  ["contasPagar", "contas_pagar"],
  ["lancamentos", "lancamentos"],
  ["documentos", "documentos"],
  ["tiposTarefa", "tipos_tarefa"],
  ["feriados", "feriados"],
  ["atendimentos", "atendimentos"],
];

/** Carga inicial: dados que já existiam no .data/wlaw.json ou, sem ele, a semente de demonstração. */
export async function carregarBanco(dados: Banco, tx: postgres.TransactionSql | postgres.Sql = sql) {
  for (const [colecao, tabela] of TABELAS) {
    const originais = dados[colecao] as unknown as Record<string, unknown>[];
    if (!originais.length) continue;
    // seq cresce na ordem de inserção: listas "mais recente primeiro" entram de trás para frente.
    const ordenadas = EM_ORDEM_DE_CRIACAO.has(tabela) ? originais : [...originais].reverse();
    const linhas = ordenadas.map((l) => renomear(l, PARA_BANCO));
    const colunas = [...new Set(linhas.flatMap((l) => Object.keys(l)))];
    // Lotes pequenos para ficar longe do limite de parâmetros do Postgres.
    for (let i = 0; i < linhas.length; i += 200) {
      await tx`insert into ${tx(tabela)} ${tx(linhas.slice(i, i + 200) as never, ...colunas)}`;
    }
  }
  await tx`insert into config ${tx({ id: 1, ...renomear(dados.config, PARA_BANCO) } as never)}`;
}

async function importarSeVazio() {
  const [{ total }] = await sql<{ total: number }[]>`select count(*)::int as total from config`;
  if (total > 0) return;
  const arquivo = path.join(process.cwd(), ".data", "wlaw.json");
  const dados: Banco = fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo, "utf8")) : semente();
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(724101)`;
    const [{ total: dentro }] = await tx<{ total: number }[]>`select count(*)::int as total from config`;
    if (dentro === 0) await carregarBanco(dados, tx);
  });
}

/** Garante migrações e carga inicial uma vez por processo. */
export function bancoPronto() {
  g.__wlawPronto ??= migrar()
    .then(importarSeVazio)
    .catch((erro) => {
      g.__wlawPronto = undefined;
      throw erro;
    });
  return g.__wlawPronto;
}
