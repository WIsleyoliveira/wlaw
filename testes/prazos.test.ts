import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ajustarAoHoje, calcularPrazo, extrairPrazoDoTexto, margemDias, pecasCabiveis, ramoDoNumero, recuarDiasUteis, regrasDe } from "@/lib/prazos";
import type { Config } from "@/lib/tipos";

const config = { art220: "Aplicar automaticamente", margem: "Data prevista = fatal − 2 dias" } as Config;
const regras = regrasDe(config, [{ id: "f", data: "08/12/2026", nome: "Recesso TJ-PA", tipo: "Tribunal" }], "Justiça Estadual");

describe("motor de prazos", () => {
  it("conta dias úteis descontando feriado nacional", () => {
    const r = calcularPrazo("03/09/2026", 15, true, regras);
    assert.equal(r.fatal, "25/09/2026");
    assert.deepEqual(r.feriados, ["07/09/2026 (Independência do Brasil)"]);
  });
  it("prazo do teor em dias úteis", () => assert.equal(calcularPrazo("01/09/2026", 10, true, regras).fatal, "16/09/2026"));
  it("suspende no recesso do art. 220", () => {
    const r = calcularPrazo("18/12/2026", 5, true, regras);
    assert.deepEqual([r.fatal, r.suspenso], ["27/01/2027", true]);
  });
  it("eleitoral corre em dias corridos e sem recesso", () =>
    assert.equal(calcularPrazo("18/12/2026", 3, false, regrasDe(config, [], "Justiça Eleitoral")).fatal, "21/12/2026"));
  it("prorroga vencimento em fim de semana", () =>
    assert.equal(calcularPrazo("02/09/2026", 3, false, regrasDe(config, [], "Justiça Eleitoral")).fatal, "08/09/2026"));
  it("desconta Sexta-feira Santa calculada pela Páscoa", () => assert.equal(calcularPrazo("25/03/2027", 1, true, regras).fatal, "29/03/2027"));
  it("desconta feriado cadastrado pelo escritório", () => assert.equal(calcularPrazo("07/12/2026", 1, true, regras).fatal, "09/12/2026"));
  it("margem de segurança recua dias úteis", () => {
    assert.equal(recuarDiasUteis("25/09/2026", margemDias(config), "03/09/2026", regras), "23/09/2026");
    assert.equal(recuarDiasUteis("09/09/2026", 2, "01/09/2026", regras), "04/09/2026");
  });
  it("extrai prazo escrito no teor e ignora datas de sessão", () => {
    assert.equal(extrairPrazoDoTexto("manifestar-se no prazo comum de 10 (dez) dias.")?.dias, 10);
    assert.equal(extrairPrazoDoTexto("no prazo de 48 dias corridos")?.uteis, false);
    assert.equal(extrairPrazoDoTexto("Prazo recursal na forma da lei."), null);
    assert.equal(extrairPrazoDoTexto("Inclusão em pauta da sessão do dia 22/09/2026."), null);
  });
  it("não deixa a prevista no passado e avisa fatal vencido", () => {
    const hoje = new Date(2026, 8, 15);
    assert.deepEqual(ajustarAoHoje("20/09/2026", "22/09/2026", hoje), { prevista: "20/09/2026", avisos: [] });
    const curto = ajustarAoHoje("14/09/2026", "16/09/2026", hoje);
    assert.equal(curto.prevista, "15/09/2026");
    assert.match(curto.avisos[0], /Prazo curto/);
    assert.equal(ajustarAoHoje("15/09/2026", "15/09/2026", hoje).avisos.length, 0, "vence hoje ainda está no prazo");
    const vencido = ajustarAoHoje("10/09/2026", "12/09/2026", hoje);
    assert.equal(vencido.prevista, "10/09/2026");
    assert.match(vencido.avisos[0], /já passou/);
  });

  it("identifica ramo pelo número CNJ e filtra peças", () => {
    assert.equal(ramoDoNumero("0913657-84.2023.5.08.0001"), "Justiça do Trabalho");
    assert.equal(ramoDoNumero("123"), "não identificado");
    const estadual = pecasCabiveis("Justiça Estadual", false).map((p) => p.peca);
    assert.ok(estadual.includes("Apelação") && !estadual.includes("Recurso ordinário trabalhista") && !estadual.includes("Recurso inominado"));
    assert.ok(pecasCabiveis("Justiça Estadual", true).some((p) => p.peca === "Recurso inominado"));
  });
});
