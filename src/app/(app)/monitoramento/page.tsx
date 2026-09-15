import { exigirPagina } from "@/lib/auth/sessao";
import { pode } from "@/lib/permissoes";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Badge, Card, Tone, cx } from "@/components/ui";
import { BotaoAcao } from "@/components/modal";
import { alternarMonitoramento } from "@/lib/acoes";
import { alternarAlvo, retomarAlvo } from "@/lib/captura/acoes";
import { type EstadoAlvo, lerPainelCaptura } from "@/lib/captura/painel";
import { RodarCiclo } from "./rodar-ciclo";

function relativo(d: Date | null, agora: number) {
  if (!d) return "nunca";
  const minutos = Math.round((agora - new Date(d).getTime()) / 60_000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  return horas < 48 ? `há ${horas} h` : `há ${Math.round(horas / 24)} dias`;
}

/** Em dia = sucesso nas últimas 26 h (o DJEN publica uma vez por dia). */
function saude(e: EstadoAlvo, agora: number): { tone: Tone; rotulo: string } {
  if (!e.ativo) return { tone: "neutral", rotulo: "Desligado" };
  if (e.pausadoAte && new Date(e.pausadoAte).getTime() > agora) return { tone: "danger", rotulo: "Pausado" };
  if (e.falhasSeguidas > 0) return { tone: "warn", rotulo: "Instável" };
  if (!e.ultimoSucesso) return { tone: "neutral", rotulo: "Aguardando" };
  return agora - new Date(e.ultimoSucesso).getTime() > 26 * 3_600_000
    ? { tone: "warn", rotulo: "Desatualizado" }
    : { tone: "ok", rotulo: "Em dia" };
}

const fonte = (f: string) => (f === "djen" ? "DJEN" : "PJe · MNI");

export default async function MonitoramentoPage() {
  const eu = await exigirPagina("monitoramento");
  const podeEditar = pode(eu.perfil, "monitoramento", "editar");
  const podeProcesso = pode(eu.perfil, "processos", "editar");
  const c = await lerPainelCaptura();
  const { agora } = c;
  const conectoresReais = c.conectores.filter((x) => x.ativo && x.modo === "real");
  const comProblema = c.estados.filter((e) => ["danger", "warn"].includes(saude(e, agora).tone));
  const oabsMonitoradas = c.oabs.filter((o) => o.ativo && o.rotulo);
  const semConector = c.processosMonitorados.filter((p) => !p.conectorId);

  return (
    <>
      <Topbar title="Monitoramento" />
      <main className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-3 *:min-w-0">
          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Intimações · DJEN</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-semibold tabular-nums">{c.djen.ultimos30}</span>
              <span className="text-sm text-ink-500">nos últimos 30 dias</span>
            </div>
            <p className="mt-2 text-[11px] text-ink-500">
              {oabsMonitoradas.length} OABs monitoradas · última consulta {relativo(c.djen.ultimaConsulta, agora)}
            </p>
          </Card>

          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Processos · PJe (MNI)</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-semibold tabular-nums">{c.processosMonitorados.length}</span>
              <span className="text-sm text-ink-500">monitorados</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone={conectoresReais.length ? "ok" : "warn"}>{conectoresReais.length} conectores reais</Badge>
              {semConector.length > 0 && <Badge tone="neutral">{semConector.length} sem conector</Badge>}
            </div>
          </Card>

          <Card className="px-5 py-4">
            <p className="text-[13px] font-medium text-ink-700">Saúde da captura</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={cx("font-display text-2xl font-semibold tabular-nums", comProblema.length ? "text-danger" : "text-ok")}>
                {comProblema.length}
              </span>
              <span className="text-sm text-ink-500">alvos com problema</span>
            </div>
            <div className="mt-3">
              {podeEditar && <RodarCiclo />}
            </div>
          </Card>
        </div>

        {conectoresReais.length === 0 && (
          <div className="rounded-card border border-amber-200 bg-amber-50 px-5 py-3.5 text-[13px] leading-snug text-warn">
            <strong className="font-semibold">Nenhum conector do PJe em modo real.</strong> Sem certificado A1, só o DJEN
            captura de verdade: andamentos dos processos não chegam sozinhos.{" "}
            <Link href="/configuracoes" className="font-medium underline">
              Cadastrar certificado e conector
            </Link>
          </div>
        )}

        <Card>
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
            <div>
              <h2 className="font-display text-[15px] font-semibold">Alvos monitorados</h2>
              <p className="text-xs text-ink-500">Cada OAB no DJEN e cada processo ou caixa de avisos no PJe tem sua própria saúde.</p>
            </div>
          </div>
          {c.estados.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-500">
              Nenhuma captura rodou ainda. Clique em “Rodar captura agora” ou suba o agendador.
            </p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {c.estados.map((e) => {
                const s = saude(e, agora);
                return (
                  <li key={`${e.fonte}:${e.alvo}`} className="relative px-5 py-3.5">
                    <span className={cx("absolute inset-y-0 left-0 w-[3px]", s.tone === "danger" ? "bg-danger" : s.tone === "warn" ? "bg-warn" : s.tone === "ok" ? "bg-ok" : "bg-ink-200")} />
                    <div className="grid gap-3 md:grid-cols-[110px_1fr_150px_120px_auto] md:items-center *:min-w-0">
                      <Badge tone="neutral">{fonte(e.fonte)}</Badge>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{e.descricao || e.alvo}</p>
                        {e.ultimoErro && <p className="truncate text-[12px] text-danger">{e.ultimoErro}</p>}
                        {e.pausadoAte && new Date(e.pausadoAte).getTime() > agora && (
                          <p className="text-[11px] text-ink-500">
                            Nova tentativa {new Date(e.pausadoAte).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                            {e.falhasSeguidas} falhas seguidas
                          </p>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Último sucesso</div>
                        <div className="text-[13px]">{relativo(e.ultimoSucesso, agora)}</div>
                      </div>
                      <Badge tone={s.tone}>{s.rotulo}</Badge>
                      <div className="flex justify-end gap-1.5">
                        {e.pausadoAte && new Date(e.pausadoAte).getTime() > agora && (
                          <BotaoAcao permitido={podeEditar}
                            acao={async () => {
                              "use server";
                              await retomarAlvo(e.fonte, e.alvo);
                            }}
                            className="h-8 rounded-lg border border-ink-200 px-2.5 text-[12px] font-medium hover:border-ink-400"
                          >
                            Retomar
                          </BotaoAcao>
                        )}
                        <BotaoAcao permitido={podeEditar}
                          acao={async () => {
                            "use server";
                            await alternarAlvo(e.fonte, e.alvo);
                          }}
                          className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-ink-500 hover:bg-ink-100"
                        >
                          {e.ativo ? "Desligar" : "Ligar"}
                        </BotaoAcao>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-2 *:min-w-0">
          <Card>
            <div className="border-b border-ink-200 px-5 py-3">
              <h2 className="font-display text-[15px] font-semibold">Processos no PJe</h2>
              <p className="text-xs text-ink-500">Ativos e marcados para monitorar. O conector é escolhido pelo tribunal e grau.</p>
            </div>
            {c.processosMonitorados.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-500">Nenhum processo marcado para monitoramento.</p>
            ) : (
              <ul className="divide-y divide-ink-200">
                {c.processosMonitorados.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/processos/${p.id}`} className="text-[13px] font-medium hover:text-gold-600">
                        {p.pasta}
                      </Link>
                      <p className="truncate font-mono text-[11px] text-ink-500">{p.numero}</p>
                    </div>
                    {p.conectorId ? (
                      <Badge tone="gold">{p.conectorId}</Badge>
                    ) : (
                      <Badge tone="neutral">
                        sem conector {p.tribunal} {p.instancia}
                      </Badge>
                    )}
                    <BotaoAcao permitido={podeProcesso}
                      acao={async () => {
                        "use server";
                        await alternarMonitoramento(p.id);
                      }}
                      titulo="Parar de monitorar"
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-danger"
                    >
                      ✕
                    </BotaoAcao>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="border-b border-ink-200 px-5 py-3">
              <h2 className="font-display text-[15px] font-semibold">OABs no DJEN</h2>
              <p className="text-xs text-ink-500">Vêm do cadastro da equipe. Usuário inativo não é consultado.</p>
            </div>
            <ul className="divide-y divide-ink-200">
              {c.oabs.map((o) => (
                <li key={o.usuario} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{o.usuario}</p>
                    <p className="text-[11px] text-ink-500">{o.texto || "sem OAB"}</p>
                  </div>
                  {!o.ativo ? (
                    <Badge tone="neutral">Inativo</Badge>
                  ) : o.rotulo ? (
                    <Badge tone="ok">{o.rotulo}</Badge>
                  ) : (
                    <Badge tone="neutral">OAB não reconhecida</Badge>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card>
          <div className="border-b border-ink-200 px-5 py-3">
            <h2 className="font-display text-[15px] font-semibold">Últimas execuções</h2>
          </div>
          {c.execucoes.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-500">Nada executado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead>
                  <tr className="border-b border-ink-200 text-[11px] uppercase tracking-wide text-ink-400">
                    <th className="px-5 py-2.5 text-left font-medium">Quando</th>
                    <th className="px-3 py-2.5 text-left font-medium">Fonte</th>
                    <th className="px-3 py-2.5 text-left font-medium">Alvo</th>
                    <th className="px-3 py-2.5 text-right font-medium">Lidos</th>
                    <th className="px-3 py-2.5 text-right font-medium">Novos</th>
                    <th className="px-3 py-2.5 text-right font-medium">Requisições</th>
                    <th className="px-5 py-2.5 text-left font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {c.execucoes.map((x) => (
                    <tr key={x.id} className="hover:bg-ink-50">
                      <td className="whitespace-nowrap px-5 py-2.5 text-ink-500">{relativo(x.iniciadoEm, agora)}</td>
                      <td className="px-3 py-2.5">{fonte(x.fonte)}</td>
                      <td className="max-w-[260px] truncate px-3 py-2.5 font-mono text-[12px]">{x.alvo}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{x.itensLidos}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{x.itensNovos}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{x.requisicoes}</td>
                      <td className="px-5 py-2.5">
                        {x.status === "falha" ? (
                          <span className="text-danger" title={x.erro ?? ""}>
                            Falhou{x.erro ? `: ${x.erro.slice(0, 60)}` : ""}
                          </span>
                        ) : (
                          <Badge tone={x.status === "sucesso" ? "ok" : "gold"}>{x.status}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
