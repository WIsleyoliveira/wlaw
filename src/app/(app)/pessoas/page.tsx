import { exigirPagina } from "@/lib/auth/sessao";
import { pode } from "@/lib/permissoes";
import { Topbar } from "@/components/topbar";
import { Badge, Button, Card } from "@/components/ui";
import { BarraFiltros } from "@/components/filtros";
import { Modal } from "@/components/modal";
import { Campo, Entrada, Selecao } from "@/components/form";
import { IconPlus } from "@/components/icons";
import { ler } from "@/lib/db";
import { criarPessoa } from "@/lib/acoes";
import { brlCurto, contem, iniciais } from "@/lib/util";

export default async function PessoasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const eu = await exigirPagina("pessoas");
  const podeEditar = pode(eu.perfil, "pessoas", "editar");
  const b = await ler();
  const chip = sp.situacao ?? "Todos";

  const lista = b.pessoas.filter((p) => {
    if (!contem([p.nome, p.doc, p.email, p.telefone, p.cidade], sp.q ?? "")) return false;
    if (chip === "Pessoa física") return p.tipo === "Física";
    if (chip === "Pessoa jurídica") return p.tipo === "Jurídica";
    if (chip === "Clientes") return p.cliente;
    return true;
  });

  return (
    <>
      <Topbar title="Pessoas" />
      <main className="p-4 sm:p-6">
        <Card>
          <BarraFiltros
            placeholder="Pesquise por nome, CPF/CNPJ, e-mail ou cidade"
            chips={["Todos", "Clientes", "Pessoa física", "Pessoa jurídica"]}
            novo={
              <Modal permitido={podeEditar}
                titulo="Nova pessoa"
                descricao="Clientes ficam disponíveis para vincular a processos e contratos."
                acao={criarPessoa}
                rotuloEnviar="Cadastrar"
                gatilho={<Button variant="primary"><IconPlus className="h-4 w-4" /> Nova pessoa</Button>}
              >
                <Campo label="Nome / Razão social" obrigatorio className="sm:col-span-2">
                  <Entrada name="nome" required />
                </Campo>
                <Campo label="Tipo" obrigatorio>
                  <Selecao name="tipo" opcoes={["Física", "Jurídica"]} />
                </Campo>
                <Campo label="CPF / CNPJ">
                  <Entrada name="doc" placeholder="000.000.000-00" />
                </Campo>
                <Campo label="E-mail">
                  <Entrada name="email" type="email" />
                </Campo>
                <Campo label="Telefone">
                  <Entrada name="telefone" placeholder="(00) 00000-0000" />
                </Campo>
                <Campo label="Cidade" className="sm:col-span-2">
                  <Entrada name="cidade" placeholder="Cidade - UF" />
                </Campo>
                <Campo label="É cliente do escritório?" className="sm:col-span-2">
                  <label className="flex h-10 items-center gap-2 text-[13px]">
                    <input type="checkbox" name="cliente" defaultChecked className="h-4 w-4 accent-[#b08d3f]" />
                    Sim — pode ser vinculada a processos e contratos
                  </label>
                </Campo>
              </Modal>
            }
          />

          {lista.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-ink-500">Nenhuma pessoa encontrada.</p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {lista.map((p) => {
                const processos = b.processos.filter((x) => x.clienteId === p.id);
                const receita = b.cobrancas.filter((c) => c.clienteId === p.id).reduce((s, c) => s + c.valor, 0);
                return (
                  <li key={p.id} className="relative px-5 py-3.5 transition-colors hover:bg-ink-50">
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-ink-950" />
                    <div className="grid gap-4 md:grid-cols-[40px_1.4fr_170px_160px_150px_150px] md:items-center *:min-w-0">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-100 text-[11px] font-semibold text-ink-700">
                        {iniciais(p.nome)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Nome</div>
                        <div className="truncate text-[13px] font-medium">{p.nome}</div>
                        <div className="truncate text-xs text-ink-500">{p.email}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">CPF / CNPJ</div>
                        <div className="font-mono text-[12px]">{p.doc}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Telefone</div>
                        <div className="text-[13px]">{p.telefone}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Cidade</div>
                        <div className="truncate text-[13px]">{p.cidade}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 md:justify-end">
                        <Badge tone={p.tipo === "Jurídica" ? "gold" : "neutral"}>{p.tipo}</Badge>
                        {processos.length > 0 && <Badge>{processos.length} proc.</Badge>}
                        {receita > 0 && <Badge tone="ok">{brlCurto(receita)}</Badge>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3 text-xs text-ink-500">
            <span><strong className="text-ink-900">{lista.length}</strong> de {b.pessoas.length} pessoas</span>
            <span>{b.pessoas.filter((p) => p.cliente).length} clientes</span>
          </div>
        </Card>
      </main>
    </>
  );
}
