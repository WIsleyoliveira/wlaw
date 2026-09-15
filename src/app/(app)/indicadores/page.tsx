import { exigirPagina } from "@/lib/auth/sessao";
import { Topbar } from "@/components/topbar";
import { Badge, Card, CardHeader } from "@/components/ui";
import { ler } from "@/lib/db";
import { atrasado, brlCurto, iniciais } from "@/lib/util";

/* Donut de carteira — uma série, sem legenda de cor isolada: cada fatia é rotulada. */
function Rosca({ fatias, total }: { fatias: { rotulo: string; valor: number; cor: string }[]; total: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offsets: number[] = [];
  fatias.reduce((acc, f) => {
    offsets.push(acc);
    return acc + (total > 0 ? f.valor / total : 0);
  }, 0);

  return (
    <div className="flex flex-wrap items-center gap-6 px-5 pb-5">
      <svg viewBox="0 0 140 140" className="h-[140px] w-[140px] shrink-0 -rotate-90">
        {fatias.map((f, i) => {
          const fracao = total > 0 ? f.valor / total : 0;
          const dash = fracao * circ;
          return (
            <circle
              key={f.rotulo}
              cx="70" cy="70" r={r}
              fill="none"
              stroke={f.cor}
              strokeWidth="16"
              strokeDasharray={`${Math.max(0, dash - 2)} ${circ - dash + 2}`}
              strokeDashoffset={-offsets[i] * circ}
            />
          );
        })}
      </svg>

      <ul className="min-w-[150px] flex-1 space-y-2.5">
        {fatias.map((f) => (
          <li key={f.rotulo} className="flex items-center gap-2.5">
            <i className="h-2.5 w-2.5 rounded-[2px]" style={{ background: f.cor }} />
            <span className="flex-1 text-[13px] text-ink-700">{f.rotulo}</span>
            <span className="text-[13px] font-medium tabular-nums">{f.valor}</span>
            <span className="w-10 text-right text-[11px] text-ink-400">
              {total > 0 ? Math.round((f.valor / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function IndicadoresPage() {
  await exigirPagina("indicadores");
  const b = await ler();

  const ativos = b.processos.filter((p) => p.situacao === "Ativo").length;
  const parados = b.processos.filter((p) => p.situacao === "Suspenso").length;
  const arquivados = b.processos.filter((p) => p.situacao === "Arquivado" || p.situacao === "Baixado").length;
  const totalCarteira = b.processos.length;

  const concluidas = b.atividades.filter((a) => a.situacao === "Concluída");
  const perdidas = b.atividades.filter((a) => a.situacao !== "Concluída" && atrasado(a.fatal));
  const taxaPrazos = concluidas.length + perdidas.length > 0
    ? Math.round((concluidas.length / (concluidas.length + perdidas.length)) * 1000) / 10
    : 100;

  const produtividade = b.usuarios.filter((u) => u.ativo).map((u) => {
    const lanc = b.lancamentos.filter((l) => l.responsavel === u.nome);
    const minutos = lanc.reduce((s, l) => s + l.minutos, 0);
    const minutosFat = lanc.filter((l) => l.faturavel).reduce((s, l) => s + l.minutos, 0);
    return {
      nome: u.nome,
      tarefas: b.atividades.filter((a) => a.responsavel === u.nome && a.situacao === "Concluída").length,
      horas: Math.round((minutos / 60) * 10) / 10,
      faturavel: minutos > 0 ? Math.round((minutosFat / minutos) * 100) : 0,
    };
  }).sort((a, c) => c.horas - a.horas);
  const maxHoras = Math.max(1, ...produtividade.map((p) => p.horas));
  const minutosTotal = b.lancamentos.reduce((s, l) => s + l.minutos, 0);
  const minutosFatTotal = b.lancamentos.filter((l) => l.faturavel).reduce((s, l) => s + l.minutos, 0);
  const pctFaturavel = minutosTotal > 0 ? Math.round((minutosFatTotal / minutosTotal) * 100) : 0;

  const porArea = Object.entries(
    b.processos.reduce<Record<string, number>>((acc, p) => {
      acc[p.grupo] = (acc[p.grupo] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([area, qtd]) => ({ area, qtd })).sort((a, c) => c.qtd - a.qtd);
  const maxArea = Math.max(1, ...porArea.map((a) => a.qtd));

  const clientesTop = Object.entries(
    b.cobrancas.reduce<Record<string, number>>((acc, c) => {
      acc[c.clienteId] = (acc[c.clienteId] ?? 0) + c.valor;
      return acc;
    }, {}),
  )
    .map(([clienteId, receita]) => ({
      nome: b.pessoas.find((p) => p.id === clienteId)?.nome ?? "—",
      processos: b.processos.filter((p) => p.clienteId === clienteId).length,
      receita,
    }))
    .sort((a, c) => c.receita - a.receita)
    .slice(0, 5);
  const receitaTotal = clientesTop.reduce((s, c) => s + c.receita, 0);

  return (
    <>
      <Topbar title="Indicadores" />
      <main className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 *:min-w-0">
          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Carteira</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{totalCarteira}</p>
            <div className="mt-2.5"><Badge tone="ok">{ativos} ativos</Badge></div>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Prazos cumpridos</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{taxaPrazos}%</p>
            <div className="mt-2.5">
              <Badge tone={perdidas.length > 0 ? "danger" : "ok"}>
                {perdidas.length} perdido{perdidas.length === 1 ? "" : "s"} no momento
              </Badge>
            </div>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Processos suspensos</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{parados}</p>
            <div className="mt-2.5"><Badge tone="warn">fora do fluxo ativo</Badge></div>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Horas faturáveis</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{pctFaturavel}%</p>
            <div className="mt-2.5"><Badge tone="gold">meta 70%</Badge></div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 *:min-w-0">
          <Card>
            <CardHeader title="Situação da carteira" hint={`${totalCarteira} processos`} />
            <Rosca
              total={totalCarteira}
              fatias={[
                { rotulo: "Ativos", valor: ativos, cor: "#0a0a0b" },
                { rotulo: "Suspensos", valor: parados, cor: "#c98500" },
                { rotulo: "Arquivados/baixados", valor: arquivados, cor: "#d4d4d8" },
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="Processos por área" hint="Distribuição do escritório" />
            {porArea.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-ink-500">Sem processos cadastrados.</p>
            ) : (
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
            )}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 *:min-w-0">
          <Card>
            <CardHeader title="Produtividade da equipe" hint="Horas lançadas e % faturável" />
            {produtividade.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-ink-500">Sem lançamentos de horas.</p>
            ) : (
              <ul className="divide-y divide-ink-200 border-t border-ink-200">
                {produtividade.map((p) => (
                  <li key={p.nome} className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-950 text-[10px] font-semibold text-gold-400">
                        {iniciais(p.nome)}
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
            )}
          </Card>

          <Card>
            <CardHeader title="Clientes que mais pesam" hint="Cobranças lançadas" />
            {clientesTop.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-ink-500">Sem cobranças lançadas.</p>
            ) : (
              <>
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
                          <td className="px-5 py-3 text-right tabular-nums font-medium">{brlCurto(c.receita)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="px-5 py-3 text-[11px] leading-snug text-ink-500">
                  O maior cliente responde por {receitaTotal > 0 ? Math.round((clientesTop[0].receita / receitaTotal) * 100) : 0}% da
                  receita lançada — concentração acima de 40% é risco de caixa.
                </p>
              </>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
