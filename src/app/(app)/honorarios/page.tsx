import { Topbar } from "@/components/topbar";
import { Badge, Card, Field, Tone } from "@/components/ui";
import { ListFooter, Row, Toolbar } from "@/components/list";
import { IconMore } from "@/components/icons";
import { cobrancas, contratos } from "@/lib/mock";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const toneContrato: Record<string, Tone> = { Habilitado: "ok", Desabilitado: "neutral" };
const toneCobranca: Record<string, Tone> = { Pago: "ok", "Em aberto": "gold", Vencido: "danger" };

export default function HonorariosPage() {
  const aberto = cobrancas.filter((c) => c.situacao !== "Pago").reduce((s, c) => s + c.valor, 0);
  const recebido = cobrancas.filter((c) => c.situacao === "Pago").reduce((s, c) => s + c.valor, 0);
  const vencido = cobrancas.filter((c) => c.situacao === "Vencido").reduce((s, c) => s + c.valor, 0);

  return (
    <>
      <Topbar title="Honorários" tabs={["Contratos", "Cobranças"]} />
      <main className="space-y-4 p-6">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Recebido no mês", valor: recebido, tone: "ok" as Tone, nota: "2 cobranças quitadas" },
            { label: "Em aberto", valor: aberto, tone: "gold" as Tone, nota: "2 cobranças a vencer" },
            { label: "Vencido", valor: vencido, tone: "danger" as Tone, nota: "1 cobrança em atraso" },
          ].map((k) => (
            <Card key={k.label} className="px-5 py-4">
              <p className="text-[13px] font-medium text-ink-700">{k.label}</p>
              <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{brl(k.valor)}</p>
              <div className="mt-2.5">
                <Badge tone={k.tone}>{k.nota}</Badge>
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <Toolbar
            novo="Novo contrato"
            placeholder="Pesquise pelo título, cliente ou modalidade"
            chips={["Todos", "Habilitados", "Desabilitados"]}
          />
          <ul className="divide-y divide-ink-200">
            {contratos.map((c) => (
              <Row key={c.titulo} accent={c.situacao === "Habilitado" ? "bg-gold-400" : "bg-ink-200"}>
                <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_150px_140px_120px_40px] md:items-center">
                  <Field label="Contrato">
                    {c.titulo}
                    <div className="truncate text-xs text-ink-500">{c.cliente}</div>
                  </Field>
                  <Field label="Modalidade">{c.modalidade}</Field>
                  <Field label="Valor">
                    <span className="tabular-nums">
                      {c.modalidade === "Êxito" ? `${c.valor * 100}%` : brl(c.valor)}
                    </span>
                  </Field>
                  <Field label="Próxima cobrança">{c.proxima}</Field>
                  <div className="flex md:justify-end">
                    <Badge tone={toneContrato[c.situacao]}>{c.situacao}</Badge>
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
          <ListFooter total={contratos.length} />
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
            <h2 className="font-display text-[15px] font-semibold">Cobranças</h2>
            <span className="text-xs text-ink-500">Setembro de 2026</span>
          </div>
          <ul className="divide-y divide-ink-200">
            {cobrancas.map((c) => (
              <Row key={c.titulo} accent={c.situacao === "Vencido" ? "bg-danger" : "bg-ink-200"}>
                <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_140px_140px_120px] md:items-center">
                  <Field label="Cobrança">{c.titulo}</Field>
                  <Field label="Cliente">{c.cliente}</Field>
                  <Field label="Vencimento">{c.vencimento}</Field>
                  <Field label="Valor">
                    <span className="tabular-nums">{brl(c.valor)}</span>
                  </Field>
                  <div className="flex md:justify-end">
                    <Badge tone={toneCobranca[c.situacao]}>{c.situacao}</Badge>
                  </div>
                </div>
              </Row>
            ))}
          </ul>
        </Card>
      </main>
    </>
  );
}
