import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Badge, Card, Field, Tone } from "@/components/ui";
import { ListFooter, Row, Toolbar } from "@/components/list";
import { IconMore } from "@/components/icons";
import { processos } from "@/lib/mock";

const tone: Record<string, Tone> = {
  Movimentado: "ok",
  Parado: "danger",
  Incompleto: "warn",
};

export default function ProcessosPage() {
  return (
    <>
      <Topbar title="Processos" />
      <main className="p-6">
        <Card>
          <Toolbar
            novo="Novo processo"
            novoHref="/processos/novo"
            placeholder="Pesquise por pasta, nº do processo, assunto ou envolvido"
            chips={["Todos", "Incompletos", "Movimentados", "Parados"]}
            filtros={2}
          />
          <ul className="divide-y divide-ink-200">
            {processos.map((p) => (
              <Row key={p.pasta} accent="bg-ink-950">
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_120px_110px_40px] md:items-center">
                  <Field label="Cliente">
                    <Link href={`/processos/${p.pasta}`} className="font-medium underline-offset-2 hover:text-gold-600 hover:underline">
                      {p.cliente}
                    </Link>
                    <div className="mt-0.5">
                      <Badge>{p.papel}</Badge>
                    </div>
                  </Field>
                  <Field label="Número do processo">
                    <Link href={`/processos/${p.pasta}`} className="font-mono text-[12px] underline-offset-2 hover:text-gold-600 hover:underline">
                      {p.numero}
                    </Link>
                    <div className="truncate text-xs text-ink-500">{p.pasta}</div>
                  </Field>
                  <Field label="Órgão">
                    {p.orgao}
                    <div className="truncate text-xs text-ink-500">{p.assunto}</div>
                  </Field>
                  <Field label="Instância">{p.instancia}</Field>
                  <div className="flex md:justify-end">
                    <Badge tone={tone[p.status]}>{p.status}</Badge>
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
          <ListFooter total={processos.length} />
        </Card>
      </main>
    </>
  );
}
