import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type postgres from "postgres";
import { cifrar, inspecionarPfx } from "@/lib/captura/cofre";
import { ErroDjen, type ItemDjen } from "@/lib/captura/djen";
import { criarClienteMni } from "@/lib/captura/mni/cliente";
import { type CenarioMni, transporteSimulado } from "@/lib/captura/mni/simulador";
import { ErroMni, type Transporte } from "@/lib/captura/mni/soap";
import {
  type ConectorLinha, type Contagem, capturarAvisosMni, capturarOab, capturarProcessoMni,
  executarAlvo, executarCiclo, montarCliente, publicacaoDe, regrasDoEscritorio,
} from "@/lib/captura/robo";
import { bancoPronto, sql } from "@/lib/sql";
import { gerarPfx } from "./apoio";

type Db = postgres.Sql;
class Desfazer extends Error {}

/** Cada teste roda numa transação desfeita no final: o banco de desenvolvimento não é alterado. */
async function isolado(teste: (tx: Db) => Promise<void>) {
  try {
    await sql.begin(async (tx) => {
      await teste(tx as unknown as Db);
      throw new Desfazer();
    });
  } catch (erro) {
    if (!(erro instanceof Desfazer)) throw erro;
  }
}

const contagem = (): Contagem => ({ requisicoes: 0, lidos: 0, novos: 0, detalhes: {} });

async function processoTjpa(tx: Db) {
  const [p] = await tx<{ id: string; numero: string }[]>`
    select id, numero from processos where regexp_replace(tribunal, '[^A-Za-z]', '', 'g') ilike 'TJPA' and instancia like '1%'
    order by pasta limit 1`;
  assert.ok(p, "precisa de ao menos um processo do TJ-PA na base");
  return { ...p, digitos: p.numero.replace(/\D/g, "") };
}

async function conectorReal(tx: Db, id: string, opcoes: { senha?: string } = {}) {
  const dados = inspecionarPfx(gerarPfx(), "segredo");
  const certificadoId = `cert-${id}`;
  await tx`insert into certificados ${tx({
    id: certificadoId,
    titular: dados.titular,
    cpf: dados.cpf,
    emissor: dados.emissor,
    validoDe: dados.validoDe,
    validoAte: dados.validoAte,
    impressaoDigital: `${dados.impressaoDigital}-${id}`,
    pfxCifrado: cifrar(dados.pfx, `certificado:${certificadoId}:pfx`),
    senhaCifrada: cifrar(Buffer.from("segredo"), `certificado:${certificadoId}:senha`),
  })}`;
  await tx`insert into mni_conectores ${tx({
    id,
    tribunal: "TJPA",
    grau: "1º grau",
    url: "https://simulado.invalid/intercomunicacao",
    modo: "real",
    certificadoId,
    senhaConsultanteCifrada: opcoes.senha ? cifrar(Buffer.from(opcoes.senha), `conector:${id}:senha`) : null,
  })}`;
  const [linha] = await tx<ConectorLinha[]>`
    select id, tribunal, grau, url, modo, certificado_id, id_consultante, senha_consultante_cifrada, consultar_avisos, ativo
    from mni_conectores where id = ${id}`;
  return { linha, dados, certificadoId };
}

const itemDjen = (processo: { numero: string; digitos: string }, extra: Partial<ItemDjen> = {}): ItemDjen => ({
  id: 990000001,
  hash: "teste-hash-1",
  data_disponibilizacao: "2026-09-04",
  siglaTribunal: "TJPA",
  tipoComunicacao: "Intimação",
  nomeOrgao: "Vara de teste",
  texto: "PODER JUDICIÁRIO<br>Intime-se a parte autora para, no prazo de 15 (quinze) dias, manifestar-se.",
  numero_processo: processo.digitos,
  numeroprocessocommascara: processo.numero,
  meio: "D",
  link: "https://pje.tjpa.jus.br/documento-teste",
  tipoDocumento: "Despacho",
  nomeClasse: "PROCEDIMENTO COMUM CÍVEL",
  ativo: true,
  status: "P",
  motivo_cancelamento: null,
  data_cancelamento: null,
  destinatarios: [{ nome: "PARTE DE TESTE", polo: "A" }],
  destinatarioadvogados: [{ advogado: { nome: "ADVOGADA DE TESTE", numero_oab: "28114", uf_oab: "PA" } }],
  ...extra,
});

before(async () => {
  await bancoPronto();
});

after(async () => {
  await sql.end({ timeout: 5 });
});

describe("robô de captura — DJEN", () => {
  it("publicação é o primeiro dia útil após a disponibilização", async () => {
    const regras = await regrasDoEscritorio(sql);
    assert.equal(publicacaoDe("2026-09-04", regras), "08/09/2026"); // sexta → pula sábado, domingo e 07/09
    assert.equal(publicacaoDe("2026-09-10", regras), "11/09/2026");
  });

  it("grava intimação e andamento, é idempotente e registra cancelamento", () =>
    isolado(async (tx) => {
      const processo = await processoTjpa(tx);
      // OAB sem histórico: com consulta anterior, a janela começa 2 dias antes do último sucesso.
      const oab = { numero: "99901", uf: "PA" };
      const lote = [
        itemDjen(processo),
        itemDjen({ numero: "9999999-99.9999.8.14.9999", digitos: "99999999999999999999" }, { id: 990000002, hash: "teste-hash-2" }),
      ];
      let janela = { inicio: "", fim: "" };
      const buscar = async (_o: typeof oab, inicio: string, fim: string) => {
        janela = { inicio, fim };
        return { itens: lote, requisicoes: 3, truncado: false };
      };

      const c1 = contagem();
      await capturarOab(tx, oab, c1, { hoje: "2026-09-14", buscar });
      assert.deepEqual([c1.novos, c1.lidos, c1.requisicoes], [2, 2, 3]);
      assert.deepEqual(janela, { inicio: "2026-08-15", fim: "2026-09-14" });

      const [vinculada] = await tx<{ processoId: string | null; publicacao: string; disponibilizacao: string; teor: string; origem: string; link: string }[]>`
        select processo_id, publicacao, disponibilizacao, teor, origem, link from intimacoes where chave_origem = 'djen:teste-hash-1'`;
      assert.equal(vinculada.processoId, processo.id);
      assert.equal(vinculada.disponibilizacao, "04/09/2026");
      assert.equal(vinculada.publicacao, "08/09/2026");
      assert.equal(vinculada.origem, "djen");
      assert.ok(!vinculada.teor.includes("<br>") && vinculada.teor.includes("15 (quinze) dias"));

      const [avulsa] = await tx<{ processoId: string | null }[]>`select processo_id from intimacoes where chave_origem = 'djen:teste-hash-2'`;
      assert.equal(avulsa.processoId, null);

      const [{ andamentos }] = await tx<{ andamentos: number }[]>`
        select count(*)::int as andamentos from andamentos where origem = 'djen' and identificador = 'teste-hash-1' and not lido`;
      assert.equal(andamentos, 1);

      const c2 = contagem();
      await capturarOab(tx, oab, c2, { hoje: "2026-09-14", buscar });
      assert.equal(c2.novos, 0, "a segunda leitura não duplica");
      const [{ total }] = await tx<{ total: number }[]>`select count(*)::int as total from intimacoes where chave_origem like 'djen:teste-hash-%'`;
      assert.equal(total, 2);

      await tx`insert into captura_estado (fonte, alvo, ultimo_sucesso) values ('djen', 'oab:99901/PA', '2026-09-12T15:00:00-03:00')`;
      await capturarOab(tx, oab, contagem(), { hoje: "2026-09-14", buscar });
      assert.deepEqual(janela, { inicio: "2026-09-10", fim: "2026-09-14" }, "recua 2 dias a partir do último sucesso");

      lote[0] = itemDjen(processo, { ativo: false, motivo_cancelamento: "Publicado por engano", data_cancelamento: "2026-09-05T10:00:00" });
      await capturarOab(tx, oab, contagem(), { hoje: "2026-09-14", buscar });
      const [cancelada] = await tx<{ canceladaEm: Date | null }[]>`select cancelada_em from intimacoes where chave_origem = 'djen:teste-hash-1'`;
      assert.ok(cancelada.canceladaEm instanceof Date);
      const [comunicacao] = await tx<{ ativo: boolean; motivoCancelamento: string }[]>`
        select ativo, motivo_cancelamento from djen_comunicacoes where hash = 'teste-hash-1'`;
      assert.deepEqual(comunicacao, { ativo: false, motivoCancelamento: "Publicado por engano" });
    }));
});

describe("robô de captura — disjuntor", () => {
  it("pausa 5, 10 e 6 h conforme o tipo de falha e zera no sucesso", () =>
    isolado(async (tx) => {
      const alvo = "oab:0000/PA";
      const r1 = await executarAlvo(tx, "djen", alvo, async () => Promise.reject(new ErroDjen("fora do ar", 503, true)));
      const r2 = await executarAlvo(tx, "djen", alvo, async () => Promise.reject(new ErroDjen("fora do ar", 503, true)));
      const r3 = await executarAlvo(tx, "djen", alvo, async () => Promise.reject(new ErroMni("Usuário ou senha inválidos.", false)));
      assert.deepEqual([r1.pausadoMinutos, r2.pausadoMinutos, r3.pausadoMinutos], [5, 10, 360]);

      const [pausado] = await tx<{ falhasSeguidas: number; ultimoErro: string; minutos: number }[]>`
        select falhas_seguidas, ultimo_erro, extract(epoch from pausado_ate - now())::int / 60 as minutos
        from captura_estado where fonte = 'djen' and alvo = ${alvo}`;
      assert.deepEqual(pausado, { falhasSeguidas: 3, ultimoErro: "Usuário ou senha inválidos.", minutos: 360 });

      const ok = await executarAlvo(tx, "djen", alvo, async (c) => {
        c.lidos = 4;
        c.novos = 1;
        c.requisicoes = 2;
      });
      assert.deepEqual([ok.status, ok.lidos, ok.novos], ["sucesso", 4, 1]);
      const [zerado] = await tx<{ falhasSeguidas: number; pausadoAte: Date | null; ultimoSucesso: Date | null }[]>`
        select falhas_seguidas, pausado_ate, ultimo_sucesso from captura_estado where fonte = 'djen' and alvo = ${alvo}`;
      assert.equal(zerado.falhasSeguidas, 0);
      assert.equal(zerado.pausadoAte, null);
      assert.ok(zerado.ultimoSucesso instanceof Date);

      const execucoes = await tx<{ status: string }[]>`select status from captura_execucoes where alvo = ${alvo} order by id`;
      assert.deepEqual(execucoes.map((e) => e.status), ["falha", "falha", "falha", "sucesso"]);
    }));
});

describe("robô de captura — MNI", () => {
  it("só baixa o processo quando o hash de movimentações muda", () =>
    isolado(async (tx) => {
      const processo = await processoTjpa(tx);
      await tx`insert into mni_conectores (id, tribunal, grau, url) values ('teste-sim', 'TJPA', '1º grau', 'https://simulado.invalid')`;
      const cenario: CenarioMni = {
        processos: {
          [processo.digitos]: {
            classe: 7,
            orgao: "Vara de teste",
            movimentos: [
              { dataHora: "20240312101500", descricao: "Distribuído por sorteio", codigo: 26 },
              { dataHora: "20260818143000", descricao: "Juntada de petição" },
            ],
          },
        },
      };
      const cliente = criarClienteMni({ url: "https://simulado.invalid", idConsultante: "1", senhaConsultante: "" }, transporteSimulado(cenario));
      const conector = { id: "teste-sim", tribunal: "TJPA" };

      const c1 = contagem();
      await capturarProcessoMni(tx, conector, processo, cliente, c1);
      assert.deepEqual([c1.novos, c1.requisicoes, c1.detalhes.primeiraCarga], [2, 2, true]);
      const historico = await tx<{ lido: boolean; tipo: string; data: string }[]>`
        select lido, tipo, data from andamentos where processo_id = ${processo.id} and origem = 'mni' order by data_hora`;
      assert.deepEqual([...historico], [
        { lido: true, tipo: "Movimentação", data: "12/03/2024" },
        { lido: true, tipo: "Petição", data: "18/08/2026" },
      ]);

      const c2 = contagem();
      await capturarProcessoMni(tx, conector, processo, cliente, c2);
      assert.deepEqual([c2.novos, c2.requisicoes, c2.detalhes.semAlteracao], [0, 1, true], "sem mudança: só consultarAlteracao");

      cenario.processos[processo.digitos].movimentos.push({ dataHora: "20260912090000", descricao: "Sentença proferida" });
      const c3 = contagem();
      await capturarProcessoMni(tx, conector, processo, cliente, c3);
      assert.deepEqual([c3.novos, c3.requisicoes], [1, 2]);
      const [novo] = await tx<{ lido: boolean; tipo: string }[]>`
        select lido, tipo from andamentos where processo_id = ${processo.id} and origem = 'mni' order by data_hora desc limit 1`;
      assert.deepEqual(novo, { lido: false, tipo: "Decisão" });
    }));

  it("avisos pendentes viram intimação sem abrir o teor, com ciência tácita em 10 dias", () =>
    isolado(async (tx) => {
      const processo = await processoTjpa(tx);
      await tx`insert into mni_conectores (id, tribunal, grau, url) values ('teste-sim', 'TJPA', '1º grau', 'https://simulado.invalid')`;
      const operacoes: string[] = [];
      const base = transporteSimulado({
        processos: {},
        avisos: [{ idAviso: "AV-T1", numero: processo.digitos, dataDisponibilizacao: "20260910080000", destinatario: "ADVOGADA" }],
      });
      const espiao: Transporte = async (url, xml, o) => {
        operacoes.push(xml.match(/<ser:(\w+)>/)?.[1] ?? "");
        return base(url, xml, o);
      };
      const cliente = criarClienteMni({ url: "https://simulado.invalid", idConsultante: "1", senhaConsultante: "" }, espiao);

      const c = contagem();
      await capturarAvisosMni(tx, { id: "teste-sim", tribunal: "TJPA" }, cliente, c);
      await capturarAvisosMni(tx, { id: "teste-sim", tribunal: "TJPA" }, cliente, contagem());
      assert.equal(c.novos, 1);
      assert.deepEqual(operacoes, ["consultarAvisosPendentes", "consultarAvisosPendentes"], "nunca chama consultarTeorComunicacao");

      const intimacoes = await tx<{ processoId: string; publicacao: string; teor: string; origem: string }[]>`
        select processo_id, publicacao, teor, origem from intimacoes where chave_origem = 'mni:teste-sim:AV-T1'`;
      assert.equal(intimacoes.length, 1);
      assert.equal(intimacoes[0].processoId, processo.id);
      assert.equal(intimacoes[0].publicacao, "20/09/2026");
      assert.match(intimacoes[0].teor, /não aberto/);
      const [aviso] = await tx<{ teorAbertoEm: Date | null }[]>`select teor_aberto_em from mni_avisos where id_aviso = 'AV-T1'`;
      assert.equal(aviso.teorAbertoEm, null);
    }));

  it("monta credenciais a partir do certificado cifrado e recusa configurações inválidas", () =>
    isolado(async (tx) => {
      const processo = await processoTjpa(tx);
      await tx`insert into mni_conectores (id, tribunal, grau, url) values ('teste-simulado', 'TJPA', '1º grau', 'https://x.invalid')`;
      const [simulado] = await tx<ConectorLinha[]>`
        select id, tribunal, grau, url, modo, certificado_id, id_consultante, senha_consultante_cifrada, consultar_avisos, ativo
        from mni_conectores where id = 'teste-simulado'`;
      await assert.rejects(montarCliente(tx, simulado), (e: unknown) => e instanceof ErroMni && !e.transitorio && /simulado/.test(e.message));
      await assert.rejects(montarCliente(tx, { ...simulado, modo: "real" }), /sem certificado/);

      const { linha, dados, certificadoId } = await conectorReal(tx, "teste-real", { senha: "certa" });
      const chamadas: { xml: string; pfx?: Buffer; senhaPfx?: string }[] = [];
      const base = transporteSimulado({
        processos: { [processo.digitos]: { classe: 7, orgao: "Vara", movimentos: [] } },
        senhaValida: "certa",
      });
      const espiao: Transporte = async (url, xml, o) => {
        chamadas.push({ xml, pfx: o.pfx, senhaPfx: o.senhaPfx });
        return base(url, xml, o);
      };

      const { cliente, certificadoId: usado } = await montarCliente(tx, linha, espiao);
      await cliente.consultarAlteracao(processo.numero);
      assert.equal(usado, certificadoId);
      assert.match(chamadas[0].xml, /<tip:idConsultante>12345678901<\/tip:idConsultante>/, "CPF vem do certificado");
      assert.match(chamadas[0].xml, /<tip:senhaConsultante>certa<\/tip:senhaConsultante>/);
      assert.ok(chamadas[0].pfx?.equals(dados.pfx), "o .pfx decifrado vai para o TLS");
      assert.equal(chamadas[0].senhaPfx, "segredo");

      await tx`update certificados set valido_ate = now() - interval '1 day' where id = ${certificadoId}`;
      await assert.rejects(montarCliente(tx, linha, espiao), /vencido/);
    }));
});

describe("robô de captura — ciclo completo", () => {
  it("roda DJEN por OAB e MNI por processo monitorado, auditando o uso do certificado", () =>
    isolado(async (tx) => {
      const consultadas: string[] = [];
      const buscar = async (oab: { numero: string; uf: string }) => {
        consultadas.push(`${oab.numero}/${oab.uf}`);
        return { itens: [], requisicoes: 1, truncado: false };
      };
      const { linha } = await conectorReal(tx, "teste-ciclo");
      const monitorados = await tx<{ id: string; numero: string }[]>`
        select id, numero from processos where monitorado and situacao = 'Ativo'
          and regexp_replace(tribunal, '[^A-Za-z]', '', 'g') ilike 'TJPA' and instancia like '1%'`;
      const cenario: CenarioMni = {
        processos: Object.fromEntries(
          monitorados.map((p) => [p.numero.replace(/\D/g, ""), { classe: 7, orgao: "Vara", movimentos: [{ dataHora: "20260901100000", descricao: "Conclusos" }] }]),
        ),
        avisos: [],
      };
      const oabsEsperadas = (await tx<{ oab: string }[]>`select oab from usuarios where ativo and oab ~ '\\d'`).length;

      const r = await executarCiclo({ db: tx, buscar, transporte: transporteSimulado(cenario), forcar: true, hoje: "2026-09-14", orcamentoMs: 60_000 });
      assert.equal(r.ignorado, undefined);
      assert.equal(consultadas.length, oabsEsperadas);
      const falhas = r.execucoes.filter((e) => e.status === "falha");
      assert.deepEqual(falhas, []);
      const mni = r.execucoes.filter((e) => e.fonte === "mni");
      assert.equal(mni.length, monitorados.length + 1, "um alvo por processo monitorado + caixa de avisos");
      assert.ok(mni.filter((e) => e.alvo.startsWith("processo:")).every((e) => e.novos === 1));

      const [{ usos }] = await tx<{ usos: number }[]>`select count(*)::int as usos from certificado_usos where certificado_id = ${linha.certificadoId}`;
      assert.equal(usos, monitorados.length + 1);

      const r2 = await executarCiclo({ db: tx, buscar, transporte: transporteSimulado(cenario), hoje: "2026-09-14" });
      assert.equal(r2.execucoes.length, 0, "sem forçar, respeita o intervalo mínimo de cada alvo");
    }));

  it("não roda dois ciclos ao mesmo tempo", async () => {
    const outra = await sql.reserve();
    try {
      await outra`select pg_advisory_lock(724200)`;
      const r = await executarCiclo({ buscar: async () => ({ itens: [], requisicoes: 0, truncado: false }), forcar: true });
      assert.match(r.ignorado ?? "", /já está em andamento/);
      assert.equal(r.execucoes.length, 0);
    } finally {
      await outra`select pg_advisory_unlock(724200)`;
      outra.release();
    }
  });
});
