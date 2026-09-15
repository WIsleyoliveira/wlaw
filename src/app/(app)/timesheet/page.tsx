import { exigirPagina } from "@/lib/auth/sessao";
import { pode } from "@/lib/permissoes";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Badge, Button, Card } from "@/components/ui";
import { BarraFiltros } from "@/components/filtros";
import { BotaoAcao, Modal } from "@/components/modal";
import { Campo, Entrada, Selecao } from "@/components/form";
import { Cronometro } from "@/components/cronometro";
import { IconPlus } from "@/components/icons";
import { ler } from "@/lib/db";
import { criarLancamento, excluirLancamento } from "@/lib/acoes";
import { contem, hojeBR, horas } from "@/lib/util";

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const eu = await exigirPagina("timesheet");
  const podeEquipe = pode(eu.perfil, "equipeTimesheet");
  const b = await ler();
  const chip = sp.situacao ?? "Todos";
  // Sem permissão de equipe, cada um lança e vê só as próprias horas.
  const usuarios = podeEquipe ? b.usuarios.filter((u) => u.ativo).map((u) => u.nome) : [eu.nome];
  const processos = b.processos.map((p) => ({ id: p.id, rotulo: `${p.pasta} — ${p.numero}` }));

  const lista = b.lancamentos.filter((l) => {
    if (!podeEquipe && l.responsavel !== eu.nome) return false;
    const p = b.processos.find((x) => x.id === l.processoId);
    const cliente = p ? b.pessoas.find((x) => x.id === p.clienteId)?.nome : "";
    if (!contem([l.descricao, l.responsavel, l.data, p?.pasta, p?.numero, cliente], sp.q ?? "")) return false;
    if (chip === "Faturáveis") return l.faturavel;
    if (chip === "Internos") return !l.faturavel;
    return true;
  });

  const total = lista.reduce((s, l) => s + l.minutos, 0);
  const faturavel = lista.filter((l) => l.faturavel).reduce((s, l) => s + l.minutos, 0);

  return (
    <>
      <Topbar title="Timesheet" />
      <main className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_200px] *:min-w-0">
          <Cronometro processos={processos} usuarios={usuarios} acao={criarLancamento} />

          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Horas no filtro</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{horas(total)}</p>
            <p className="mt-1 text-xs text-ink-500">{lista.length} lançamentos</p>
          </Card>

          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Faturável</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{horas(faturavel)}</p>
            <div className="mt-2">
              <Badge tone="gold">{total ? Math.round((faturavel / total) * 100) : 0}% do total</Badge>
            </div>
          </Card>
        </div>

        <Card>
          <BarraFiltros
            placeholder="Pesquise por responsável, cliente, processo ou descrição"
            chips={["Todos", "Faturáveis", "Internos"]}
            novo={
              <Modal
                titulo="Novo lançamento"
                acao={criarLancamento}
                rotuloEnviar="Lançar horas"
                gatilho={<Button variant="primary"><IconPlus className="h-4 w-4" /> Novo lançamento</Button>}
              >
                <Campo label="Data" obrigatorio>
                  <Entrada name="data" defaultValue={hojeBR()} required />
                </Campo>
                <Campo label="Horas (hh:mm)" obrigatorio>
                  <Entrada name="horas" placeholder="01:30" required />
                </Campo>
                <Campo label="Processo" className="sm:col-span-2">
                  <select name="processoId" className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400">
                    <option value="">Sem vínculo</option>
                    {processos.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
                  </select>
                </Campo>
                <Campo label="Responsável" obrigatorio>
                  <Selecao name="responsavel" opcoes={usuarios} />
                </Campo>
                <Campo label="Faturável">
                  <label className="flex h-10 items-center gap-2 text-[13px]">
                    <input type="checkbox" name="faturavel" defaultChecked className="h-4 w-4 accent-[#b08d3f]" />
                    Cobrar do cliente
                  </label>
                </Campo>
                <Campo label="Descrição" className="sm:col-span-2">
                  <Entrada name="descricao" placeholder="O que foi feito" />
                </Campo>
              </Modal>
            }
          />

          {lista.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-ink-500">Nenhum lançamento encontrado.</p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {lista.map((l) => {
                const p = b.processos.find((x) => x.id === l.processoId);
                const cliente = p ? b.pessoas.find((x) => x.id === p.clienteId) : null;
                return (
                  <li key={l.id} className="relative px-5 py-3.5 transition-colors hover:bg-ink-50">
                    <span className={`absolute inset-y-0 left-0 w-[3px] ${l.faturavel ? "bg-gold-400" : "bg-ink-200"}`} />
                    <div className="grid gap-4 md:grid-cols-[110px_90px_1fr_1.3fr_150px_110px_50px] md:items-center *:min-w-0">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Data</div>
                        <div className="text-[13px]">{l.data}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Horas</div>
                        <div className="text-[13px] font-medium tabular-nums">{horas(l.minutos)}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Vínculo</div>
                        {p ? (
                          <Link href={`/processos/${p.id}`} className="block truncate font-mono text-[12px] hover:text-gold-600 hover:underline">
                            {p.pasta}
                          </Link>
                        ) : <span className="text-[13px] text-ink-400">—</span>}
                        <div className="truncate text-xs text-ink-500">{cliente?.nome ?? "—"}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Descrição</div>
                        <div className="truncate text-[13px]">{l.descricao || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Responsável</div>
                        <div className="truncate text-[13px]">{l.responsavel}</div>
                      </div>
                      <div className="md:justify-self-end">
                        <Badge tone={l.faturavel ? "gold" : "neutral"}>{l.faturavel ? "Faturável" : "Interno"}</Badge>
                      </div>
                      <div className="flex justify-end">
                        <BotaoAcao permitido={podeEquipe || l.responsavel === eu.nome}
                          acao={async () => {
                            "use server";
                            await excluirLancamento(l.id);
                          }}
                          titulo="Excluir"
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-danger"
                        >
                          ✕
                        </BotaoAcao>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
