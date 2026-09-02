import { Topbar } from "@/components/topbar";
import { Badge, Button, Card, CardHeader, Field, Tone } from "@/components/ui";
import { ListFooter, Row, Toolbar } from "@/components/list";
import { IconExport, IconPlus, IconSpark } from "@/components/icons";
import { arquivos, modelos } from "@/lib/mock";

const tone: Record<string, Tone> = {
  Decisão: "gold",
  Petição: "neutral",
  Contrato: "ok",
  Prova: "neutral",
  Procuração: "neutral",
};

export default function DocumentosPage() {
  return (
    <>
      <Topbar title="Documentos" tabs={["Arquivos", "Modelos"]} />
      <main className="grid gap-4 p-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <Toolbar
            novo="Enviar documento"
            placeholder="Pesquise por nome, tipo, processo ou cliente"
            chips={["Todos", "Processo", "Contrato", "Prova"]}
          />
          <ul className="divide-y divide-ink-200">
            {arquivos.map((a) => (
              <Row key={a.nome} accent={a.autor === "Captura automática" ? "bg-gold-400" : "bg-ink-950"}>
                <div className="grid gap-4 md:grid-cols-[40px_1.6fr_1fr_120px_150px_50px] md:items-center">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-[10px] font-semibold text-ink-500">
                    {a.nome.split(".").pop()?.toUpperCase()}
                  </span>
                  <Field label="Documento">
                    {a.nome}
                    <div className="truncate text-xs text-ink-500">{a.data} · {a.tamanho} · {a.autor}</div>
                  </Field>
                  <Field label="Vínculo">
                    <span className="font-mono text-[12px]">{a.vinculo}</span>
                    <div className="truncate text-xs text-ink-500">{a.cliente}</div>
                  </Field>
                  <div className="flex md:justify-end">
                    <Badge tone={tone[a.tipo]}>{a.tipo}</Badge>
                  </div>
                  <div className="hidden md:block" />
                  <div className="hidden justify-end md:flex">
                    <Button size="sm" variant="ghost" aria-label="Baixar">
                      <IconExport className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Row>
            ))}
          </ul>
          <ListFooter total={arquivos.length} />
        </Card>

        <div className="space-y-4">
          <section className="rounded-card border border-ink-950 bg-ink-950 p-5 text-white">
            <div className="flex items-center gap-1.5">
              <IconSpark className="h-4 w-4 text-gold-400" />
              <p className="text-[11px] uppercase tracking-[0.12em] text-gold-400">Redação assistida</p>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-white/85">
              Escolha um modelo e o processo. A peça sai preenchida com partes, número CNJ, valores e
              o histórico dos andamentos — pronta para você revisar.
            </p>
            <button className="mt-4 h-9 w-full rounded-lg bg-gold-400 text-sm font-semibold text-ink-950 hover:bg-gold-200">
              Gerar peça a partir de modelo
            </button>
          </section>

          <Card>
            <CardHeader
              title="Modelos"
              hint="Inclusos no plano"
              action={<Button size="sm" variant="ghost"><IconPlus className="h-4 w-4" /></Button>}
            />
            <ul className="divide-y divide-ink-200 border-t border-ink-200">
              {modelos.map((m) => (
                <li key={m.nome} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{m.nome}</p>
                    <p className="text-xs text-ink-500">{m.area} · usado {m.usos}×</p>
                  </div>
                  <Button size="sm">Usar</Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </main>
    </>
  );
}
