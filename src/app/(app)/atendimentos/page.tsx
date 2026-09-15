import { exigirPagina } from "@/lib/auth/sessao";
import { pode } from "@/lib/permissoes";
import { Topbar } from "@/components/topbar";
import { Badge, Button, Card, Tone } from "@/components/ui";
import { BarraFiltros } from "@/components/filtros";
import { BotaoAcao, Modal } from "@/components/modal";
import { Campo, Entrada, Selecao } from "@/components/form";
import { IconPlus } from "@/components/icons";
import { ler } from "@/lib/db";
import { criarAtendimento, excluirAtendimento } from "@/lib/acoes";
import { contem } from "@/lib/util";

const toneTipo: Record<string, Tone> = {
  Reunião: "gold",
  Ligação: "neutral",
  Videochamada: "ok",
  Presencial: "warn",
};

export default async function AtendimentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const eu = await exigirPagina("atendimentos");
  const podeExcluir = pode(eu.perfil, "atendimentos", "excluir");
  const b = await ler();
  const chip = sp.situacao ?? "Todos";
  const clientes = b.pessoas.filter((p) => p.cliente);
  const nome = (id: string) => b.pessoas.find((p) => p.id === id)?.nome ?? "—";

  const lista = b.atendimentos.filter((a) => {
    const p = a.processoId ? b.processos.find((x) => x.id === a.processoId) : null;
    if (!contem([a.assunto, a.responsavel, nome(a.clienteId), p?.pasta, p?.numero], sp.q ?? "")) return false;
    if (chip !== "Todos" && a.tipo !== chip) return false;
    return true;
  });

  return (
    <>
      <Topbar title="Atendimentos" />
      <main className="p-4 sm:p-6">
        <Card>
          <BarraFiltros
            placeholder="Pesquise por cliente, responsável ou assunto"
            chips={["Todos", "Reunião", "Ligação", "Videochamada", "Presencial"]}
            novo={
              <Modal
                titulo="Novo atendimento"
                descricao="Registre um contato com o cliente, vinculado ou não a um processo."
                acao={criarAtendimento}
                rotuloEnviar="Registrar"
                gatilho={<Button variant="primary"><IconPlus className="h-4 w-4" /> Novo atendimento</Button>}
              >
                <Campo label="Data" obrigatorio>
                  <Entrada name="data" placeholder="dd/mm/aaaa" defaultValue={new Date().toLocaleDateString("pt-BR")} required />
                </Campo>
                <Campo label="Tipo" obrigatorio>
                  <Selecao name="tipo" opcoes={["Reunião", "Ligação", "Videochamada", "Presencial"]} />
                </Campo>
                <Campo label="Cliente" obrigatorio className="sm:col-span-2">
                  <select name="clienteId" required className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400">
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Processo vinculado" className="sm:col-span-2">
                  <select name="processoId" className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400">
                    <option value="">Sem vínculo</option>
                    {b.processos.map((p) => <option key={p.id} value={p.id}>{p.pasta} — {p.numero}</option>)}
                  </select>
                </Campo>
                <Campo label="Responsável" obrigatorio>
                  <Selecao name="responsavel" opcoes={b.usuarios.filter((u) => u.ativo).map((u) => u.nome)} />
                </Campo>
                <Campo label="Assunto" obrigatorio className="sm:col-span-2">
                  <Entrada name="assunto" placeholder="O que foi tratado" required />
                </Campo>
              </Modal>
            }
          />

          {lista.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-ink-500">Nenhum atendimento registrado.</p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {lista.map((a) => {
                const p = a.processoId ? b.processos.find((x) => x.id === a.processoId) : null;
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5 hover:bg-ink-50">
                    <div className="w-24 shrink-0 text-[13px]">{a.data}</div>
                    <div className="min-w-[200px] flex-1">
                      <p className="text-[13px] font-medium">{a.assunto}</p>
                      <p className="text-xs text-ink-500">
                        {nome(a.clienteId)}{p ? ` · ${p.pasta}` : ""} · {a.responsavel}
                      </p>
                    </div>
                    <Badge tone={toneTipo[a.tipo]}>{a.tipo}</Badge>
                    <BotaoAcao permitido={podeExcluir}
                      acao={async () => {
                        "use server";
                        await excluirAtendimento(a.id);
                      }}
                      titulo="Excluir"
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-danger"
                    >
                      ✕
                    </BotaoAcao>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3 text-xs text-ink-500">
            <span><strong className="text-ink-900">{lista.length}</strong> de {b.atendimentos.length} atendimentos</span>
          </div>
        </Card>
      </main>
    </>
  );
}
