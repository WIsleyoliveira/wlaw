import { Topbar } from "@/components/topbar";
import { Badge, Card, Field } from "@/components/ui";
import { ListFooter, Row, Toolbar } from "@/components/list";
import { IconMail, IconMore } from "@/components/icons";
import { andamentos } from "@/lib/mock";

export default function AndamentosPage() {
  return (
    <>
      <Topbar title="Andamentos processuais" />
      <main className="p-6">
        <Card>
          <Toolbar
            novo="Novo andamento"
            placeholder="Pesquise por tipo, descrição, nº do processo ou cliente"
            chips={["Todos", "Lidos", "Não lidos"]}
            filtros={2}
          />
          <ul className="divide-y divide-ink-200">
            {andamentos.map((a, idx) => (
              <Row key={idx} accent={a.lido ? "bg-ink-200" : "bg-gold-400"}>
                <div className="grid gap-4 md:grid-cols-[24px_110px_90px_140px_1fr_1.3fr_40px] md:items-center">
                  <IconMail className={a.lido ? "h-[18px] w-[18px] text-ink-400" : "h-[18px] w-[18px] text-gold-500"} />
                  <Field label="Data">{a.data}</Field>
                  <Field label="Órgão">{a.orgao}</Field>
                  <Field label="Tipo">
                    <Badge tone={a.tipo === "Intimação" ? "gold" : "neutral"}>{a.tipo}</Badge>
                  </Field>
                  <Field label="Processo">
                    <span className="font-mono text-[12px]">{a.processo}</span>
                    <div className="truncate text-xs text-ink-500">{a.cliente}</div>
                  </Field>
                  <Field label="Descrição">{a.descricao}</Field>
                  <div className="hidden justify-end md:flex">
                    <button className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-900">
                      <IconMore className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </div>
              </Row>
            ))}
          </ul>
          <ListFooter total={andamentos.length} />
        </Card>
      </main>
    </>
  );
}
