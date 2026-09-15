import { exigirPagina } from "@/lib/auth/sessao";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Badge, Card, CardHeader, Tone } from "@/components/ui";
import { ler } from "@/lib/db";
import { atrasado, diasAte, hoje, paraData } from "@/lib/util";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Evento = { dia: number; hora: string | null; titulo: string; tipo: "audiencia" | "prazo" | "compromisso" | "feriado" };

function MonthGrid({ eventos, ano, mes, dataHoje }: { eventos: Evento[]; ano: number; mes: number; dataHoje: Date }) {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((primeiroDiaSemana + diasNoMes) / 7) * 7 }, (_, i) => {
    const dia = i - primeiroDiaSemana + 1;
    return dia >= 1 && dia <= diasNoMes ? dia : null;
  });

  const tipoStyle: Record<string, string> = {
    audiencia: "border-l-2 border-gold-400 bg-gold-50 text-gold-600",
    prazo: "border-l-2 border-danger bg-red-50 text-danger",
    compromisso: "border-l-2 border-ink-950 bg-ink-100 text-ink-900",
    feriado: "border-l-2 border-ink-200 bg-ink-50 text-ink-500",
  };

  return (
    <div className="overflow-hidden rounded-lg border border-ink-200">
      <div className="grid grid-cols-7 border-b border-ink-200 bg-ink-50 *:min-w-0">
        {DIAS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-ink-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 *:min-w-0">
        {cells.map((dia, i) => {
          const doDia = dia ? eventos.filter((e) => e.dia === dia) : [];
          const ehHoje = dia === dataHoje.getDate() && ano === dataHoje.getFullYear() && mes === dataHoje.getMonth();
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
                      ehHoje ? "bg-ink-950 font-semibold text-gold-400" : "text-ink-500"
                    }`}
                  >
                    {dia}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {doDia.slice(0, 3).map((e, ei) => (
                  <div key={ei} className={`truncate rounded-[5px] px-1.5 py-1 text-[11px] ${tipoStyle[e.tipo]}`}>
                    {e.hora && <span className="font-semibold">{e.hora} </span>}
                    {e.titulo}
                  </div>
                ))}
                {doDia.length > 3 && (
                  <div className="px-1.5 text-[10px] text-ink-400">+{doDia.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const toneAtividade: Record<string, Tone> = {
  Pendente: "warn", "Em execução": "gold", Revisão: "neutral",
  Concluída: "ok", "A confirmar": "neutral", Cancelada: "danger",
};

export default async function PainelPage() {
  await exigirPagina("painel");
  const b = await ler();
  const dataHoje = hoje();
  const ano = dataHoje.getFullYear();
  const mes = dataHoje.getMonth();

  const eventos: Evento[] = [
    ...b.atividades
      .filter((a) => a.situacao !== "Cancelada")
      .map((a): Evento | null => {
        const d = paraData(a.fatal);
        if (d.getFullYear() !== ano || d.getMonth() !== mes) return null;
        return { dia: d.getDate(), hora: null, titulo: a.tipo, tipo: a.tipo === "Audiência" ? "audiencia" : "prazo" };
      })
      .filter((e): e is Evento => e !== null),
    ...b.atendimentos
      .map((a): Evento | null => {
        const d = paraData(a.data);
        if (d.getFullYear() !== ano || d.getMonth() !== mes) return null;
        return { dia: d.getDate(), hora: null, titulo: a.assunto, tipo: "compromisso" };
      })
      .filter((e): e is Evento => e !== null),
    ...b.feriados
      .map((f): Evento | null => {
        const d = paraData(f.data);
        if (d.getFullYear() !== ano || d.getMonth() !== mes) return null;
        return { dia: d.getDate(), hora: null, titulo: f.nome, tipo: "feriado" };
      })
      .filter((e): e is Evento => e !== null),
  ];

  const pendentes = b.atividades.filter((a) => a.situacao !== "Concluída" && a.situacao !== "Cancelada");
  const fataisHoje = pendentes.filter((a) => diasAte(a.fatal) === 0).length;
  const naSemana = pendentes.filter((a) => diasAte(a.fatal) >= 0 && diasAte(a.fatal) <= 7).length;

  const intPendentes = b.intimacoes.filter((i) => i.situacao === "Pendente").length;
  const intArquivadas = b.intimacoes.filter((i) => i.situacao === "Arquivada").length;

  const andNaoLidos = b.andamentos.filter((a) => !a.lido).length;
  const andLidos = b.andamentos.filter((a) => a.lido).length;

  const audiencias = pendentes.filter((a) => a.tipo === "Audiência");
  const audAtrasadas = audiencias.filter((a) => atrasado(a.fatal)).length;
  const audFuturas = audiencias.length - audAtrasadas;

  const estaSemana = b.atendimentos.filter((a) => Math.abs(diasAte(a.data)) <= 7).length;

  const kpis: { label: string; total: number; breakdown: [string, Tone][] }[] = [
    { label: "Prazos", total: pendentes.length, breakdown: [[`${fataisHoje} fatais hoje`, "danger"], [`${naSemana} na semana`, "neutral"]] },
    { label: "Intimações", total: b.intimacoes.length, breakdown: [[`${intPendentes} pendentes`, "warn"], [`${intArquivadas} arquivadas`, "neutral"]] },
    { label: "Andamentos", total: b.andamentos.length, breakdown: [[`${andNaoLidos} não lidos`, "warn"], [`${andLidos} lidos`, "neutral"]] },
    { label: "Audiências", total: audiencias.length, breakdown: [[`${audAtrasadas} atrasadas`, "danger"], [`${audFuturas} futuras`, "neutral"]] },
    { label: "Atendimentos", total: b.atendimentos.length, breakdown: [[`${estaSemana} nos últimos 7 dias`, "neutral"]] },
  ];

  const prazosCriticos = pendentes
    .slice()
    .sort((a, c) => diasAte(a.fatal) - diasAte(c.fatal))
    .slice(0, 4)
    .map((a) => {
      const p = a.processoId ? b.processos.find((x) => x.id === a.processoId) : null;
      const cliente = p ? b.pessoas.find((x) => x.id === p.clienteId) : null;
      return { ...a, processo: p, cliente };
    });

  return (
    <>
      <Topbar title="Painel de controle" />

      <main className="space-y-4 p-4 sm:p-6">
        {/* KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 *:min-w-0">
          <Card className="flex flex-col justify-center px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-gold-500">
              {dataHoje.toLocaleDateString("pt-BR", { weekday: "long" })}
            </p>
            <p className="font-display text-3xl font-semibold leading-none">{String(dataHoje.getDate()).padStart(2, "0")}</p>
            <p className="mt-1 text-xs text-ink-500">{MESES[mes]} de {ano}</p>
          </Card>

          {kpis.map((k) => (
            <Card key={k.label} className="px-4 py-3">
              <div className="flex items-start justify-between">
                <p className="text-[13px] font-medium text-ink-700">{k.label}</p>
                <span className="font-display text-2xl font-semibold leading-none">{k.total}</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {k.breakdown.map(([texto, tone]) => (
                  <Badge key={texto} tone={tone}>
                    {texto}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_340px] *:min-w-0">
          {/* Agenda */}
          <Card>
            <CardHeader title="Agenda" hint={`${MESES[mes]} de ${ano}`} />
            <div className="px-5 pb-5">
              <MonthGrid dataHoje={dataHoje} eventos={eventos} ano={ano} mes={mes} />
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-ink-500">
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-gold-400" /> Audiência</span>
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-danger" /> Prazo fatal</span>
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-ink-950" /> Atendimento</span>
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-ink-200" /> Feriado</span>
              </div>
            </div>
          </Card>

          {/* Coluna lateral */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="Prazos críticos" hint="Ordenados pelo mais urgente" />
              {prazosCriticos.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-ink-500">Nenhum prazo pendente.</p>
              ) : (
                <ul className="divide-y divide-ink-200 px-5 pb-2">
                  {prazosCriticos.map((a) => (
                    <li key={a.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">{a.tipo}</p>
                          <p className="truncate text-xs text-ink-500">{a.cliente?.nome ?? "Sem cliente"}</p>
                        </div>
                        <Badge tone={toneAtividade[a.situacao]}>{a.situacao}</Badge>
                      </div>
                      {a.processo && <p className="mt-1.5 font-mono text-[11px] text-ink-400">{a.processo.pasta}</p>}
                      <p className={`mt-1 text-[11px] ${atrasado(a.fatal) ? "text-danger" : "text-ink-500"}`}>Fatal: {a.fatal}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="px-5 pb-4">
                <Link href="/atividades" className="block w-full rounded-lg py-2 text-center text-[13px] font-medium text-ink-700 hover:bg-ink-100">
                  Ver todas as atividades
                </Link>
              </div>
            </Card>

            <section className="rounded-card border border-ink-950 bg-ink-950 text-white">
              <div className="p-5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-gold-400">Wlaw IA</p>
                <p className="mt-2 font-display text-[15px] leading-snug">
                  {intPendentes > 0
                    ? `${intPendentes} intimaç${intPendentes === 1 ? "ão" : "ões"} pendente${intPendentes === 1 ? "" : "s"}. Posso classificar, sugerir o prazo e criar as tarefas.`
                    : "Nenhuma intimação pendente no momento."}
                </p>
                <Link
                  href="/intimacoes"
                  className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-gold-400 text-sm font-semibold text-ink-950 hover:bg-gold-200"
                >
                  Revisar intimações
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
