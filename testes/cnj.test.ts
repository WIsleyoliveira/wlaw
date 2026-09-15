import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { comarcaDoOrgao, resumirProcessoDjen, tituloProprio } from "@/lib/captura/processo-djen";
import type { ItemDjen } from "@/lib/captura/djen";
import { cnjValido, digitosCnj, formatarCnj, tribunalDoCnj, ufDoCnj } from "@/lib/cnj";

describe("número CNJ", () => {
  it("confere o dígito verificador com números reais", () => {
    assert.ok(cnjValido("0815616-14.2025.8.14.0301"));
    assert.ok(cnjValido("08156161420258140301"));
    assert.ok(cnjValido("1022340-79.2026.4.01.3900"));
    assert.ok(cnjValido("0000042-36.2000.8.14.0082"));
    assert.ok(!cnjValido("0815616-15.2025.8.14.0301"), "DV trocado");
    assert.ok(!cnjValido("0815616-14.2025.8.14.030"), "faltando dígito");
    assert.ok(!cnjValido(""));
  });
  it("formata e extrai dígitos", () => {
    assert.equal(digitosCnj("0815616-14.2025.8.14.0301"), "08156161420258140301");
    assert.equal(formatarCnj("08156161420258140301"), "0815616-14.2025.8.14.0301");
    assert.equal(formatarCnj("123"), "123");
  });
  it("deduz o tribunal pela numeração", () => {
    assert.equal(tribunalDoCnj("0815616-14.2025.8.14.0301"), "TJ-PA");
    assert.equal(tribunalDoCnj("7004755-22.2024.8.22.0000"), "TJ-RO");
    assert.equal(tribunalDoCnj("7004755-22.2024.8.26.0000"), "TJ-SP");
    assert.equal(tribunalDoCnj("1022340-79.2026.4.01.3900"), "TRF1");
    assert.equal(tribunalDoCnj("0913657-84.2023.5.08.0001"), "TRT-8");
    assert.equal(tribunalDoCnj("0000000-00.2023.5.00.0000"), "TST");
    assert.equal(tribunalDoCnj("0601027-62.2026.6.14.0000"), "TRE-PA");
    assert.equal(tribunalDoCnj("0000000-00.2026.3.00.0000"), "STJ");
    assert.equal(tribunalDoCnj("0000000-00.2026.8.99.0000"), null);
    assert.equal(ufDoCnj("0815616-14.2025.8.14.0301"), "PA");
    assert.equal(ufDoCnj("1022340-79.2026.4.01.3900"), null);
  });
});

const item = (extra: Partial<ItemDjen>): ItemDjen => ({
  id: 1, hash: "h1", data_disponibilizacao: "2025-03-10", siglaTribunal: "TJPA", tipoComunicacao: "Intimação",
  nomeOrgao: "2ª Vara da Fazenda de Belém", texto: "", numero_processo: "08156161420258140301",
  numeroprocessocommascara: "0815616-14.2025.8.14.0301", meio: "D", link: "", tipoDocumento: "Decisão",
  nomeClasse: "PROCEDIMENTO COMUM CíVEL", ativo: true, status: "P", motivo_cancelamento: null, data_cancelamento: null,
  destinatarios: [{ nome: "STENIO JUSTINO", polo: "A" }],
  destinatarioadvogados: [{ advogado: { nome: "ELISANGELA ARAUJO", numero_oab: "9124PA", uf_oab: "PA" } }],
  ...extra,
});

describe("dados do processo a partir do DJEN", () => {
  it("normaliza classe e extrai comarca só quando é cidade", () => {
    assert.equal(tituloProprio("PROCEDIMENTO DO JUIZADO ESPECIAL CíVEL"), "Procedimento do Juizado Especial Cível");
    assert.equal(comarcaDoOrgao("2ª Vara Cível e Empresarial de Ananindeua", "PA"), "Ananindeua - PA");
    assert.equal(comarcaDoOrgao("1ª Vara do Juizado Especial da Fazenda Pública de Belém", "PA"), "Belém - PA");
    assert.equal(comarcaDoOrgao("Vara de Família", "PA"), "");
    assert.equal(comarcaDoOrgao("Núcleo de Justiça 4.0", "RO"), "");
    assert.equal(comarcaDoOrgao("Turma Recursal", "PA"), "");
    assert.equal(comarcaDoOrgao("Vara Única de São João do Araguaia", "PA"), "São João do Araguaia - PA");
    assert.equal(comarcaDoOrgao("3ª Vara do Trabalho de Belém", null), "Belém");
  });
  it("resume usando a publicação mais recente e junta partes e advogados sem repetir", () => {
    const r = resumirProcessoDjen("08156161420258140301", [
      item({}),
      item({ hash: "h2", data_disponibilizacao: "2026-09-11", nomeOrgao: "1ª Vara do Juizado Especial da Fazenda Pública de Belém", nomeClasse: "PROCEDIMENTO DO JUIZADO ESPECIAL CíVEL", destinatarios: [{ nome: "STENIO JUSTINO", polo: "A" }, { nome: "ESTADO DO PARÁ", polo: "P" }] }),
      item({ hash: "h3", data_disponibilizacao: "2026-09-12", ativo: false, nomeOrgao: "Órgão cancelado" }),
    ]);
    assert.equal(r.encontrado, true);
    assert.equal(r.numero, "0815616-14.2025.8.14.0301");
    assert.equal(r.tribunal, "TJ-PA");
    assert.equal(r.orgao, "1ª Vara do Juizado Especial da Fazenda Pública de Belém", "cancelada não conta");
    assert.equal(r.classe, "Procedimento do Juizado Especial Cível");
    assert.equal(r.comarca, "Belém - PA");
    assert.equal(r.publicacoes, 2);
    assert.equal(r.ultimaPublicacao, "11/09/2026");
    assert.deepEqual(r.partes, [{ nome: "STENIO JUSTINO", polo: "Polo ativo" }, { nome: "ESTADO DO PARÁ", polo: "Polo passivo" }]);
    assert.deepEqual(r.advogados, [{ nome: "ELISANGELA ARAUJO", oab: "9124/PA" }]);
  });
  it("sem publicação ainda devolve o tribunal deduzido do número", () => {
    const r = resumirProcessoDjen("1022340-79.2026.4.01.3900", []);
    assert.deepEqual([r.encontrado, r.tribunal, r.publicacoes], [false, "TRF1", 0]);
  });
});
