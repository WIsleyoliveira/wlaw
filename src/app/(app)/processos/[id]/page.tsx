import { exigirPagina } from "@/lib/auth/sessao";
import { pode } from "@/lib/permissoes";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { Badge, Button, Card, Tone, cx } from "@/components/ui";
import { BotaoAcao, Modal } from "@/components/modal";
import { Campo, Area, Entrada, Selecao } from "@/components/form";
import { Abas } from "./abas";
import { ResumoIA } from "./resumo-ia";
import { EditorFases } from "./editor-fases";
import { IconPlus } from "@/components/icons";
import { ler } from "@/lib/db";
import {
  alternarMonitoramento, atualizarProcesso, criarAtividade,
  criarDocumento, criarLancamento, definirFase, mudarSituacaoAtividade, salvarFases,
} from "@/lib/acoes";
import { FASES_PADRAO } from "@/lib/tipos";
import { atrasado, brl, hojeBR, horas, iniciais } from "@/lib/util";
import { FormAtividade } from "../../atividades/page";

const toneAtividade: Record<string, Tone> = {
  Pendente: "warn", "Em execução": "gold", Revisão: "neutral",
  Concluída: "ok", "A confirmar": "neutral", Cancelada: "danger",
};

export default async function FichaProcesso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eu = await exigirPagina("processos");
  const podeProcesso = pode(eu.perfil, "processos", "editar");
  const podeAtividades = pode(eu.perfil, "atividades", "editar");
  const podeDocumentos = pode(eu.perfil, "documentos", "editar");
  const podeHoras = pode(eu.perfil, "timesheet", "editar");
  const podeFinanceiro = pode(eu.perfil, "financeiro");
  const podeIA = pode(eu.perfil, "ia");
  const b = await ler();
  const p = b.processos.find((x) => x.id === id);
  if (!p) notFound();

  const cliente = b.pessoas.find((x) => x.id === p.clienteId);
  const andamentos = b.andamentos.filter((a) => a.processoId === p.id);
  const tarefas = b.atividades.filter((a) => a.processoId === p.id);
  const docs = b.documentos.filter((d) => d.processoId === p.id);
  const lanc = b.lancamentos.filter((l) => l.processoId === p.id);
  const minutos = lanc.reduce((s, l) => s + l.minutos, 0);
  const custoHora = 380;
  const custoHoras = Math.round((minutos / 60) * custoHora);
  const contrato = b.contratos.find((c) => c.clienteId === p.clienteId);
  const cobrancas = b.cobrancas.filter((c) => c.clienteId === p.clienteId);
  const faturado = cobrancas.reduce((s, c) => s + c.valor, 0);
  const recebido = cobrancas.filter((c) => c.situacao === "Pago").reduce((s, c) => s + c.valor, 0);
  const fases = p.fases?.length ? p.fases : FASES_PADRAO;
  const indiceFase = Math.max(0, fases.indexOf(p.fase));

  const dados: [string, string][] = [
    ["Classe", p.classe || "—"],
    ["Assunto", p.assunto || "—"],
    ["Órgão julgador", p.orgao || "—"],
    ["Comarca", p.comarca || "—"],
    ["Magistrado", p.juiz || "—"],
    ["Distribuído em", p.distribuido],
    ["Instância", p.instancia],
    ["Grupo de trabalho", p.grupo],
  ];

  /* ---------- Painéis ---------- */

  const painelResumo = (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px] *:min-w-0">
      <div className="space-y-4">
        <Card>
          <div className="border-b border-ink-200 px-5 py-3">
            <h2 className="font-display text-[15px] font-semibold">Dados do processo</h2>
          </div>
          <dl className="grid gap-x-8 gap-y-4 px-5 py-4 sm:grid-cols-2 *:min-w-0">
            {dados.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] uppercase tracking-wide text-ink-400">{k}</dt>
                <dd className="mt-0.5 text-[13px] text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
          {p.observacoes && (
            <div className="border-t border-ink-200 px-5 py-4">
              <dt className="text-[11px] uppercase tracking-wide text-ink-400">Observações internas</dt>
              <dd className="mt-1 text-[13px] leading-snug">{p.observacoes}</dd>
            </div>
          )}
        </Card>

        <Card>
          <div className="border-b border-ink-200 px-5 py-3">
            <h2 className="font-display text-[15px] font-semibold">Últimos andamentos</h2>
          </div>
          {andamentos.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-500">Nenhum andamento capturado ainda.</p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {andamentos.slice(0, 4).map((t) => (
                <li key={t.id} className="flex gap-3 px-5 py-3.5">
                  <div className="w-20 shrink-0 text-[11px] text-ink-500">{t.data}</div>
                  <div className="min-w-0">
                    <Badge tone={t.tipo === "Decisão" ? "gold" : "neutral"}>{t.tipo}</Badge>
                    <p className="mt-1.5 text-[13px] leading-snug">{t.descricao}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        {podeIA && <ResumoIA processoId={p.id} inicial={p.resumoIA} />}

        <Card>
          <div className="border-b border-ink-200 px-5 py-3">
            <h2 className="font-display text-[15px] font-semibold">Exposição financeira</h2>
          </div>
          <div className="space-y-3 px-5 py-4">
            {([["Valor da causa", p.valorCausa], ["Provisionado", p.provisao]] as [string, number][]).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between">
                <span className="text-[13px] text-ink-500">{k}</span>
                <span className="font-display text-[15px] font-semibold tabular-nums">{brl(v)}</span>
              </div>
            ))}
            <div className="border-t border-ink-200 pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-ink-500">Probabilidade de êxito</span>
                <span className="font-display text-[15px] font-semibold text-ok">{p.exito}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-ok" style={{ width: `${p.exito}%` }} />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="border-b border-ink-200 px-5 py-3">
            <h2 className="font-display text-[15px] font-semibold">Equipe</h2>
          </div>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {p.responsaveis.map((r) => (
              <span key={r} className="flex items-center gap-2 rounded-full border border-ink-200 py-1 pl-1 pr-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-ink-950 text-[9px] font-semibold text-gold-400">
                  {iniciais(r)}
                </span>
                <span className="text-[12px]">{r}</span>
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const painelAndamentos = (
    <Card>
      <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
        <h2 className="font-display text-[15px] font-semibold">Linha do tempo</h2>
        <span className="text-xs text-ink-500">{andamentos.length} movimentos</span>
      </div>
      {andamentos.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-ink-500">Nada capturado até agora.</p>
      ) : (
        <ol className="px-5 py-5">
          {andamentos.map((t, i) => (
            <li key={t.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < andamentos.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-ink-200" />}
              <span
                className={cx(
                  "relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white",
                  t.tipo === "Decisão" ? "bg-gold-400" : t.tipo === "Prazo" ? "bg-danger" : "bg-ink-950",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-medium">{t.data}</span>
                  <Badge tone={t.tipo === "Decisão" ? "gold" : t.tipo === "Prazo" ? "danger" : "neutral"}>{t.tipo}</Badge>
                  <span className="text-[11px] text-ink-400">via {t.orgao}</span>
                  {t.origem === "djen" && <Badge tone="neutral">DJEN</Badge>}
                  {t.origem === "mni" && <Badge tone="neutral">PJe · MNI</Badge>}
                  {!t.lido && <Badge tone="gold">não lido</Badge>}
                </div>
                <p className="mt-1 text-[13px] leading-snug text-ink-900">{t.descricao}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );

  const painelPrazos = (
    <Card>
      <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
        <h2 className="font-display text-[15px] font-semibold">Prazos e tarefas</h2>
        <Modal permitido={podeAtividades}
          titulo="Nova tarefa neste processo"
          acao={criarAtividade}
          rotuloEnviar="Criar tarefa"
          gatilho={<Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Nova tarefa</Button>}
        >
          <FormAtividade />
        </Modal>
      </div>
      {tarefas.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-ink-500">Nenhuma tarefa neste processo.</p>
      ) : (
        <ul className="divide-y divide-ink-200">
          {tarefas.map((t) => {
            const venceu = atrasado(t.fatal) && t.situacao !== "Concluída";
            return (
              <li key={t.id} className="grid gap-4 px-5 py-3.5 md:grid-cols-[1.4fr_160px_140px_160px_120px_50px] md:items-center *:min-w-0">
                <div className="min-w-0">
                  <span className="text-[13px] font-medium">{t.tipo}</span>
                  <div className="truncate text-xs text-ink-500">{t.descricao}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ink-400">Previsto</div>
                  <div className="text-[13px]">{t.prevista}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ink-400">Fatal</div>
                  <div className={venceu ? "text-[13px] font-medium text-danger" : "text-[13px]"}>{t.fatal}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ink-400">Responsável</div>
                  <div className="truncate text-[13px]">{t.responsavel}</div>
                </div>
                <div className="md:justify-self-end">
                  <Badge tone={toneAtividade[t.situacao]}>{t.situacao}</Badge>
                </div>
                <div className="flex justify-end">
                  {t.situacao !== "Concluída" && (
                    <BotaoAcao permitido={podeAtividades}
                      acao={async () => {
                        "use server";
                        await mudarSituacaoAtividade(t.id, "Concluída");
                      }}
                      titulo="Concluir"
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-emerald-50 hover:text-ok"
                    >
                      ✓
                    </BotaoAcao>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );

  const painelPartes = (
    <Card>
      <div className="border-b border-ink-200 px-5 py-3">
        <h2 className="font-display text-[15px] font-semibold">Partes</h2>
      </div>
      <ul className="divide-y divide-ink-200">
        {[
          { nome: cliente?.nome ?? "—", tipo: p.papel, doc: cliente?.doc ?? "—", ehCliente: true },
          { nome: p.contraria || "—", tipo: p.papel === "Autor" ? "Réu" : "Autor", doc: "—", ehCliente: false },
        ].map((parte) => (
          <li key={parte.nome} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span className={cx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
              parte.ehCliente ? "bg-ink-950 text-gold-400" : "bg-ink-100 text-ink-700",
            )}>
              {iniciais(parte.nome)}
            </span>
            <div className="min-w-[200px] flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium">{parte.nome}</span>
                {parte.ehCliente && <Badge tone="gold">Cliente</Badge>}
              </div>
              <p className="text-xs text-ink-500">{parte.doc}</p>
            </div>
            <Badge>{parte.tipo}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );

  const painelDocs = (
    <Card>
      <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
        <h2 className="font-display text-[15px] font-semibold">Documentos</h2>
        <Modal permitido={podeDocumentos}
          titulo="Registrar documento"
          acao={criarDocumento}
          rotuloEnviar="Registrar"
          gatilho={<Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Adicionar</Button>}
        >
          <Campo label="Nome do arquivo" obrigatorio className="sm:col-span-2">
            <Entrada name="nome" placeholder="Ex.: Petição inicial.pdf" />
          </Campo>
          <Campo label="Tipo">
            <Selecao name="tipo" opcoes={["Petição", "Decisão", "Prova", "Contrato", "Procuração"]} />
          </Campo>
          <Campo label="Tamanho">
            <Entrada name="tamanho" placeholder="Ex.: 240 KB" />
          </Campo>
          <input type="hidden" name="processoId" value={p.id} />
        </Modal>
      </div>
      {docs.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-ink-500">Nenhum documento neste processo.</p>
      ) : (
        <ul className="divide-y divide-ink-200">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-200 text-[10px] font-semibold text-ink-500">
                {d.nome.split(".").pop()?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{d.nome}</p>
                <p className="text-xs text-ink-500">{d.data} · {d.tamanho} · {d.autor}</p>
              </div>
              <Badge tone={d.tipo === "Decisão" ? "gold" : "neutral"}>{d.tipo}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  const margem = faturado - custoHoras;

  const painelFinanceiro = (
    <div className="grid gap-4 md:grid-cols-2 *:min-w-0">
      <Card>
        <div className="border-b border-ink-200 px-5 py-3">
          <h2 className="font-display text-[15px] font-semibold">Honorários do cliente</h2>
          <p className="mt-0.5 text-xs text-ink-500">{contrato?.titulo ?? "Sem contrato vinculado"}</p>
        </div>
        <div className="space-y-3 px-5 py-4">
          {([["Faturado", faturado], ["Recebido", recebido]] as [string, number][]).map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink-500">{k}</span>
              <span className="text-[15px] font-medium tabular-nums">{brl(v)}</span>
            </div>
          ))}
          <div className="flex items-baseline justify-between border-t border-ink-200 pt-3">
            <span className="text-[13px] font-medium">A receber</span>
            <span className="font-display text-lg font-semibold tabular-nums text-gold-600">
              {brl(faturado - recebido)}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
          <div>
            <h2 className="font-display text-[15px] font-semibold">Rentabilidade</h2>
            <p className="mt-0.5 text-xs text-ink-500">Faturado menos o custo das horas (R$ {custoHora}/h).</p>
          </div>
          <Modal permitido={podeHoras}
            titulo="Lançar horas neste processo"
            acao={criarLancamento}
            rotuloEnviar="Lançar"
            gatilho={<Button size="sm"><IconPlus className="h-4 w-4" /> Horas</Button>}
          >
            <Campo label="Data" obrigatorio>
              <Entrada name="data" defaultValue={hojeBR()} />
            </Campo>
            <Campo label="Horas (hh:mm)" obrigatorio>
              <Entrada name="horas" placeholder="01:30" />
            </Campo>
            <Campo label="Responsável">
              <Selecao name="responsavel" opcoes={b.usuarios.filter((u) => u.ativo).map((u) => u.nome)} />
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
            <input type="hidden" name="processoId" value={p.id} />
          </Modal>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-ink-500">Horas lançadas</span>
            <span className="text-[15px] font-medium tabular-nums">{horas(minutos)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-ink-500">Custo das horas</span>
            <span className="text-[15px] font-medium tabular-nums">{brl(custoHoras)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-ink-200 pt-3">
            <span className="text-[13px] font-medium">Margem</span>
            <span className={cx("font-display text-lg font-semibold tabular-nums", margem >= 0 ? "text-ok" : "text-danger")}>
              {brl(margem)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <>
      <Topbar title="Processo" />
      <main className="space-y-4 p-4 sm:p-6">
        <Card>
          <div className="flex flex-wrap items-start gap-5 px-5 py-4">
            <div className="min-w-0 flex-1 sm:min-w-[280px]">
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/processos" className="text-[13px] text-ink-500 hover:text-gold-600">← Processos</Link>
                <span className="h-3 w-px bg-ink-200" />
                <span className="font-mono text-[13px] text-ink-500">{p.pasta}</span>
                <span className="font-mono text-[13px] font-medium">{p.numero}</span>
                <Badge tone={p.situacao === "Ativo" ? "ok" : "neutral"}>{p.situacao}</Badge>
                {p.monitorado && <Badge tone="gold">Monitorado</Badge>}
                {p.marcadores.map((m) => <Badge key={m} tone="gold">{m}</Badge>)}
              </div>
              <h1 className="mt-1.5 font-display text-[21px] font-semibold leading-tight tracking-tight">{p.titulo}</h1>
              <p className="mt-1 text-[13px] text-ink-500">
                <strong className="font-medium text-ink-900">{cliente?.nome}</strong> ({p.papel}) × {p.contraria} · {p.tribunal} — {p.orgao}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <BotaoAcao permitido={podeProcesso}
                acao={async () => {
                  "use server";
                  await alternarMonitoramento(p.id);
                }}
                className="inline-flex h-9 items-center rounded-lg border border-ink-200 px-3 text-sm font-medium text-ink-900 hover:border-gold-400"
              >
                {p.monitorado ? "Desligar monitoramento" : "Monitorar"}
              </BotaoAcao>

              <Modal permitido={podeProcesso}
                titulo="Editar processo"
                acao={async (f) => {
                  "use server";
                  await atualizarProcesso(p.id, f);
                }}
                gatilho={<Button>Editar</Button>}
              >
                <Campo label="Título" className="sm:col-span-2">
                  <Entrada name="titulo" defaultValue={p.titulo} />
                </Campo>
                <Campo label="Fase atual">
                  <Selecao name="fase" defaultValue={p.fase} opcoes={fases} />
                </Campo>
                <Campo label="Situação">
                  <Selecao name="situacao" defaultValue={p.situacao} opcoes={["Ativo", "Suspenso", "Arquivado", "Baixado"]} />
                </Campo>
                <Campo label="Valor provisionado">
                  <Entrada name="provisao" defaultValue={String(p.provisao)} />
                </Campo>
                <Campo label="Êxito estimado (%)">
                  <Entrada name="exito" defaultValue={String(p.exito)} inputMode="numeric" />
                </Campo>
                <Campo label="Observações internas" className="sm:col-span-2">
                  <Area name="observacoes" defaultValue={p.observacoes} />
                </Campo>
              </Modal>

              <Modal permitido={podeAtividades}
                titulo="Nova tarefa"
                acao={criarAtividade}
                rotuloEnviar="Criar tarefa"
                gatilho={<Button variant="primary"><IconPlus className="h-4 w-4" /> Nova tarefa</Button>}
              >
                <FormAtividade />
              </Modal>
            </div>
          </div>

          <div className="border-t border-ink-200 px-5 py-3">
            <div className="scroll-thin flex items-center gap-1 overflow-x-auto pb-1">
              {fases.map((f, i) => (
                <div key={f} className="flex shrink-0 items-center gap-1">
                  <BotaoAcao desativado={!podeProcesso}
                    acao={async () => {
                      "use server";
                      await definirFase(p.id, f);
                    }}
                    titulo={i === indiceFase ? "Fase em curso" : `Marcar "${f}" como fase atual`}
                    className={cx(
                      "rounded-lg border px-3 py-1.5 text-left transition-colors",
                      i < indiceFase && "border-ink-950 bg-ink-950 text-white hover:bg-ink-900",
                      i === indiceFase && "border-gold-400 bg-gold-50 text-gold-600",
                      i > indiceFase && "border-ink-200 bg-white text-ink-400 hover:border-gold-400",
                    )}
                  >
                    <div className="text-[12px] font-medium leading-tight">{f}</div>
                    <div className={cx("text-[10px]", i < indiceFase ? "text-white/60" : "text-ink-400")}>
                      {i < indiceFase ? "concluída" : i === indiceFase ? "em curso" : "—"}
                    </div>
                  </BotaoAcao>
                  {i < fases.length - 1 && <span className="h-px w-3 bg-ink-200" />}
                </div>
              ))}
              <span className="mx-1 h-6 w-px shrink-0 bg-ink-200" />
              <Modal permitido={podeProcesso}
                titulo="Fases do processo"
                descricao="Defina as etapas deste processo, a ordem e qual está em curso."
                acao={async (form) => {
                  "use server";
                  await salvarFases(p.id, form);
                }}
                rotuloEnviar="Salvar fases"
                gatilho={<Button size="sm" variant="ghost" className="shrink-0">Editar fases</Button>}
              >
                <EditorFases fases={fases} atual={p.fase} />
              </Modal>
            </div>
          </div>

          <Abas
            paineis={[
              { nome: "Resumo", conteudo: painelResumo },
              { nome: `Andamentos (${andamentos.length})`, conteudo: painelAndamentos },
              { nome: `Prazos (${tarefas.length})`, conteudo: painelPrazos },
              { nome: "Partes", conteudo: painelPartes },
              { nome: `Documentos (${docs.length})`, conteudo: painelDocs },
              ...(podeFinanceiro ? [{ nome: "Financeiro", conteudo: painelFinanceiro }] : []),
            ]}
          />
        </Card>
      </main>
    </>
  );
}
