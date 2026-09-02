import { Topbar } from "@/components/topbar";
import { Badge, Button, Card, CardHeader, Tone } from "@/components/ui";
import { IconChevronLeft, IconChevronRight, IconExport } from "@/components/icons";
import { agenda, atividades, kpis } from "@/lib/mock";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function MonthGrid() {
  // Setembro/2026 começa numa terça-feira (índice 2) e tem 30 dias.
  const offset = 2;
  const cells = Array.from({ length: 42 }, (_, i) => {
    const dia = i - offset + 1;
    return dia >= 1 && dia <= 30 ? dia : null;
  });

  const tipoStyle: Record<string, string> = {
    audiencia: "border-l-2 border-gold-400 bg-gold-50 text-gold-600",
    prazo: "border-l-2 border-danger bg-red-50 text-danger",
    compromisso: "border-l-2 border-ink-950 bg-ink-100 text-ink-900",
    feriado: "border-l-2 border-ink-200 bg-ink-50 text-ink-500",
  };

  return (
    <div className="overflow-hidden rounded-lg border border-ink-200">
      <div className="grid grid-cols-7 border-b border-ink-200 bg-ink-50">
        {DIAS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-ink-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((dia, i) => {
          const eventos = dia ? agenda.filter((e) => e.dia === dia) : [];
          const hoje = dia === 2;
          return (
            <div
              key={i}
              className={`min-h-[104px] border-b border-r border-ink-200 p-1.5 last:border-r-0 ${
                dia ? "bg-white" : "bg-ink-50/60"
              }`}
            >
              {dia && (
                <div className="mb-1 flex justify-end">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-[12px] ${
                      hoje ? "bg-ink-950 font-semibold text-gold-400" : "text-ink-500"
                    }`}
                  >
                    {dia}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {eventos.map((e) => (
                  <div key={e.titulo} className={`truncate rounded-[5px] px-1.5 py-1 text-[11px] ${tipoStyle[e.tipo]}`}>
                    {e.hora && <span className="font-semibold">{e.hora} </span>}
                    {e.titulo}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PainelPage() {
  return (
    <>
      <Topbar title="Painel de controle" tabs={["Pessoal", "Escritório"]} />

      <main className="space-y-4 p-6">
        {/* KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card className="flex flex-col justify-center px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-gold-500">Quarta-feira</p>
            <p className="font-display text-3xl font-semibold leading-none">02</p>
            <p className="mt-1 text-xs text-ink-500">Setembro de 2026</p>
          </Card>

          {kpis.map((k) => (
            <Card key={k.label} className="px-4 py-3">
              <div className="flex items-start justify-between">
                <p className="text-[13px] font-medium text-ink-700">{k.label}</p>
                <span className="font-display text-2xl font-semibold leading-none">{k.total}</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {k.breakdown.map(([texto, tone]) => (
                  <Badge key={texto} tone={tone as Tone}>
                    {texto}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          {/* Agenda */}
          <Card>
            <CardHeader
              title="Agenda"
              hint="Setembro de 2026"
              action={
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" aria-label="Mês anterior">
                    <IconChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="sm">Hoje</Button>
                  <Button size="sm" variant="ghost" aria-label="Próximo mês">
                    <IconChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="ml-1 flex items-center rounded-lg border border-ink-200 p-0.5">
                    {["Mês", "Semana", "Dia"].map((v, i) => (
                      <button
                        key={v}
                        className={
                          i === 0
                            ? "rounded-[6px] bg-ink-950 px-2.5 py-1 text-[12px] font-medium text-white"
                            : "rounded-[6px] px-2.5 py-1 text-[12px] font-medium text-ink-500 hover:text-ink-900"
                        }
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              }
            />
            <div className="px-5 pb-5">
              <MonthGrid />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-500">
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-gold-400" /> Audiência</span>
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-danger" /> Prazo fatal</span>
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-ink-950" /> Compromisso</span>
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-ink-200" /> Feriado</span>
                </div>
                <Button size="sm" variant="outline">
                  <IconExport className="h-4 w-4" /> Exportar .ics
                </Button>
              </div>
            </div>
          </Card>

          {/* Coluna lateral */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="Prazos críticos" hint="Próximos 7 dias" />
              <ul className="divide-y divide-ink-200 px-5 pb-2">
                {atividades.slice(0, 4).map((a) => (
                  <li key={a.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{a.tipo}</p>
                        <p className="truncate text-xs text-ink-500">{a.cliente}</p>
                      </div>
                      <Badge tone={a.tone as Tone}>{a.situacao}</Badge>
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] text-ink-400">{a.processo}</p>
                    <p className="mt-1 text-[11px] text-danger">Fatal: {a.fatal}</p>
                  </li>
                ))}
              </ul>
              <div className="px-5 pb-4">
                <Button size="sm" variant="ghost" className="w-full">Ver todas as atividades</Button>
              </div>
            </Card>

            <section className="rounded-card border border-ink-950 bg-ink-950 text-white">
              <div className="p-5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-gold-400">Wlaw IA</p>
                <p className="mt-2 font-display text-[15px] leading-snug">
                  7 intimações novas hoje. Posso classificar, sugerir o prazo e criar as tarefas.
                </p>
                <button className="mt-4 h-9 w-full rounded-lg bg-gold-400 text-sm font-semibold text-ink-950 hover:bg-gold-200">
                  Revisar sugestões
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
