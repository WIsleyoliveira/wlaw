import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import { cifrar, decifrar, inspecionarPfx } from "@/lib/captura/cofre";
import { criarClienteMni } from "@/lib/captura/mni/cliente";
import { transporteSimulado, type CenarioMni } from "@/lib/captura/mni/simulador";
import { ErroMni, envelope, lerDataMni, lerResposta } from "@/lib/captura/mni/soap";
import { lerOab, mesmaOab, variantesOab } from "@/lib/captura/oab";
import { gerarPfx } from "./apoio";

process.env.WLAW_CHAVE_MESTRA ??= crypto.randomBytes(32).toString("base64");

describe("OAB", () => {
  it("lê os formatos usados no cadastro e no DJEN", () => {
    assert.deepEqual(lerOab("OAB/PA 28.114"), { numero: "28114", uf: "PA" });
    assert.deepEqual(lerOab("28.114/PA"), { numero: "28114", uf: "PA" });
    assert.deepEqual(lerOab("9124PA"), { numero: "9124", uf: "PA" });
    assert.equal(lerOab("Estagiária"), null);
    assert.equal(lerOab("—"), null);
  });
  it("gera variantes de consulta e só casa a OAB exata", () => {
    assert.deepEqual(variantesOab({ numero: "28114", uf: "PA" }), ["28114", "28114PA", "28.114"]);
    assert.ok(mesmaOab("28.114", "pa", { numero: "28114", uf: "PA" }));
    assert.ok(mesmaOab("028114PA", "PA", { numero: "28114", uf: "PA" }));
    assert.ok(!mesmaOab("281140", "PA", { numero: "28114", uf: "PA" }));
    assert.ok(!mesmaOab("28114", "SP", { numero: "28114", uf: "PA" }));
  });
});

describe("cofre de certificados", () => {
  it("cifra e decifra com AES-256-GCM", () => {
    const pacote = cifrar(Buffer.from("conteúdo sigiloso"), "certificado:x:pfx");
    assert.equal(decifrar(pacote, "certificado:x:pfx").toString(), "conteúdo sigiloso");
  });
  it("recusa pacote usado em outro registro ou adulterado", () => {
    const pacote = cifrar(Buffer.from("abc"), "certificado:a:pfx");
    assert.throws(() => decifrar(pacote, "certificado:b:pfx"));
    const adulterado = Buffer.from(pacote);
    adulterado[adulterado.length - 1] ^= 1;
    assert.throws(() => decifrar(adulterado, "certificado:a:pfx"));
  });
  it("abre A1 ICP-Brasil, extrai titular e CPF e regrava para o OpenSSL 3", () => {
    const d = inspecionarPfx(gerarPfx(), "segredo");
    assert.equal(d.titular, "FULANA DE TAL");
    assert.equal(d.cpf, "12345678901");
    assert.equal(d.emissor, "AC TESTE WLAW");
    assert.match(d.impressaoDigital, /^[0-9a-f]{64}$/);
    assert.ok(d.validoAte > new Date());
    assert.ok(d.pfx.length > 0);
  });
  it("aceita A1 moderno (AES-256) sem regravar", () => {
    const original = gerarPfx({ algoritmo: "aes256" });
    const d = inspecionarPfx(original, "segredo");
    assert.ok(d.pfx.equals(original));
  });
  it("recusa senha errada, arquivo inválido e certificado vencido", () => {
    assert.throws(() => inspecionarPfx(gerarPfx(), "errada"), /senha incorreta/);
    assert.throws(() => inspecionarPfx(Buffer.from("não é pfx"), "x"), /senha incorreta|não é/);
    assert.throws(() => inspecionarPfx(gerarPfx({ dias: -1 }), "segredo"), /vencido/);
  });
});

const NUMERO = "08033713520248140097";
const cenario = (): CenarioMni => ({
  processos: {
    [NUMERO]: {
      classe: 7,
      orgao: "2ª Vara Cível de Ananindeua",
      movimentos: [
        { dataHora: "20240312101500", descricao: "Distribuído por sorteio", codigo: 26 },
        { dataHora: "20260818143000", descricao: "Decisão & despacho <urgente>" },
      ],
    },
  },
  avisos: [{ idAviso: "AV1", numero: NUMERO, dataDisponibilizacao: "20260910080000", destinatario: "FULANA DE TAL" }],
  senhaValida: "certa",
});

describe("MNI 2.2.2 (SOAP)", () => {
  it("monta envelope na ordem do WSDL e escapa XML", () => {
    const xml = envelope("consultarProcesso", [["idConsultante", "123"], ["senhaConsultante", "a<b&c"], ["movimentos", true], ["vazio", ""]]);
    assert.match(xml, /<ser:consultarProcesso><tip:idConsultante>123<\/tip:idConsultante><tip:senhaConsultante>a&lt;b&amp;c<\/tip:senhaConsultante><tip:movimentos>true<\/tip:movimentos><\/ser:consultarProcesso>/);
    assert.ok(!xml.includes("vazio"));
  });
  it("lê data do MNI no horário de Brasília", () => {
    assert.equal(lerDataMni("20260818143000")?.toISOString(), "2026-08-18T17:30:00.000Z");
    assert.equal(lerDataMni("20260818")?.toISOString(), "2026-08-18T03:00:00.000Z");
    assert.equal(lerDataMni("inválida"), null);
  });

  const cliente = (c = cenario(), senha = "certa") =>
    criarClienteMni({ url: "https://simulado", idConsultante: "12345678901", senhaConsultante: senha }, transporteSimulado(c));

  it("consultarAlteracao devolve hashes estáveis e muda quando entra movimento", async () => {
    const c = cenario();
    const a = await cliente(c).consultarAlteracao(NUMERO);
    const b = await cliente(c).consultarAlteracao("0803371-35.2024.8.14.0097");
    assert.equal(a.hashMovimentacoes, b.hashMovimentacoes);
    c.processos[NUMERO].movimentos.push({ dataHora: "20260901090000", descricao: "Conclusos" });
    assert.notEqual((await cliente(c).consultarAlteracao(NUMERO)).hashMovimentacoes, a.hashMovimentacoes);
  });
  it("consultarProcesso lê cabeçalho e movimentos nacionais e locais", async () => {
    const r = await cliente().consultarProcesso(NUMERO);
    assert.equal(r.cabecalho?.orgao, "2ª Vara Cível de Ananindeua");
    assert.equal(r.cabecalho?.classe, 7);
    assert.equal(r.cabecalho?.polos[0].partes[0], "PARTE AUTORA SIMULADA");
    assert.equal(r.movimentos.length, 2);
    assert.equal(r.movimentos[0].codigoNacional, 26);
    assert.equal(r.movimentos[0].descricao, "Distribuído por sorteio");
    assert.equal(r.movimentos[1].descricao, "Decisão & despacho <urgente>");
    assert.equal(r.movimentos[1].identificador, `sim-${NUMERO}-1`);
  });
  it("consultarAvisosPendentes lista avisos sem teor", async () => {
    const avisos = await cliente().consultarAvisosPendentes();
    assert.equal(avisos.length, 1);
    assert.equal(avisos[0].idAviso, "AV1");
    assert.equal(avisos[0].numeroProcesso, NUMERO);
    assert.equal(avisos[0].destinatario, "FULANA DE TAL");
  });
  it("consultarTeorComunicacao devolve teor e prazo", async () => {
    const [c] = await cliente().consultarTeorComunicacao(NUMERO, "AV1");
    assert.equal(c.id, "AV1");
    assert.equal(c.prazo, 15);
    assert.match(c.teor, /Teor simulado/);
  });
  it("senha errada é erro definitivo (não fica tentando)", async () => {
    await assert.rejects(cliente(cenario(), "errada").consultarProcesso(NUMERO), (e: unknown) => e instanceof ErroMni && !e.transitorio && /senha/i.test(e.message));
  });
  it("processo inexistente é recusado com a mensagem do tribunal", async () => {
    await assert.rejects(cliente().consultarProcesso("00000000000000000000"), /não encontrado/);
  });
  it("tribunal fora do ar é erro transitório", async () => {
    await assert.rejects(cliente({ ...cenario(), falha: "fora-do-ar" }).consultarAlteracao(NUMERO), (e: unknown) => e instanceof ErroMni && e.transitorio);
  });
  it("respeita cancelamento (tribunal travado)", async () => {
    const controle = new AbortController();
    const promessa = criarClienteMni({ url: "x", idConsultante: "1", senhaConsultante: "" }, transporteSimulado({ ...cenario(), falha: "lento" })).consultarAlteracao(NUMERO, controle.signal);
    controle.abort();
    await assert.rejects(promessa);
  });
  it("SOAP Fault vira erro legível", () => {
    const fault = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><s:Fault><faultstring>Erro interno</faultstring></s:Fault></s:Body></s:Envelope>`;
    assert.throws(() => lerResposta(500, fault, "consultarProcesso"), (e: unknown) => e instanceof ErroMni && e.transitorio && /Erro interno/.test(e.message));
    assert.throws(() => lerResposta(502, "<html>gateway</html>", "consultarProcesso"), (e: unknown) => e instanceof ErroMni && e.transitorio);
  });
});
