import { Topbar } from "@/components/topbar";
import { Badge, Card, Field } from "@/components/ui";
import { ListFooter, Row, Toolbar } from "@/components/list";
import { Cronometro } from "@/components/cronometro";
import { IconMore } from "@/components/icons";
import { lancamentos } from "@/lib/mock";

function paraMinutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function formatar(minutos: number) {
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}`;
}

export default function TimesheetPage() {
  const total = lancamentos.reduce((s, l) => s + paraMinutos(l.horas), 0);
  const faturavel = lancamentos
    .filter((l) => l.faturavel)
    .reduce((s, l) => s + paraMinutos(l.horas), 0);

  return (
    <>
      <Topbar title="Timesheet" tabs={["Lançamentos", "Timesheets"]} />
      <main className="space-y-4 p-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <Cronometro />
          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Horas no período</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{formatar(total)}</p>
            <p className="mt-1 text-xs text-ink-500">5 lançamentos</p>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Faturável</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{formatar(faturavel)}</p>
            <div className="mt-2">
              <Badge tone="gold">{Math.round((faturavel / total) * 100)}% do total</Badge>
            </div>
          </Card>
        </div>

        <Card>
          <Toolbar
            novo="Novo lançamento"
            placeholder="Pesquise por responsável, cliente, processo ou descrição"
            chips={["Todos", "Faturáveis", "Não faturáveis"]}
          />
          <ul className="divide-y divide-ink-200">
            {lancamentos.map((l, i) => (
              <Row key={i} accent={l.faturavel ? "bg-gold-400" : "bg-ink-200"}>
                <div className="grid gap-4 md:grid-cols-[110px_90px_1fr_1.3fr_150px_120px_40px] md:items-center">
                  <Field label="Data">{l.data}</Field>
                  <Field label="Horas">
                    <span className="tabular-nums font-medium">{l.horas}</span>
                  </Field>
                  <Field label="Vínculo">
                    <span className="font-mono text-[12px]">{l.vinculo}</span>
                    <div className="truncate text-xs text-ink-500">{l.cliente}</div>
                  </Field>
                  <Field label="Descrição">{l.descricao}</Field>
                  <Field label="Responsável">{l.responsavel}</Field>
                  <div className="flex md:justify-end">
                    <Badge tone={l.faturavel ? "gold" : "neutral"}>
                      {l.faturavel ? "Faturável" : "Interno"}
                    </Badge>
                  </div>
                  <div className="hidden justify-end md:flex">
                    <button className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-900">
                      <IconMore className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </div>
              </Row>
            ))}
          </ul>
          <ListFooter total={lancamentos.length} />
        </Card>
      </main>
    </>
  );
}
