import { exigirPagina } from "@/lib/auth/sessao";
import { pode } from "@/lib/permissoes";
import { Topbar } from "@/components/topbar";
import { Badge, Card } from "@/components/ui";
import { BotaoAcao, Modal } from "@/components/modal";
import { Button } from "@/components/ui";
import { IconAlert, IconChevronLeft, IconChevronRight, IconPlus } from "@/components/icons";
import { ler } from "@/lib/db";
import { criarAtividade, mudarSituacaoAtividade } from "@/lib/acoes";
import { atrasado, iniciais } from "@/lib/util";
import { FormAtividade } from "../page";
import Link from "next/link";

const COLUNAS = ["Pendente", "Em execução", "Revisão", "Concluída"] as const;

const pontoCor: Record<string, string> = {
  Pendente: "bg-warn",
  "Em execução": "bg-gold-400",
  Revisão: "bg-ink-400",
  Concluída: "bg-ok",
};

export default async function KanbanPage() {
  const eu = await exigirPagina("atividades");
  const podeEditar = pode(eu.perfil, "atividades", "editar");
  const b = await ler();

  return (
    <>
      <Topbar
        title="Atividades"
        tabs={[
          { label: "Lista", href: "/atividades" },
          { label: "Kanban", href: "/atividades/kanban" },
        ]}
      />
      <main className="p-4 sm:p-6">
        <div className="mb-3 flex justify-end">
          <Modal permitido={podeEditar}
            titulo="Nova atividade"
            acao={criarAtividade}
            rotuloEnviar="Criar atividade"
            gatilho={<Button variant="primary"><IconPlus className="h-4 w-4" /> Nova atividade</Button>}
          >
            <FormAtividade />
          </Modal>
        </div>

        <div className="scroll-thin flex gap-4 overflow-x-auto pb-2">
          {COLUNAS.map((coluna, ci) => {
            const cards = b.atividades.filter((a) => a.situacao === coluna);
            return (
              <section key={coluna} className="w-[300px] shrink-0">
                <div className="mb-2.5 flex items-center justify-between rounded-lg border border-ink-200 bg-white px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${pontoCor[coluna]}`} />
                    <h2 className="text-[13px] font-semibold">{coluna}</h2>
                  </div>
                  <span className="rounded-full bg-ink-100 px-2 text-[11px] font-medium text-ink-700">
                    {cards.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {cards.map((a) => {
                    const p = b.processos.find((x) => x.id === a.processoId);
                    const cliente = p ? b.pessoas.find((x) => x.id === p.clienteId) : null;
                    const venceu = atrasado(a.fatal) && coluna !== "Concluída";
                    const cor = b.tiposTarefa.find((t) => t.nome === a.tipo)?.cor ?? "#71717a";

                    return (
                      <Card key={a.id} className="relative overflow-hidden p-3.5 transition-shadow hover:shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
                        <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: cor }} />
                        <div className="flex items-start justify-between gap-2">
                          <Badge>{a.tipo}</Badge>
                          {venceu && <IconAlert className="h-4 w-4 text-danger" />}
                        </div>

                        <p className="mt-2 text-[13px] font-medium leading-snug">{cliente?.nome ?? "Sem cliente"}</p>
                        <p className="text-xs text-ink-500">{a.descricao || a.tipo}</p>

                        {p && (
                          <Link href={`/processos/${p.id}`} className="mt-2 block font-mono text-[11px] text-ink-400 hover:text-gold-600">
                            {p.numero}
                          </Link>
                        )}

                        <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-2.5">
                          <div className="text-[11px]">
                            <span className="text-ink-500">Fatal </span>
                            <span className={venceu ? "font-medium text-danger" : "text-ink-900"}>{a.fatal}</span>
                          </div>
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-ink-950 text-[9px] font-semibold text-gold-400">
                            {iniciais(a.responsavel)}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-1">
                          {ci > 0 && (
                            <BotaoAcao permitido={podeEditar}
                              acao={async () => {
                                "use server";
                                await mudarSituacaoAtividade(a.id, COLUNAS[ci - 1]);
                              }}
                              titulo={`Mover para ${COLUNAS[ci - 1]}`}
                              className="grid h-7 flex-1 place-items-center rounded-md border border-ink-200 text-ink-500 hover:border-gold-400 hover:text-gold-600"
                            >
                              <IconChevronLeft className="h-4 w-4" />
                            </BotaoAcao>
                          )}
                          {ci < COLUNAS.length - 1 && (
                            <BotaoAcao permitido={podeEditar}
                              acao={async () => {
                                "use server";
                                await mudarSituacaoAtividade(a.id, COLUNAS[ci + 1]);
                              }}
                              titulo={`Mover para ${COLUNAS[ci + 1]}`}
                              className="grid h-7 flex-1 place-items-center rounded-md border border-ink-200 text-ink-500 hover:border-gold-400 hover:text-gold-600"
                            >
                              <IconChevronRight className="h-4 w-4" />
                            </BotaoAcao>
                          )}
                        </div>
                      </Card>
                    );
                  })}

                  {cards.length === 0 && (
                    <p className="rounded-lg border border-dashed border-ink-200 py-6 text-center text-[12px] text-ink-400">
                      Nada aqui
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
