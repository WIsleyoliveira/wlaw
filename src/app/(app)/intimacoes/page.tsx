import { Topbar } from "@/components/topbar";
import { Badge, Card, Field, Tone } from "@/components/ui";
import { ListFooter, Row, Toolbar } from "@/components/list";
import { IconMore } from "@/components/icons";
import { intimacoes } from "@/lib/mock";

const tone: Record<string, Tone> = {
  Pendente: "warn",
  Processada: "ok",
  Arquivada: "neutral",
};

export default function IntimacoesPage() {
  return (
    <>
      <Topbar title="Intimações" tabs={["Intimações", "Descartadas", "Captura"]} />
      <main className="p-6">
        <Card>
          <Toolbar
            novo="Nova intimação"
            placeholder="Pesquise pela descrição da intimação"
            chips={["Todas", "Pendentes", "Arquivadas", "Processadas"]}
          />
          <ul className="divide-y divide-ink-200">
            {intimacoes.map((i) => (
              <Row key={i.numero + i.disponibilizacao} accent={i.vinculado ? "bg-gold-400" : "bg-danger"}>
                <div className="grid gap-4 md:grid-cols-[140px_1fr_1.4fr_200px_40px] md:items-center">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-ink-400">Disponibilização</div>
                    <div className="text-[13px] font-medium">{i.disponibilizacao}</div>
                    <div className="mt-0.5 text-[11px] text-ink-500">Publicação {i.publicacao}</div>
                  </div>
                  <Field label="Processo">
                    <span className="font-mono text-[12px]">{i.numero}</span>
                    <div className="truncate text-xs text-ink-500">{i.cliente}</div>
                  </Field>
                  <Field label="Descrição">{i.descricao}</Field>
                  <div className="flex flex-wrap gap-1.5 md:justify-end">
                    {!i.vinculado && <Badge tone="danger">Processo não localizado</Badge>}
                    <Badge tone={tone[i.situacao]}>{i.situacao}</Badge>
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
          <ListFooter total={intimacoes.length} />
        </Card>
      </main>
    </>
  );
}
