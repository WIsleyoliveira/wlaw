import { Topbar } from "@/components/topbar";
import { Badge, Card, CardHeader } from "@/components/ui";
import { indicadores } from "@/lib/mock";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/* Donut de carteira — uma série, sem legenda de cor isolada: cada fatia é rotulada. */
function Rosca() {
  const { ativos, parados, arquivados, total } = indicadores.carteira;
  const fatias = [
    { rotulo: "Ativos", valor: ativos, cor: "#0a0a0b" },
    { rotulo: "Parados", valor: parados, cor: "#c98500" },
    { rotulo: "Arquivados", valor: arquivados, cor: "#d4d4d8" },
  ];

  const r = 52;
  const circ = 2 * Math.PI * r;
  let acumulado = 0;

  return (
    <div className="flex flex-wrap items-center gap-6 px-5 pb-5">
      <svg viewBox="0 0 140 140" className="h-[140px] w-[140px] shrink-0 -rotate-90">
        {fatias.map((f) => {
          const fracao = f.valor / total;
          const dash = fracao * circ;
          const el = (
            <circle
              key={f.rotulo}
              cx="70" cy="70" r={r}
              fill="none"
              stroke={f.cor}
              strokeWidth="16"
              strokeDasharray={`${dash - 2} ${circ - dash + 2}`}
              strokeDashoffset={-acumulado * circ}
            />
          );
          acumulado += fracao;
          return el;
        })}
      </svg>

      <ul className="min-w-[150px] flex-1 space-y-2.5">
        {fatias.map((f) => (
          <li key={f.rotulo} className="flex items-center gap-2.5">
            <i className="h-2.5 w-2.5 rounded-[2px]" style={{ background: f.cor }} />
            <span className="flex-1 text-[13px] text-ink-700">{f.rotulo}</span>
            <span className="text-[13px] font-medium tabular-nums">{f.valor}</span>
            <span className="w-10 text-right text-[11px] text-ink-400">
              {Math.round((f.valor / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function IndicadoresPage() {
  const { prazos, produtividade, porArea, clientesTop, carteira } = indicadores;
  const maxArea = Math.max(...porArea.map((a) => a.qtd));
  const maxHoras = Math.max(...produtividade.map((p) => p.horas));

  return (
    <>
      <Topbar title="Indicadores" tabs={["Escritório", "Pessoal"]} />
      <main className="space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Carteira</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{carteira.total}</p>
            <div className="mt-2.5"><Badge tone="ok">{carteira.ativos} ativos</Badge></div>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Prazos cumpridos</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{prazos.taxa}%</p>
            <div className="mt-2.5">
              <Badge tone={prazos.perdidos > 0 ? "danger" : "ok"}>
                {prazos.perdidos} perdido{prazos.perdidos === 1 ? "" : "s"} em 12 meses
              </Badge>
            </div>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Processos parados</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{carteira.parados}</p>
            <div className="mt-2.5"><Badge tone="warn">sem movimento há 90 dias</Badge></div>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Horas faturáveis</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">68%</p>
            <div className="mt-2.5"><Badge tone="gold">meta 70%</Badge></div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Situação da carteira" hint={`${carteira.total} processos`} />
            <Rosca />
          </Card>

          <Card>
            <CardHeader title="Processos por área" hint="Distribuição do escritório" />
            <ul className="space-y-3 px-5 pb-5">
              {porArea.map((a) => (
                <li key={a.area}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-ink-700">{a.area}</span>
                    <span className="text-[13px] font-medium tabular-nums">{a.qtd}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-ink-950" style={{ width: `${(a.qtd / maxArea) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Produtividade da equipe"
              hint="Últimos 30 dias · horas lançadas e % faturável"
            />
            <ul className="divide-y divide-ink-200 border-t border-ink-200">
              {produtividade.map((p) => (
                <li key={p.nome} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-950 text-[10px] font-semibold text-gold-400">
                      {p.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </span>
                    <span className="flex-1 text-[13px] font-medium">{p.nome}</span>
                    <span className="text-[13px] tabular-nums">{p.horas} h</span>
                    <Badge tone={p.faturavel >= 70 ? "ok" : "warn"}>{p.faturavel}% faturável</Badge>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-gold-400" style={{ width: `${(p.horas / maxHoras) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-500">{p.tarefas} tarefas concluídas</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Clientes que mais pesam" hint="Processos e receita no ano" />
            <div className="overflow-x-auto border-t border-ink-200">
              <table className="w-full min-w-[380px] text-[13px]">
                <thead>
                  <tr className="border-b border-ink-200 text-[11px] uppercase tracking-wide text-ink-400">
                    <th className="px-5 py-2.5 text-left font-medium">Cliente</th>
                    <th className="px-5 py-2.5 text-right font-medium">Processos</th>
                    <th className="px-5 py-2.5 text-right font-medium">Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {clientesTop.map((c) => (
                    <tr key={c.nome} className="hover:bg-ink-50">
                      <td className="px-5 py-3">{c.nome}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{c.processos}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium">{brl(c.receita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-[11px] leading-snug text-ink-500">
              O maior cliente responde por {Math.round((clientesTop[0].receita / clientesTop.reduce((s, c) => s + c.receita, 0)) * 100)}% da
              receita — concentração acima de 40% é risco de caixa.
            </p>
          </Card>
        </div>
      </main>
    </>
  );
}
