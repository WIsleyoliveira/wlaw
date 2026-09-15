import "server-only";
import type postgres from "postgres";
import { novoId } from "../ids";
import { type RegrasPrazo, dataBR, regrasDe, semExpediente } from "../prazos";
import { bancoPronto, sql } from "../sql";
import type { Config, Feriado } from "../tipos";
import { decifrar } from "./cofre";
import { ErroDjen, type ItemDjen, buscarPorOab } from "./djen";
import { type ClienteMni, criarClienteMni } from "./mni/cliente";
import { ErroMni, type Transporte, transporteHttps } from "./mni/soap";
import { type Oab, lerOab, rotuloOab } from "./oab";

type Db = postgres.Sql;

/** Intervalo mínimo entre consultas do mesmo alvo, em minutos. */
export const INTERVALOS = { djen: 60, avisos: 60, processo: 240 };
const TRAVA_CICLO = 724200;
const FUSO = "America/Belem";

/* ---------------- Datas ---------------- */

export const hojeIso = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(d);

function somarDiasIso(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const dataLocal = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
};

/** Lei 11.419/2006, art. 4º, § 3º: considera-se publicação o primeiro dia útil seguinte à disponibilização. */
export function publicacaoDe(disponibilizacaoIso: string, regras: RegrasPrazo) {
  const d = dataLocal(disponibilizacaoIso);
  do d.setDate(d.getDate() + 1);
  while (semExpediente(d, regras));
  return dataBR(d);
}

/** Lei 11.419/2006, art. 5º, § 3º: sem consulta ao teor em 10 dias corridos, a intimação se considera feita. */
export function cienciaTacitaDe(disponibilizacao: Date) {
  const d = new Date(disponibilizacao);
  d.setDate(d.getDate() + 10);
  return d.toLocaleDateString("pt-BR", { timeZone: FUSO });
}

export function limparTexto(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

export async function regrasDoEscritorio(db: Db) {
  const [config] = await db<{ art220: string }[]>`select art220 from config where id = 1`;
  const feriados = await db<Feriado[]>`select id, data, nome, tipo from feriados`;
  return regrasDe({ art220: config?.art220 ?? "" } as Config, feriados);
}

/* ---------------- Execução com disjuntor ---------------- */

export type Contagem = { requisicoes: number; lidos: number; novos: number; detalhes: Record<string, unknown> };
export type Fonte = "djen" | "mni";
export type ResultadoExecucao = {
  fonte: Fonte;
  alvo: string;
  status: "sucesso" | "falha";
  requisicoes: number;
  lidos: number;
  novos: number;
  erro?: string;
  pausadoMinutos?: number;
};

type Estado = { ativo: boolean; ultimaTentativa: Date | null; pausadoAte: Date | null };

export async function registrarAlvo(db: Db, fonte: Fonte, alvo: string, descricao: string) {
  const [estado] = await db<Estado[]>`
    insert into captura_estado (fonte, alvo, descricao) values (${fonte}, ${alvo}, ${descricao})
    on conflict (fonte, alvo) do update set descricao = excluded.descricao
    returning ativo, ultima_tentativa, pausado_ate`;
  return estado;
}

/** Forçar (botão "rodar agora") ignora intervalo e pausa, mas nunca um alvo desligado. */
export function devidoAgora(estado: Estado, intervaloMin: number, forcar = false, agora = Date.now()) {
  if (!estado.ativo) return false;
  if (forcar) return true;
  if (estado.pausadoAte && estado.pausadoAte.getTime() > agora) return false;
  return !estado.ultimaTentativa || agora - estado.ultimaTentativa.getTime() >= intervaloMin * 60_000;
}

/** Pausa depois de falhas: 5, 10, 20… até 6 h. Erro de configuração ou senha pausa 6 h de uma vez. */
export const minutosDePausa = (falhasSeguidas: number, transitorio: boolean) =>
  transitorio ? Math.min(5 * 2 ** (falhasSeguidas - 1), 360) : 360;

export async function executarAlvo(
  db: Db,
  fonte: Fonte,
  alvo: string,
  tarefa: (c: Contagem) => Promise<void>,
): Promise<ResultadoExecucao> {
  const c: Contagem = { requisicoes: 0, lidos: 0, novos: 0, detalhes: {} };
  await db`insert into captura_estado (fonte, alvo) values (${fonte}, ${alvo}) on conflict do nothing`;
  const [{ id }] = await db<{ id: string }[]>`
    insert into captura_execucoes (fonte, alvo, status) values (${fonte}, ${alvo}, 'rodando') returning id`;
  await db`update captura_estado set ultima_tentativa = now() where fonte = ${fonte} and alvo = ${alvo}`;

  try {
    await tarefa(c);
    await db`
      update captura_execucoes set status = 'sucesso', terminado_em = now(), itens_lidos = ${c.lidos},
        itens_novos = ${c.novos}, requisicoes = ${c.requisicoes}, detalhes = ${db.json(c.detalhes as postgres.JSONValue)}
      where id = ${id}`;
    await db`
      update captura_estado set ultimo_sucesso = now(), falhas_seguidas = 0, pausado_ate = null, ultimo_erro = null
      where fonte = ${fonte} and alvo = ${alvo}`;
    return { fonte, alvo, status: "sucesso", requisicoes: c.requisicoes, lidos: c.lidos, novos: c.novos };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    const transitorio = erro instanceof ErroDjen || erro instanceof ErroMni ? erro.transitorio : true;
    const [{ falhasSeguidas }] = await db<{ falhasSeguidas: number }[]>`
      update captura_estado set falhas_seguidas = falhas_seguidas + 1, ultimo_erro = ${mensagem}
      where fonte = ${fonte} and alvo = ${alvo} returning falhas_seguidas`;
    const minutos = minutosDePausa(falhasSeguidas, transitorio);
    await db`update captura_estado set pausado_ate = now() + make_interval(mins => ${minutos}) where fonte = ${fonte} and alvo = ${alvo}`;
    await db`
      update captura_execucoes set status = 'falha', terminado_em = now(), erro = ${mensagem}, itens_lidos = ${c.lidos},
        itens_novos = ${c.novos}, requisicoes = ${c.requisicoes}, detalhes = ${db.json(c.detalhes as postgres.JSONValue)}
      where id = ${id}`;
    return { fonte, alvo, status: "falha", requisicoes: c.requisicoes, lidos: c.lidos, novos: c.novos, erro: mensagem, pausadoMinutos: minutos };
  }
}

/* ---------------- DJEN ---------------- */

export const alvoOab = (oab: Oab) => `oab:${rotuloOab(oab)}`;
export type BuscarDjen = typeof buscarPorOab;

/** Grava uma comunicação do DJEN. Devolve true quando virou intimação nova no escritório. */
export async function gravarComunicacao(db: Db, item: ItemDjen, alvo: string, regras: RegrasPrazo) {
  const digitos = item.numero_processo.replace(/\D/g, "");
  const ativo = item.ativo !== false;
  const [processo] = await db<{ id: string }[]>`
    select id from processos where regexp_replace(numero, '\\D', '', 'g') = ${digitos} limit 1`;
  const [existente] = await db<{ intimacaoId: string | null }[]>`select intimacao_id from djen_comunicacoes where hash = ${item.hash}`;

  if (existente) {
    await db`
      update djen_comunicacoes set ativo = ${ativo}, motivo_cancelamento = ${item.motivo_cancelamento},
        data_cancelamento = ${item.data_cancelamento}, processo_id = coalesce(processo_id, ${processo?.id ?? null}), atualizado_em = now()
      where hash = ${item.hash}`;
    if (!ativo && existente.intimacaoId) {
      await db`update intimacoes set cancelada_em = coalesce(cancelada_em, now()) where id = ${existente.intimacaoId}`;
    }
    return false;
  }

  await db`insert into djen_comunicacoes ${db({
    id: item.id,
    hash: item.hash,
    numeroProcesso: digitos,
    siglaTribunal: item.siglaTribunal ?? "",
    orgao: item.nomeOrgao ?? "",
    tipoComunicacao: item.tipoComunicacao ?? "",
    tipoDocumento: item.tipoDocumento ?? "",
    classe: item.nomeClasse ?? "",
    dataDisponibilizacao: item.data_disponibilizacao,
    texto: item.texto ?? "",
    link: item.link || null,
    meio: item.meio || null,
    ativo,
    motivoCancelamento: item.motivo_cancelamento,
    dataCancelamento: item.data_cancelamento,
    destinatarios: db.json((item.destinatarios ?? []) as postgres.JSONValue),
    advogados: db.json((item.destinatarioadvogados ?? []).map((d) => d.advogado) as postgres.JSONValue),
    oabAlvo: alvo,
    processoId: processo?.id ?? null,
    bruto: db.json(item as unknown as postgres.JSONValue),
  })} on conflict do nothing`;
  if (!ativo) return false;

  const disponibilizacao = dataBR(dataLocal(item.data_disponibilizacao));
  const peca = item.tipoDocumento || item.tipoComunicacao || "Comunicação";
  const intimacaoId = novoId("i");
  const [criada] = await db<{ id: string }[]>`insert into intimacoes ${db({
    id: intimacaoId,
    disponibilizacao,
    publicacao: publicacaoDe(item.data_disponibilizacao, regras),
    numero: item.numeroprocessocommascara || digitos,
    processoId: processo?.id ?? null,
    descricao: `${item.nomeOrgao} — ${peca}`,
    situacao: "Pendente",
    teor: limparTexto(item.texto ?? ""),
    origem: "djen",
    chaveOrigem: `djen:${item.hash}`,
    link: item.link || null,
  })} on conflict (chave_origem) do nothing returning id`;
  if (!criada) return false;

  await db`update djen_comunicacoes set intimacao_id = ${intimacaoId} where hash = ${item.hash}`;
  if (processo) {
    await db`insert into andamentos ${db({
      id: novoId("an"),
      data: disponibilizacao,
      orgao: item.siglaTribunal ?? "",
      tipo: "Intimação",
      processoId: processo.id,
      descricao: `${peca} disponibilizada no DJEN — ${item.nomeOrgao}`,
      lido: false,
      origem: "djen",
      identificador: item.hash,
    })} on conflict (processo_id, origem, identificador) do nothing`;
  }
  return true;
}

export async function capturarOab(
  db: Db,
  oab: Oab,
  c: Contagem,
  opcoes: { hoje?: string; buscar?: BuscarDjen; signal?: AbortSignal } = {},
) {
  const alvo = alvoOab(oab);
  const fim = opcoes.hoje ?? hojeIso();
  const limite = somarDiasIso(fim, -30);
  const [estado] = await db<{ ultimoSucesso: Date | null }[]>`
    select ultimo_sucesso from captura_estado where fonte = 'djen' and alvo = ${alvo}`;
  // Recua 2 dias além do último sucesso: a API às vezes publica com atraso.
  const desde = estado?.ultimoSucesso ? somarDiasIso(hojeIso(estado.ultimoSucesso), -2) : limite;
  const inicio = desde < limite ? limite : desde;

  const { itens, requisicoes, truncado } = await (opcoes.buscar ?? buscarPorOab)(oab, inicio, fim, opcoes.signal);
  c.requisicoes += requisicoes;
  c.lidos += itens.length;
  c.detalhes = { inicio, fim, truncado };

  const regras = await regrasDoEscritorio(db);
  for (const item of itens) if (await gravarComunicacao(db, item, alvo, regras)) c.novos++;
}

/* ---------------- MNI ---------------- */

export type ConectorLinha = {
  id: string;
  tribunal: string;
  grau: string;
  url: string;
  modo: "simulado" | "real";
  certificadoId: string | null;
  idConsultante: string | null;
  senhaConsultanteCifrada: Buffer | null;
  consultarAvisos: boolean;
  ativo: boolean;
};

export async function montarCliente(db: Db, conector: ConectorLinha, transporte: Transporte = transporteHttps) {
  if (conector.modo !== "real") throw new ErroMni("Conector em modo simulado: o robô só consulta tribunais em modo real.", false);
  if (!conector.certificadoId) throw new ErroMni("Conector sem certificado A1 vinculado.", false);
  const [cert] = await db<{ id: string; cpf: string | null; validoAte: Date; ativo: boolean; pfxCifrado: Buffer; senhaCifrada: Buffer }[]>`
    select id, cpf, valido_ate, ativo, pfx_cifrado, senha_cifrada from certificados where id = ${conector.certificadoId}`;
  if (!cert || !cert.ativo) throw new ErroMni("O certificado do conector foi removido ou desativado.", false);
  if (cert.validoAte.getTime() < Date.now()) {
    throw new ErroMni(`Certificado vencido em ${cert.validoAte.toLocaleDateString("pt-BR")}.`, false);
  }
  const idConsultante = conector.idConsultante || cert.cpf;
  if (!idConsultante) throw new ErroMni("Informe o CPF do consultante no conector.", false);

  const cliente = criarClienteMni(
    {
      url: conector.url,
      idConsultante,
      senhaConsultante: conector.senhaConsultanteCifrada
        ? decifrar(conector.senhaConsultanteCifrada, `conector:${conector.id}:senha`).toString("utf8")
        : "",
      pfx: decifrar(cert.pfxCifrado, `certificado:${cert.id}:pfx`),
      senhaPfx: decifrar(cert.senhaCifrada, `certificado:${cert.id}:senha`).toString("utf8"),
    },
    transporte,
  );
  return { cliente, certificadoId: cert.id };
}

const normalizarTribunal = (t: string) => t.replace(/[^a-z0-9]/gi, "").toUpperCase();
const grauDe = (t: string) => (/^\s*2/.test(t) ? "2" : /^\s*1/.test(t) ? "1" : "");

export function tribunalCorresponde(processo: { tribunal: string; instancia: string }, conector: { tribunal: string; grau: string }) {
  return (
    normalizarTribunal(processo.tribunal) === normalizarTribunal(conector.tribunal) &&
    grauDe(processo.instancia) === grauDe(conector.grau)
  );
}

function tipoDoMovimento(descricao: string) {
  if (/intima|cita[çc]/i.test(descricao)) return "Intimação";
  if (/senten|decis|despach|julg|ac[óo]rd/i.test(descricao)) return "Decisão";
  if (/peti[çc]|juntad/i.test(descricao)) return "Petição";
  return "Movimentação";
}

export async function capturarProcessoMni(
  db: Db,
  conector: { id: string; tribunal: string },
  processo: { id: string; numero: string },
  cliente: ClienteMni,
  c: Contagem,
  signal?: AbortSignal,
) {
  const hashes = await cliente.consultarAlteracao(processo.numero, signal);
  c.requisicoes++;
  const [anterior] = await db<{ hashMovimentacoes: string | null }[]>`
    select hash_movimentacoes from mni_processos_estado where processo_id = ${processo.id} and conector_id = ${conector.id}`;

  if (anterior && hashes.hashMovimentacoes && anterior.hashMovimentacoes === hashes.hashMovimentacoes) {
    await db`update mni_processos_estado set verificado_em = now() where processo_id = ${processo.id} and conector_id = ${conector.id}`;
    c.detalhes = { semAlteracao: true };
    return;
  }

  const { cabecalho, movimentos } = await cliente.consultarProcesso(processo.numero, signal);
  c.requisicoes++;
  c.lidos += movimentos.length;
  // Na primeira carga o histórico entra como lido: não faz sentido avisar 40 andamentos antigos.
  const primeiraCarga = !anterior;

  for (const m of movimentos) {
    const [novo] = await db<{ id: string }[]>`insert into andamentos ${db({
      id: novoId("an"),
      data: m.dataHora.toLocaleDateString("pt-BR", { timeZone: FUSO }),
      orgao: conector.tribunal,
      tipo: tipoDoMovimento(m.descricao),
      processoId: processo.id,
      descricao: m.descricao,
      lido: primeiraCarga,
      origem: "mni",
      identificador: m.identificador,
      dataHora: m.dataHora,
    })} on conflict (processo_id, origem, identificador) do nothing returning id`;
    if (novo) c.novos++;
  }

  await db`
    insert into mni_processos_estado (processo_id, conector_id, hash_cabecalho, hash_movimentacoes, hash_documentos, verificado_em, alterado_em)
    values (${processo.id}, ${conector.id}, ${hashes.hashCabecalho}, ${hashes.hashMovimentacoes}, ${hashes.hashDocumentos}, now(), now())
    on conflict (processo_id, conector_id) do update set hash_cabecalho = excluded.hash_cabecalho,
      hash_movimentacoes = excluded.hash_movimentacoes, hash_documentos = excluded.hash_documentos,
      verificado_em = now(), alterado_em = now()`;
  c.detalhes = { primeiraCarga, orgao: cabecalho?.orgao ?? null };
}

/** Avisos pendentes viram intimação sem abrir o teor: abrir registraria ciência no tribunal. */
export async function capturarAvisosMni(
  db: Db,
  conector: { id: string; tribunal: string },
  cliente: ClienteMni,
  c: Contagem,
  signal?: AbortSignal,
) {
  const avisos = await cliente.consultarAvisosPendentes(signal);
  c.requisicoes++;
  c.lidos += avisos.length;

  for (const a of avisos) {
    const digitos = a.numeroProcesso.replace(/\D/g, "");
    const [processo] = await db<{ id: string }[]>`
      select id from processos where regexp_replace(numero, '\\D', '', 'g') = ${digitos} limit 1`;
    const [novo] = await db<{ idAviso: string }[]>`insert into mni_avisos ${db({
      conectorId: conector.id,
      idAviso: a.idAviso,
      numeroProcesso: digitos,
      tipoComunicacao: a.tipoComunicacao || null,
      dataDisponibilizacao: a.dataDisponibilizacao,
      destinatario: a.destinatario || null,
      processoId: processo?.id ?? null,
      bruto: db.json({ ...a, dataDisponibilizacao: a.dataDisponibilizacao?.toISOString() ?? null } as postgres.JSONValue),
    })} on conflict (conector_id, id_aviso) do nothing returning id_aviso`;
    if (!novo) continue;

    const disponivel = a.dataDisponibilizacao ?? new Date();
    const tacita = cienciaTacitaDe(disponivel);
    const intimacaoId = novoId("i");
    const [criada] = await db<{ id: string }[]>`insert into intimacoes ${db({
      id: intimacaoId,
      disponibilizacao: disponivel.toLocaleDateString("pt-BR", { timeZone: FUSO }),
      publicacao: tacita,
      numero: digitos,
      processoId: processo?.id ?? null,
      descricao: `${a.orgao || conector.tribunal} — aviso de ${a.tipoComunicacao || "intimação"} no PJe`,
      situacao: "Pendente",
      teor:
        `Teor ainda não aberto. Abrir o teor no tribunal registra a ciência da intimação (Lei 11.419/2006, art. 5º). ` +
        `Sem abertura, a intimação se considera feita em ${tacita}.`,
      origem: "mni",
      chaveOrigem: `mni:${conector.id}:${a.idAviso}`,
    })} on conflict (chave_origem) do nothing returning id`;
    if (!criada) continue;
    await db`update mni_avisos set intimacao_id = ${intimacaoId} where conector_id = ${conector.id} and id_aviso = ${a.idAviso}`;
    c.novos++;
  }
}

/* ---------------- Ciclo ---------------- */

export type ResultadoCiclo = {
  iniciadoEm: string;
  duracaoMs: number;
  ignorado?: string;
  execucoes: ResultadoExecucao[];
  adiados: number;
};

export async function executarCiclo(
  opcoes: {
    db?: Db;
    orcamentoMs?: number;
    forcar?: boolean;
    buscar?: BuscarDjen;
    transporte?: Transporte;
    hoje?: string;
    signal?: AbortSignal;
  } = {},
): Promise<ResultadoCiclo> {
  await bancoPronto();
  const db = opcoes.db ?? sql;
  const inicio = Date.now();
  const limite = inicio + (opcoes.orcamentoMs ?? 240_000);
  const resultado: ResultadoCiclo = { iniciadoEm: new Date(inicio).toISOString(), duracaoMs: 0, execucoes: [], adiados: 0 };
  const semTempo = () => Date.now() > limite - 15_000 || opcoes.signal?.aborted === true;

  // Trava de sessão numa conexão reservada: dois ciclos nunca rodam juntos, em nenhuma instância.
  const reservada = await sql.reserve();
  try {
    const [{ travou }] = await reservada<{ travou: boolean }[]>`select pg_try_advisory_lock(${TRAVA_CICLO}) as travou`;
    if (!travou) return { ...resultado, ignorado: "Outro ciclo de captura já está em andamento." };

    try {
      /* DJEN: uma consulta por OAB da equipe ativa. */
      const usuarios = await db<{ nome: string; oab: string }[]>`select nome, oab from usuarios where ativo`;
      const oabs = new Map<string, { oab: Oab; nomes: string[] }>();
      for (const u of usuarios) {
        const oab = lerOab(u.oab);
        if (!oab) continue;
        const item = oabs.get(rotuloOab(oab)) ?? { oab, nomes: [] };
        item.nomes.push(u.nome);
        oabs.set(rotuloOab(oab), item);
      }
      for (const { oab, nomes } of oabs.values()) {
        const alvo = alvoOab(oab);
        const estado = await registrarAlvo(db, "djen", alvo, `OAB ${rotuloOab(oab)} — ${nomes.join(", ")}`);
        if (!devidoAgora(estado, INTERVALOS.djen, opcoes.forcar)) continue;
        if (semTempo()) {
          resultado.adiados++;
          continue;
        }
        resultado.execucoes.push(
          await executarAlvo(db, "djen", alvo, (c) => capturarOab(db, oab, c, { buscar: opcoes.buscar, hoje: opcoes.hoje, signal: opcoes.signal })),
        );
      }

      /* MNI: só conectores em modo real, com certificado. */
      const conectores = await db<ConectorLinha[]>`
        select id, tribunal, grau, url, modo, certificado_id, id_consultante, senha_consultante_cifrada, consultar_avisos, ativo
        from mni_conectores where ativo and modo = 'real' order by id`;
      const processos = await db<{ id: string; numero: string; tribunal: string; instancia: string; pasta: string }[]>`
        select id, numero, tribunal, instancia, pasta from processos where monitorado and situacao = 'Ativo'`;

      for (const conector of conectores) {
        let cliente: ClienteMni;
        let certificadoId: string;
        try {
          ({ cliente, certificadoId } = await montarCliente(db, conector, opcoes.transporte));
        } catch (erro) {
          const alvo = `conector:${conector.id}`;
          await registrarAlvo(db, "mni", alvo, `Conector ${conector.tribunal} ${conector.grau}`);
          resultado.execucoes.push(await executarAlvo(db, "mni", alvo, async () => Promise.reject(erro)));
          continue;
        }

        const usar = async (operacao: string, alvo: string, sucesso: boolean) =>
          db`insert into certificado_usos (certificado_id, operacao, alvo, sucesso) values (${certificadoId}, ${operacao}, ${alvo}, ${sucesso})`;

        if (conector.consultarAvisos) {
          const alvo = `avisos:${conector.id}`;
          const estado = await registrarAlvo(db, "mni", alvo, `Avisos pendentes — ${conector.tribunal} ${conector.grau}`);
          if (devidoAgora(estado, INTERVALOS.avisos, opcoes.forcar)) {
            if (semTempo()) resultado.adiados++;
            else {
              const r = await executarAlvo(db, "mni", alvo, (c) => capturarAvisosMni(db, conector, cliente, c, opcoes.signal));
              await usar("consultarAvisosPendentes", alvo, r.status === "sucesso");
              resultado.execucoes.push(r);
            }
          }
        }

        for (const processo of processos.filter((p) => tribunalCorresponde(p, conector))) {
          const alvo = `processo:${processo.id}@${conector.id}`;
          const estado = await registrarAlvo(db, "mni", alvo, `${processo.pasta} — ${processo.numero}`);
          if (!devidoAgora(estado, INTERVALOS.processo, opcoes.forcar)) continue;
          if (semTempo()) {
            resultado.adiados++;
            continue;
          }
          const r = await executarAlvo(db, "mni", alvo, (c) => capturarProcessoMni(db, conector, processo, cliente, c, opcoes.signal));
          await usar("consultarProcesso", alvo, r.status === "sucesso");
          resultado.execucoes.push(r);
        }
        await db`update certificados set ultimo_uso = now() where id = ${certificadoId}`;
      }
    } finally {
      await reservada`select pg_advisory_unlock(${TRAVA_CICLO})`;
    }
  } finally {
    reservada.release();
  }

  resultado.duracaoMs = Date.now() - inicio;
  return resultado;
}
