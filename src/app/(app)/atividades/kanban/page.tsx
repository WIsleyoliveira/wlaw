import { Topbar } from "@/components/topbar";
import { Badge, Card, Tone } from "@/components/ui";
import { IconMore, IconAlert } from "@/components/icons";
import { atividades, kanban } from "@/lib/mock";

export default function KanbanPage() {
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
        <div className="scroll-thin flex gap-4 overflow-x-auto pb-2">
          {kanban.map((col) => (
            <section key={col.coluna} className="w-[300px] shrink-0">
              <div className="mb-2.5 flex items-center justify-between rounded-lg border border-ink-200 bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      {
                        warn: "h-2 w-2 rounded-full bg-warn",
                        gold: "h-2 w-2 rounded-full bg-gold-400",
                        neutral: "h-2 w-2 rounded-full bg-ink-400",
                        ok: "h-2 w-2 rounded-full bg-ok",
                      }[col.tone]
                    }
                  />
                  <h2 className="text-[13px] font-semibold">{col.coluna}</h2>
                </div>
                <span className="rounded-full bg-ink-100 px-2 text-[11px] font-medium text-ink-700">
                  {col.cards.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {col.cards.map((idx) => {
                  const a = atividades[idx];
                  const atrasada = col.coluna === "Pendente" && a.fatal.startsWith("03/09");
                  return (
                    <Card key={a.id} className="p-3.5 transition-shadow hover:shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
                      <div className="flex items-start justify-between gap-2">
                        <Badge tone="neutral">{a.tipo}</Badge>
                        <div className="flex items-center gap-1">
                          {atrasada && <IconAlert className="h-4 w-4 text-danger" />}
                          <button className="grid h-6 w-6 place-items-center rounded text-ink-400 hover:bg-ink-100">
                            <IconMore className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-[13px] font-medium leading-snug">{a.cliente}</p>
                      <p className="text-xs text-ink-500">{a.parte}</p>

                      <p className="mt-2 font-mono text-[11px] text-ink-400">{a.processo}</p>

                      <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-2.5">
                        <div className="text-[11px]">
                          <span className="text-ink-500">Fatal </span>
                          <span className={atrasada ? "font-medium text-danger" : "text-ink-900"}>
                            {a.fatal}
                          </span>
                        </div>
                        <div className="flex -space-x-1.5">
                          {["AC", "WO"].map((i) => (
                            <span
                              key={i}
                              className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-ink-950 text-[9px] font-semibold text-gold-400"
                            >
                              {i}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                })}

                <button className="w-full rounded-lg border border-dashed border-ink-200 py-2.5 text-[13px] text-ink-400 hover:border-gold-400 hover:text-gold-600">
                  + Adicionar
                </button>
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
