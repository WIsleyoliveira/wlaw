import { Topbar } from "@/components/topbar";
import { Button, Card, SearchInput } from "@/components/ui";
import { IconExport, IconReport } from "@/components/icons";
import { catalogoRelatorios } from "@/lib/mock";

const gerados = [
  { nome: "Timesheet — agosto/2026", formato: "XLSX", data: "01/09/2026 08:12", tamanho: "182 KB" },
  { nome: "Processos sem movimentação — 90 dias", formato: "PDF", data: "28/08/2026 17:40", tamanho: "96 KB" },
];

export default function RelatoriosPage() {
  return (
    <>
      <Topbar title="Relatórios" />
      <main className="grid gap-4 p-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <div className="border-b border-ink-200 px-5 py-3">
              <SearchInput placeholder="Buscar relatório por nome ou área" />
            </div>

            <div className="divide-y divide-ink-200">
              {catalogoRelatorios.map((g) => (
                <div key={g.grupo} className="px-5 py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <h2 className="font-display text-[15px] font-semibold">{g.grupo}</h2>
                    <span className="gold-rule h-px flex-1" />
                    <span className="text-[11px] text-ink-400">{g.itens.length} relatórios</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {g.itens.map((it) => (
                      <button
                        key={it.nome}
                        className="group flex items-start gap-3 rounded-lg border border-ink-200 p-3 text-left transition-colors hover:border-gold-400 hover:bg-gold-50"
                      >
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-700 group-hover:bg-white group-hover:text-gold-600">
                          <IconReport className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium text-ink-950">{it.nome}</span>
                          <span className="block text-xs leading-snug text-ink-500">{it.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
              <h2 className="font-display text-[15px] font-semibold">Gerados recentemente</h2>
            </div>
            <ul className="divide-y divide-ink-200">
              {gerados.map((r) => (
                <li key={r.nome} className="flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-gold-200 bg-gold-50 text-[10px] font-semibold text-gold-600">
                    {r.formato}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{r.nome}</p>
                    <p className="text-xs text-ink-500">{r.data} · {r.tamanho}</p>
                  </div>
                  <Button size="sm" variant="ghost" aria-label="Baixar">
                    <IconExport className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="p-5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-gold-500">Agendamento</p>
              <p className="mt-2 text-[13px] leading-snug text-ink-700">
                Programe qualquer relatório para chegar por e-mail toda segunda-feira, já filtrado
                pela sua carteira.
              </p>
              <Button size="sm" className="mt-3 w-full">Agendar envio recorrente</Button>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
