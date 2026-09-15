import { exigirPagina } from "@/lib/auth/sessao";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Badge, Button, Card } from "@/components/ui";
import { BarraFiltros } from "@/components/filtros";
import { BotaoAcao } from "@/components/modal";
import { IconMail } from "@/components/icons";
import { ler } from "@/lib/db";
import { alternarLido, marcarTodosLidos } from "@/lib/acoes";
import { contem } from "@/lib/util";

export default async function AndamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  await exigirPagina("andamentos");
  const b = await ler();
  const chip = sp.situacao ?? "Todos";

  const lista = b.andamentos.filter((a) => {
    const p = b.processos.find((x) => x.id === a.processoId);
    const cliente = p ? b.pessoas.find((x) => x.id === p.clienteId)?.nome : "";
    if (!contem([a.data, a.orgao, a.tipo, a.descricao, p?.numero, p?.pasta, cliente], sp.q ?? "")) return false;
    if (chip === "Não lidos") return !a.lido;
    if (chip === "Lidos") return a.lido;
    return true;
  });

  const naoLidos = b.andamentos.filter((a) => !a.lido).length;

  return (
    <>
      <Topbar title="Andamentos processuais" />
      <main className="p-4 sm:p-6">
        <Card>
          <BarraFiltros
            placeholder="Pesquise por tipo, descrição, órgão, processo ou cliente"
            chips={["Todos", "Não lidos", "Lidos"]}
            novo={
              <form action={marcarTodosLidos}>
                <Button type="submit" variant="primary" disabled={naoLidos === 0}>
                  Marcar todos como lidos
                </Button>
              </form>
            }
          />

          {lista.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-ink-500">Nenhum andamento encontrado.</p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {lista.map((a) => {
                const p = b.processos.find((x) => x.id === a.processoId);
                const cliente = p ? b.pessoas.find((x) => x.id === p.clienteId) : null;
                return (
                  <li key={a.id} className="relative px-5 py-3.5 transition-colors hover:bg-ink-50">
                    <span className={`absolute inset-y-0 left-0 w-[3px] ${a.lido ? "bg-ink-200" : "bg-gold-400"}`} />
                    <div className="grid gap-4 md:grid-cols-[36px_110px_90px_130px_1fr_1.3fr] md:items-center *:min-w-0">
                      <BotaoAcao
                        acao={async () => {
                          "use server";
                          await alternarLido(a.id);
                        }}
                        titulo={a.lido ? "Marcar como não lido" : "Marcar como lido"}
                        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-ink-100"
                      >
                        <IconMail className={a.lido ? "h-[18px] w-[18px] text-ink-400" : "h-[18px] w-[18px] text-gold-500"} />
                      </BotaoAcao>

                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Data</div>
                        <div className={a.lido ? "text-[13px]" : "text-[13px] font-medium"}>{a.data}</div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Órgão</div>
                        <div className="text-[13px]">{a.orgao}</div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Tipo</div>
                        <Badge tone={a.tipo === "Decisão" ? "gold" : a.tipo === "Prazo" ? "danger" : "neutral"}>
                          {a.tipo}
                        </Badge>
                        {a.origem === "djen" && <Badge tone="gold">DJEN</Badge>}
                        {a.origem === "mni" && <Badge tone="gold">PJe · MNI</Badge>}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Processo</div>
                        {p ? (
                          <Link href={`/processos/${p.id}`} className="block truncate font-mono text-[12px] hover:text-gold-600 hover:underline">
                            {p.numero}
                          </Link>
                        ) : <span className="text-[13px] text-ink-400">—</span>}
                        <div className="truncate text-xs text-ink-500">{cliente?.nome ?? "—"}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Descrição</div>
                        <div className={a.lido ? "text-[13px] text-ink-700" : "text-[13px] font-medium"}>{a.descricao}</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3 text-xs text-ink-500">
            <span><strong className="text-ink-900">{lista.length}</strong> de {b.andamentos.length} andamentos</span>
            <span>{naoLidos} não lidos</span>
          </div>
        </Card>
      </main>
    </>
  );
}
