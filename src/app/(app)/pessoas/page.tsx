import { Topbar } from "@/components/topbar";
import { Badge, Card, Field } from "@/components/ui";
import { ListFooter, Row, Toolbar } from "@/components/list";
import { IconMore } from "@/components/icons";
import { pessoas } from "@/lib/mock";

export default function PessoasPage() {
  return (
    <>
      <Topbar title="Pessoas" />
      <main className="p-6">
        <Card>
          <Toolbar
            novo="Nova pessoa"
            placeholder="Pesquise por nome/razão social, e-mail ou CPF/CNPJ"
            chips={["Todos", "Pessoa física", "Pessoa jurídica"]}
          />
          <ul className="divide-y divide-ink-200">
            {pessoas.map((p) => (
              <Row key={p.doc} accent="bg-ink-950">
                <div className="grid gap-4 md:grid-cols-[1.4fr_170px_150px_150px_110px_40px] md:items-center">
                  <Field label="Nome">{p.nome}</Field>
                  <Field label="CPF/CNPJ">
                    <span className="font-mono text-[12px]">{p.doc}</span>
                  </Field>
                  <Field label="Telefone">{p.telefone}</Field>
                  <Field label="Cidade">{p.cidade}</Field>
                  <div className="flex items-center gap-1.5 md:justify-end">
                    <Badge tone={p.tipo === "Jurídica" ? "gold" : "neutral"}>{p.tipo}</Badge>
                    <Badge>{p.processos} proc.</Badge>
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
          <ListFooter total={pessoas.length} />
        </Card>
      </main>
    </>
  );
}
