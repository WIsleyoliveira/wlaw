import { Topbar } from "@/components/topbar";
import { Badge, Button, Card, CardHeader, Tone, cx } from "@/components/ui";
import { GraficoFluxo } from "@/components/grafico-fluxo";
import { IconExport, IconPlus } from "@/components/icons";
import { aPagar, aReceber, centrosCusto, fluxo } from "@/lib/mock";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FinanceiroPage() {
  const mes = fluxo[fluxo.length - 1];
  const anterior = fluxo[fluxo.length - 2];
  const resultado = mes.receita - mes.despesa;
  const variacao = Math.round(((mes.receita - anterior.receita) / anterior.receita) * 100);
  const vencido = aReceber.filter((r) => r.situacao === "Vencido").reduce((s, r) => s + r.valor, 0);
  const carteira = aReceber.reduce((s, r) => s + r.valor, 0);
  const maxCentro = Math.max(...centrosCusto.map((c) => c.valor));

  const tiles = [
    { label: "Receita — set/2026", valor: mes.receita, nota: `${variacao > 0 ? "+" : ""}${variacao}% vs. agosto`, tone: (variacao >= 0 ? "ok" : "danger") as Tone },
    { label: "Despesa — set/2026", valor: mes.despesa, nota: "5 categorias", tone: "neutral" as Tone },
    { label: "Resultado", valor: resultado, nota: `Margem de ${Math.round((resultado / mes.receita) * 100)}%`, tone: "gold" as Tone },
    { label: "Inadimplência", valor: vencido, nota: `${Math.round((vencido / carteira) * 100)}% da carteira`, tone: "danger" as Tone },
  ];

  return (
    <>
      <Topbar title="Financeiro" tabs={["Visão geral", "A receber", "A pagar", "DRE"]} />
      <main className="space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <Card>
            <CardHeader
              title="Fluxo de caixa"
              hint="Últimos 6 meses · regime de caixa"
              action={<Button size="sm"><IconExport className="h-4 w-4" /> Exportar</Button>}
            />
            <GraficoFluxo />
          </Card>

          <Card>
            <CardHeader title="Despesa por centro de custo" hint="Setembro de 2026" />
            <ul className="space-y-3 px-5 pb-5">
              {centrosCusto.map((c) => (
                <li key={c.nome}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-ink-700">{c.nome}</span>
                    <span className="text-[13px] font-medium tabular-nums">{brl(c.valor)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-ink-950"
                      style={{ width: `${(c.valor / maxCentro) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Contas a receber"
              action={<Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Lançar</Button>}
            />
            <ul className="divide-y divide-ink-200 border-t border-ink-200">
              {aReceber.map((r) => (
                <li key={r.doc} className="relative flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
                  <span className={cx("absolute inset-y-0 left-0 w-[3px]", r.situacao === "Vencido" ? "bg-danger" : "bg-gold-400")} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{r.descricao}</p>
                    <p className="truncate text-xs text-ink-500">{r.cliente} · vence {r.vencimento}</p>
                  </div>
                  <span className="text-[13px] font-medium tabular-nums">{brl(r.valor)}</span>
                  <Badge tone={r.situacao === "Vencido" ? "danger" : "gold"}>{r.situacao}</Badge>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3">
              <span className="text-xs text-ink-500">Total em carteira</span>
              <span className="font-display text-[15px] font-semibold tabular-nums">{brl(carteira)}</span>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Contas a pagar"
              action={<Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Lançar</Button>}
            />
            <ul className="divide-y divide-ink-200 border-t border-ink-200">
              {aPagar.map((p) => (
                <li key={p.doc} className="relative flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
                  <span className={cx("absolute inset-y-0 left-0 w-[3px]", p.situacao === "Pago" ? "bg-ink-200" : "bg-ink-950")} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{p.fornecedor}</p>
                    <p className="truncate text-xs text-ink-500">{p.categoria} · vence {p.vencimento}</p>
                  </div>
                  <span className="text-[13px] font-medium tabular-nums">{brl(p.valor)}</span>
                  <Badge tone={p.situacao === "Pago" ? "ok" : "neutral"}>{p.situacao}</Badge>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3">
              <span className="text-xs text-ink-500">Total do mês</span>
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
