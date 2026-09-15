import "server-only";
import { bancoPronto, sql } from "../sql";
import { transporteSimulado, type CenarioMni } from "./mni/simulador";
import { criarClienteMni } from "./mni/cliente";
import { type ConectorLinha, montarCliente, tribunalCorresponde } from "./robo";
import { lerOab, rotuloOab } from "./oab";

export type EstadoAlvo = {
  fonte: "djen" | "mni";
  alvo: string;
  descricao: string;
  ativo: boolean;
  ultimoSucesso: Date | null;
  ultimaTentativa: Date | null;
  falhasSeguidas: number;
  pausadoAte: Date | null;
  ultimoErro: string | null;
};

export type Execucao = {
  id: string;
  fonte: string;
  alvo: string;
  iniciadoEm: Date;
  terminadoEm: Date | null;
  status: "rodando" | "sucesso" | "falha";
  itensLidos: number;
  itensNovos: number;
  requisicoes: number;
  erro: string | null;
};

export type ConectorPainel = {
  id: string;
  tribunal: string;
  grau: string;
  sistema: string;
  url: string;
  versao: string;
  modo: "simulado" | "real";
  certificadoId: string | null;
  idConsultante: string | null;
  temSenha: boolean;
  consultarAvisos: boolean;
  ativo: boolean;
  observacoes: string;
};

export type CertificadoPainel = {
  id: string;
  titular: string;
  cpf: string | null;
  emissor: string;
  validoDe: Date;
  validoAte: Date;
  impressaoDigital: string;
  ativo: boolean;
  criadoEm: Date;
  ultimoUso: Date | null;
};

export async function lerPainelCaptura() {
  await bancoPronto();
  const [estados, execucoes, conectores, certificados, [djen], usuarios, monitorados] = await Promise.all([
    sql<EstadoAlvo[]>`
      select fonte, alvo, descricao, ativo, ultimo_sucesso, ultima_tentativa, falhas_seguidas, pausado_ate, ultimo_erro
      from captura_estado order by fonte, alvo`,
    sql<Execucao[]>`
      select id::text, fonte, alvo, iniciado_em, terminado_em, status, itens_lidos, itens_novos, requisicoes, erro
      from captura_execucoes order by iniciado_em desc limit 40`,
    sql<ConectorPainel[]>`
      select id, tribunal, grau, sistema, url, versao, modo, certificado_id, id_consultante,
        (senha_consultante_cifrada is not null) as tem_senha, consultar_avisos, ativo, observacoes
      from mni_conectores order by tribunal, grau`,
    sql<CertificadoPainel[]>`
      select id, titular, cpf, emissor, valido_de, valido_ate, impressao_digital, ativo, criado_em, ultimo_uso
      from certificados order by criado_em desc`,
    sql<{ total: number; ultimos30: number; ultima: Date | null }[]>`
      select count(*)::int as total, count(*) filter (where data_disponibilizacao >= current_date - 30)::int as ultimos30,
        max(capturado_em) as ultima
      from djen_comunicacoes`,
    sql<{ id: string; nome: string; oab: string; ativo: boolean }[]>`select id, nome, oab, ativo from usuarios order by seq`,
    sql<{ id: string; pasta: string; numero: string; tribunal: string; instancia: string }[]>`
      select id, pasta, numero, tribunal, instancia from processos where monitorado and situacao = 'Ativo' order by pasta`,
  ]);

  const oabs = usuarios.map((u) => {
    const oab = lerOab(u.oab);
    return { usuario: u.nome, ativo: u.ativo, texto: u.oab, rotulo: oab ? rotuloOab(oab) : null };
  });

  const processosMonitorados = monitorados.map((p) => ({
    ...p,
    conectorId: conectores.find((c) => c.ativo && tribunalCorresponde(p, c))?.id ?? null,
  }));

  // Consulta bem-sucedida conta como "em dia" mesmo sem publicação nova no período.
  const ultimaConsulta =
    estados
      .filter((e) => e.fonte === "djen" && e.ultimoSucesso)
      .map((e) => new Date(e.ultimoSucesso!))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  // Referência de tempo única para a tela inteira (calcular "há X min" sem chamar Date.now() no render).
  return {
    agora: Date.now(),
    estados,
    execucoes,
    conectores,
    certificados,
    djen: { ...djen, ultimaConsulta },
    oabs,
    processosMonitorados,
  };
}

export type PainelCaptura = Awaited<ReturnType<typeof lerPainelCaptura>>;

export type PassoTeste = { operacao: string; ok: boolean; ms: number; resumo: string };

/** Teste só de leitura: não grava andamento nem intimação. Em modo simulado nem sai da máquina. */
export async function testarConector(conectorId: string, numeroInformado?: string) {
  await bancoPronto();
  const [conector] = await sql<ConectorLinha[]>`
    select id, tribunal, grau, url, modo, certificado_id, id_consultante, senha_consultante_cifrada, consultar_avisos, ativo
    from mni_conectores where id = ${conectorId}`;
  if (!conector) throw new Error("Conector não encontrado.");

  const processos = await sql<{ id: string; numero: string; tribunal: string; instancia: string }[]>`
    select id, numero, tribunal, instancia from processos where situacao = 'Ativo' order by monitorado desc, pasta`;
  const candidato = processos.find((p) => tribunalCorresponde(p, conector)) ?? processos[0];
  const numero = (numeroInformado || candidato?.numero || "").replace(/\D/g, "");
  if (!numero) throw new Error("Informe um número de processo para testar.");

  let cliente;
  if (conector.modo === "simulado") {
    const andamentos = candidato
      ? await sql<{ data: string; descricao: string }[]>`select data, descricao from andamentos where processo_id = ${candidato.id} order by seq`
      : [];
    const cenario: CenarioMni = {
      processos: {
        [numero]: {
          classe: 7,
          orgao: `${conector.tribunal} — órgão simulado`,
          movimentos: andamentos.map((a) => ({
            dataHora: `${a.data.slice(6, 10)}${a.data.slice(3, 5)}${a.data.slice(0, 2)}120000`,
            descricao: a.descricao,
          })),
        },
      },
      avisos: [{ idAviso: "SIM-1", numero, dataDisponibilizacao: "20260910080000", destinatario: "ADVOGADO SIMULADO" }],
    };
    cliente = criarClienteMni({ url: conector.url, idConsultante: "00000000000", senhaConsultante: "" }, transporteSimulado(cenario), 15_000);
  } else {
    ({ cliente } = await montarCliente(sql, conector));
  }

  const passos: PassoTeste[] = [];
  const passo = async (operacao: string, executar: () => Promise<string>) => {
    const t = Date.now();
    try {
      passos.push({ operacao, ok: true, ms: Date.now() - t, resumo: await executar() });
    } catch (erro) {
      passos.push({ operacao, ok: false, ms: Date.now() - t, resumo: erro instanceof Error ? erro.message : String(erro) });
    }
  };

  await passo("consultarAlteracao", async () => {
    const h = await cliente.consultarAlteracao(numero);
    return `hash das movimentações: ${h.hashMovimentacoes.slice(0, 12) || "vazio"}`;
  });
  await passo("consultarProcesso", async () => {
    const r = await cliente.consultarProcesso(numero);
    return `${r.movimentos.length} movimentos · ${r.cabecalho?.orgao || "órgão não informado"}`;
  });
  if (conector.consultarAvisos) {
    await passo("consultarAvisosPendentes", async () => `${(await cliente.consultarAvisosPendentes()).length} avisos pendentes (teor não aberto)`);
  }

  return { modo: conector.modo, url: conector.url, numero, passos };
}
