import { Topbar } from "@/components/topbar";
import { Badge, Card, Field, Tone } from "@/components/ui";
import { ListFooter, Row, Toolbar } from "@/components/list";
import { IconMore } from "@/components/icons";
import { atividades } from "@/lib/mock";

const accent: Record<string, string> = {
  Pendente: "bg-warn",
  "A confirmar": "bg-ink-400",
  "Em execução": "bg-gold-400",
  Concluída: "bg-ok",
};

export default function AtividadesPage() {
  return (
    <>
      <Topbar
        title="Atividades"
        tabs={[
          { label: "Lista", href: "/atividades" },
          { label: "Kanban", href: "/atividades/kanban" },
        ]}
      />
      <main className="p-6">
        <Card>
          <Toolbar
            novo="Nova atividade"
            placeholder="Pesquise por identificador, título, tipo ou marcador"
            chips={["Todas", "Tarefas", "Audiências", "Compromissos"]}
            filtros={4}
          />
          <ul className="divide-y divide-ink-200">
            {atividades.map((a) => (
              <Row key={a.id} accent={accent[a.situacao] ?? "bg-ink-200"}>
                <div className="grid gap-4 md:grid-cols-[150px_1fr_1fr_170px_110px_40px] md:items-center">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-ink-400">Prevista</div>
                    <div className="text-[13px] font-medium text-ink-900">{a.prevista}</div>
                    <div className="mt-0.5 text-[11px] text-danger">Fatal {a.fatal}</div>
                  </div>
                  <Field label="Vínculo">
                    <span className="font-mono text-[12px]">{a.processo}</span>
                    <div className="truncate text-xs text-ink-500">{a.cliente}</div>
                  </Field>
                  <Field label="Tipo">
                    {a.tipo}
                    <div className="truncate text-xs text-ink-500">{a.parte}</div>
                  </Field>
                  <Field label="Identificador">
                    <span className="font-mono text-[12px]">{a.id}</span>
                  </Field>
                  <div className="flex md:justify-end">
                    <Badge tone={a.tone as Tone}>{a.situacao}</Badge>
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
          <ListFooter total={atividades.length} />
        </Card>
      </main>
    </>
  );
}
