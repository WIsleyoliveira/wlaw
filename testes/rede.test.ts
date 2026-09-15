import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buscarPorOab } from "@/lib/captura/djen";
import { mesmaOab } from "@/lib/captura/oab";

const ligado = process.env.WLAW_TESTE_REDE === "1";
const iso = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Belem" }).format(d);

describe("DJEN ao vivo — só leitura", { skip: ligado ? false : "defina WLAW_TESTE_REDE=1 para consultar a API real" }, () => {
  it("consulta as variantes da OAB, pagina e devolve só a OAB exata", async () => {
    const oab = { numero: "9124", uf: "PA" };
    const hoje = new Date();
    const inicio = new Date(hoje.getTime() - 90 * 86_400_000);
    const r = await buscarPorOab(oab, iso(inicio), iso(hoje));
    console.log(`DJEN real: ${r.itens.length} comunicações para a OAB em 90 dias, ${r.requisicoes} requisições, truncado=${r.truncado}`);
    assert.ok(r.requisicoes >= 3, "consulta as três grafias da OAB");
    assert.ok(r.itens.length > 0, "a OAB pública escolhida tem publicações recentes");
    for (const item of r.itens) {
      assert.ok(item.destinatarioadvogados.some(({ advogado }) => mesmaOab(advogado.numero_oab, advogado.uf_oab, oab)));
      assert.match(item.data_disponibilizacao, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(item.hash && item.numero_processo);
    }
    assert.equal(new Set(r.itens.map((i) => i.hash)).size, r.itens.length, "sem duplicatas entre as variantes");
  });
});
