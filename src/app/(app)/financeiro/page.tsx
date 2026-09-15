import { exigirPagina } from "@/lib/auth/sessao";
import { Topbar } from "@/components/topbar";
import { Badge, Button, Card, CardHeader, Tone, cx } from "@/components/ui";
import { GraficoFluxo, type PontoFluxo } from "@/components/grafico-fluxo";
import { BotaoAcao, Modal } from "@/components/modal";
import { Campo, Entrada } from "@/components/form";
import { IconPlus } from "@/components/icons";
import { ler } from "@/lib/db";
import { criarCobranca, criarContaPagar, pagarConta, quitarCobranca } from "@/lib/acoes";
import { brl, paraData } from "@/lib/util";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function FinanceiroPage() {
  await exigirPagina("financeiro");
  const b = await ler();
  const nome = (id: string) => b.pessoas.find((p) => p.id === id)?.nome ?? "—";
  const clientes = b.pessoas.filter((p) => p.cliente);
  const hoje = new Date();

  const janelaMeses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
    return { ano: d.getFullYear(), mes: d.getMonth() };
  });

  const fluxo: PontoFluxo[] = janelaMeses.map(({ ano, mes }) => {
    const receita = b.cobrancas
      .filter((c) => c.situacao === "Pago")
      .filter((c) => { const d = paraData(c.vencimento); return d.getFullYear() === ano && d.getMonth() === mes; })
      .reduce((s, c) => s + c.valor, 0);
    const despesa = b.contasPagar
      .filter((c) => c.situacao === "Pago")
      .filter((c) => { const d = paraData(c.vencimento); return d.getFullYear() === ano && d.getMonth() === mes; })
      .reduce((s, c) => s + c.valor, 0);
    return { mes: `${MESES[mes]}/${String(ano).slice(2)}`, receita, despesa };
  });

  const mesAtual = fluxo[fluxo.length - 1];
  const mesAnterior = fluxo[fluxo.length - 2];
  const resultado = mesAtual.receita - mesAtual.despesa;
  const variacao = mesAnterior.receita > 0 ? Math.round(((mesAtual.receita - mesAnterior.receita) / mesAnterior.receita) * 100) : 0;

  const aReceber = b.cobrancas.filter((c) => c.situacao !== "Pago");
  const aPagar = b.contasPagar.filter((c) => c.situacao !== "Pago");
  const vencido = aReceber.filter((c) => c.situacao === "Vencido").reduce((s, c) => s + c.valor, 0);
  const carteira = aReceber.reduce((s, c) => s + c.valor, 0);

  const centrosCusto = Object.entries(
    b.contasPagar.reduce<Record<string, number>>((acc, c) => {
      acc[c.categoria] = (acc[c.categoria] ?? 0) + c.valor;
      return acc;
    }, {}),
  ).map(([nome, valor]) => ({ nome, valor })).sort((a, c) => c.valor - a.valor);
  const maxCentro = Math.max(1, ...centrosCusto.map((c) => c.valor));

  const tiles: { label: string; valor: number; nota: string; tone: Tone }[] = [
    { label: `Receita — ${mesAtual.mes}`, valor: mesAtual.receita, nota: mesAnterior.receita > 0 ? `${variacao > 0 ? "+" : ""}${variacao}% vs. mês anterior` : "sem base de comparação", tone: variacao >= 0 ? "ok" : "danger" },
    { label: `Despesa — ${mesAtual.mes}`, valor: mesAtual.despesa, nota: `${centrosCusto.length} categorias`, tone: "neutral" },
    { label: "Resultado", valor: resultado, nota: mesAtual.receita > 0 ? `Margem de ${Math.round((resultado / mesAtual.receita) * 100)}%` : "sem receita no mês", tone: "gold" },
    { label: "Inadimplência", valor: vencido, nota: carteira > 0 ? `${Math.round((vencido / carteira) * 100)}% da carteira` : "sem carteira em aberto", tone: "danger" },
  ];

  const selecaoCliente = () => (
    <select name="clienteId" required className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400">
      {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
    </select>
  );

  return (
    <>
      <Topbar title="Financeiro" />
      <main className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 *:min-w-0">
          {tiles.map((t) => (
            <Card key={t.label} className="px-5 py-4">
              <p className="text-[13px] font-medium text-ink-700">{t.label}</p>
              <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{brl(t.valor)}</p>
              <div className="mt-2.5">
                <Badge tone={t.tone}>{t.nota}</Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_340px] *:min-w-0">
          <Card>
            <CardHeader title="Fluxo de caixa" hint="Últimos 6 meses · regime de caixa" />
            <GraficoFluxo dados={fluxo} />
          </Card>

          <Card>
            <CardHeader title="Despesa por centro de custo" hint="Contas a pagar por categoria" />
            {centrosCusto.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-ink-500">Nenhuma despesa lançada.</p>
            ) : (
              <ul className="space-y-3 px-5 pb-5">
                {centrosCusto.map((c) => (
                  <li key={c.nome}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13px] text-ink-700">{c.nome}</span>
                      <span className="text-[13px] font-medium tabular-nums">{brl(c.valor)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-ink-950" style={{ width: `${(c.valor / maxCentro) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 *:min-w-0">
          <Card>
            <CardHeader
              title="Contas a receber"
              action={
                <Modal
                  titulo="Nova cobrança"
                  acao={criarCobranca}
                  rotuloEnviar="Lançar cobrança"
                  gatilho={<Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Lançar</Button>}
                >
                  <Campo label="Descrição" obrigatorio className="sm:col-span-2">
                    <Entrada name="descricao" placeholder="Ex.: Mensalidade out/2026" required />
                  </Campo>
                  <Campo label="Cliente" obrigatorio>{selecaoCliente()}</Campo>
                  <Campo label="Vencimento" obrigatorio>
                    <Entrada name="vencimento" placeholder="dd/mm/aaaa" required />
                  </Campo>
                  <Campo label="Valor" obrigatorio className="sm:col-span-2">
                    <Entrada name="valor" placeholder="0,00" inputMode="decimal" required />
                  </Campo>
                </Modal>
              }
            />
            {aReceber.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-ink-500">Nada em aberto.</p>
            ) : (
              <ul className="divide-y divide-ink-200 border-t border-ink-200">
                {aReceber.map((r) => (
                  <li key={r.id} className="relative flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
                    <span className={cx("absolute inset-y-0 left-0 w-[3px]", r.situacao === "Vencido" ? "bg-danger" : "bg-gold-400")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{r.descricao}</p>
                      <p className="truncate text-xs text-ink-500">{nome(r.clienteId)} · vence {r.vencimento}</p>
                    </div>
                    <span className="text-[13px] font-medium tabular-nums">{brl(r.valor)}</span>
                    <Badge tone={r.situacao === "Vencido" ? "danger" : "gold"}>{r.situacao}</Badge>
                    <BotaoAcao
                      acao={async () => { "use server"; await quitarCobranca(r.id); }}
                      className="h-8 rounded-lg border border-ink-200 px-2.5 text-[12px] font-medium text-ink-700 hover:border-gold-400"
                    >
                      Dar baixa
                    </BotaoAcao>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3">
              <span className="text-xs text-ink-500">Total em carteira</span>
              <span className="font-display text-[15px] font-semibold tabular-nums">{brl(carteira)}</span>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Contas a pagar"
              action={
                <Modal
                  titulo="Nova conta a pagar"
                  acao={criarContaPagar}
                  rotuloEnviar="Lançar conta"
                  gatilho={<Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Lançar</Button>}
                >
                  <Campo label="Fornecedor" obrigatorio className="sm:col-span-2">
                    <Entrada name="fornecedor" required />
                  </Campo>
                  <Campo label="Categoria">
                    <Entrada name="categoria" placeholder="Ex.: Ocupação" />
                  </Campo>
                  <Campo label="Vencimento" obrigatorio>
                    <Entrada name="vencimento" placeholder="dd/mm/aaaa" required />
                  </Campo>
                  <Campo label="Valor" obrigatorio className="sm:col-span-2">
                    <Entrada name="valor" placeholder="0,00" inputMode="decimal" required />
                  </Campo>
                </Modal>
              }
            />
            {aPagar.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-ink-500">Nada em aberto.</p>
            ) : (
              <ul className="divide-y divide-ink-200 border-t border-ink-200">
                {aPagar.map((p) => (
                  <li key={p.id} className="relative flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-ink-950" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{p.fornecedor}</p>
                      <p className="truncate text-xs text-ink-500">{p.categoria} · vence {p.vencimento}</p>
                    </div>
                    <span className="text-[13px] font-medium tabular-nums">{brl(p.valor)}</span>
                    <Badge tone="neutral">{p.situacao}</Badge>
                    <BotaoAcao
                      acao={async () => { "use server"; await pagarConta(p.id); }}
                      className="h-8 rounded-lg border border-ink-200 px-2.5 text-[12px] font-medium text-ink-700 hover:border-gold-400"
                    >
                      Pagar
                    </BotaoAcao>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3">
              <span className="text-xs text-ink-500">Total em aberto</span>
              <span className="font-display text-[15px] font-semibold tabular-nums">
                {brl(aPagar.reduce((s, p) => s + p.valor, 0))}
              </span>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
