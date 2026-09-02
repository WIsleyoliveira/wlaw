import { Topbar } from "@/components/topbar";
import { Badge, Button, Card, Field, Tone } from "@/components/ui";
import { ListFooter, Row, Toolbar } from "@/components/list";
import { IconMore } from "@/components/icons";
import { capturas } from "@/lib/mock";

const tone: Record<string, Tone> = {
  Habilitada: "ok",
  "Em andamento": "gold",
  Pendente: "warn",
  Erro: "danger",
};

export default function MonitoramentoPage() {
  const usado = 187;
  const franquia = 250;
  const pct = Math.round((usado / franquia) * 100);

  return (
    <>
      <Topbar title="Monitoramento" tabs={["Push", "Captura em lote (OAB)"]} />
      <main className="space-y-4 p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Franquia de capturas</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-semibold">{usado}</span>
              <span className="text-sm text-ink-500">/ {franquia} no mês</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-gold-400" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-ink-500">
              Renova em 30/09/2026 · {franquia - usado} capturas disponíveis
            </p>
          </Card>

          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Tribunais conectados</p>
            <div className="mt-2 font-display text-2xl font-semibold">42</div>
            <div className="mt-2.5 flex flex-wrap gap-1">
              <Badge tone="ok">38 estáveis</Badge>
              <Badge tone="warn">3 instáveis</Badge>
              <Badge tone="danger">1 fora do ar</Badge>
            </div>
          </Card>

          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Última varredura</p>
            <div className="mt-2 font-display text-2xl font-semibold">04:04</div>
            <p className="mt-1 text-xs text-ink-500">02/09/2026 · 24 andamentos capturados</p>
            <Button size="sm" className="mt-3">Executar agora</Button>
          </Card>
        </div>

        <Card>
          <Toolbar
            novo="Nova captura"
            placeholder="Pesquise pelo número do processo ou OAB"
            chips={["Todas", "Pendente", "Em andamento", "Erro", "Vinculado"]}
            filtros={1}
          />
          <ul className="divide-y divide-ink-200">
            {capturas.map((c) => (
              <Row key={c.numero + c.data} accent={c.status === "Erro" ? "bg-danger" : "bg-ink-950"}>
                <div className="grid gap-4 md:grid-cols-[150px_1fr_1.3fr_90px_130px_40px] md:items-center">
                  <Field label="Data">{c.data}</Field>
                  <Field label="Número do processo">
                    <span className="font-mono text-[12px]">{c.numero}</span>
                  </Field>
                  <Field label="Órgão">{c.orgao}</Field>
                  <Field label="Instância">{c.instancia}</Field>
                  <div className="flex md:justify-end">
                    <Badge tone={tone[c.status]}>{c.status}</Badge>
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
          <ListFooter total={capturas.length} />
        </Card>
      </main>
    </>
  );
}
