import "server-only";
import { connection } from "next/server";
import { semente } from "./semente";
import { DO_BANCO, EM_ORDEM_DE_CRIACAO, TABELAS, bancoPronto, carregarBanco, sql } from "./sql";
import type { Banco } from "./tipos";

/** Campos opcionais do tipo: null do banco vira ausência, como era no JSON. */
const OPCIONAIS = new Set(["fases", "resumoIA"]);

function limpar(linha: Record<string, unknown>) {
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(linha)) {
    if (chave === "seq") continue;
    const nome = DO_BANCO[chave] ?? chave;
    if (valor === null && OPCIONAIS.has(nome)) continue;
    saida[nome] = valor;
  }
  return saida;
}

/** Retrato completo do escritório. A carteira é pequena o bastante para caber em uma leitura por requisição. */
export async function ler(): Promise<Banco> {
  await connection();
  await bancoPronto();
  const [config, ...colecoes] = await Promise.all([
    sql`select * from config where id = 1`,
    ...TABELAS.map(
      ([, tabela]) => sql`select * from ${sql(tabela)} order by seq ${EM_ORDEM_DE_CRIACAO.has(tabela) ? sql`asc` : sql`desc`}`,
    ),
  ]);
  const banco = Object.fromEntries(TABELAS.map(([colecao], i) => [colecao, colecoes[i].map(limpar)])) as Record<
    string,
    Record<string, unknown>[]
  >;
  // Segredos de acesso nunca saem do banco para as telas.
  for (const usuario of banco.usuarios) {
    usuario.temSenha = Boolean(usuario.senhaHash);
    for (const campo of ["senhaHash", "tentativasFalhas", "bloqueadoAte", "senhaDefinidaEm"]) delete usuario[campo];
  }
  const dadosConfig = limpar(config[0] ?? {});
  delete dadosConfig.id;
  return { ...banco, config: dadosConfig } as unknown as Banco;
}

/** Volta aos dados de demonstração. Certificados e conectores ficam (só perdem o vínculo com usuários). */
export async function reiniciar() {
  await bancoPronto();
  await sql.begin(async (tx) => {
    for (const [, tabela] of [...TABELAS].reverse()) await tx`delete from ${tx(tabela)}`;
    await tx`delete from config`;
    await carregarBanco(semente(), tx);
  });
}

export { novoId } from "./ids";
