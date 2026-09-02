"use client";

import { useState } from "react";
import { Badge, Button, Card, Tone, cx } from "@/components/ui";
import { IconExport, IconPlus, IconSpark } from "@/components/icons";
import {
  documentos, fases, financeiroProcesso, partes, pedidos,
  prazosProcesso, processo, timeline,
} from "@/lib/processo";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ABAS = ["Resumo", "Andamentos", "Prazos", "Partes", "Pedidos", "Documentos", "Financeiro"] as const;
type Aba = (typeof ABAS)[number];

/* ---------------- Trilha de fases ---------------- */

function Trilha() {
  return (
    <div className="scroll-thin flex items-center gap-1 overflow-x-auto pb-1">
      {fases.map((f, i) => {
        const atual = !f.concluida && fases[i - 1]?.concluida;
        return (
          <div key={f.nome} className="flex shrink-0 items-center gap-1">
            <div
              className={cx(
                "rounded-lg border px-3 py-1.5",
                f.concluida && "border-ink-950 bg-ink-950 text-white",
                atual && "border-gold-400 bg-gold-50 text-gold-600",
                !f.concluida && !atual && "border-ink-200 bg-white text-ink-400",
              )}
            >
              <div className="text-[12px] font-medium leading-tight">{f.nome}</div>
              <div className={cx("text-[10px]", f.concluida ? "text-white/60" : "text-ink-400")}>
                {f.data}
              </div>
            </div>
            {i < fases.length - 1 && <span className="h-px w-3 bg-ink-200" />}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Abas ---------------- */

function Resumo() {
  const dados: [string, string][] = [
    ["Classe", processo.classe],
    ["Assunto", processo.assunto],
    ["Órgão julgador", processo.orgao],
    ["Comarca", processo.comarca],
    ["Magistrado", processo.juiz],
    ["Distribuído em", processo.distribuido],
    ["Instância", `${processo.instancia} instância`],
    ["Segredo de justiça", processo.segredo ? "Sim" : "Não"],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card>
          <div className="border-b border-ink-200 px-5 py-3">
            <h2 className="font-display text-[15px] font-semibold">Dados do processo</h2>
          </div>
          <dl className="grid gap-x-8 gap-y-4 px-5 py-4 sm:grid-cols-2">
            {dados.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] uppercase tracking-wide text-ink-400">{k}</dt>
                <dd className="mt-0.5 text-[13px] text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <div className="border-b border-ink-200 px-5 py-3">
            <h2 className="font-display text-[15px] font-semibold">Últimos andamentos</h2>
          </div>
          <ul className="divide-y divide-ink-200">
            {timeline.slice(0, 3).map((t) => (
              <li key={t.titulo} className="flex gap-3 px-5 py-3.5">
                <div className="w-16 shrink-0 text-[11px] text-ink-500">
                  {t.data}
                  <div className="text-ink-400">{t.hora}</div>
                </div>
                <div className="min-w-0">
                  <Badge tone={t.tipo === "Decisão" ? "gold" : "neutral"}>{t.tipo}</Badge>
                  <p className="mt-1.5 text-[13px] leading-snug">{t.titulo}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="space-y-4">
        <section className="rounded-card border border-ink-950 bg-ink-950 p-5 text-white">
          <div className="flex items-center gap-1.5">
            <IconSpark className="h-4 w-4 text-gold-400" />
            <p className="text-[11px] uppercase tracking-[0.12em] text-gold-400">Resumo da IA</p>
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-white/85">
            Feito saneado em 18/08. A denunciação da lide à seguradora foi <strong className="text-white">deferida</strong>,
            o que amplia a chance de satisfação do crédito. Audiência de instrução em 03/09 — o rol de
            testemunhas já foi protocolado. Risco principal: o pedido de danos morais foi indeferido e
            não houve agravo no prazo.
          </p>
          <button className="mt-4 h-9 w-full rounded-lg bg-gold-400 text-sm font-semibold text-ink-950 hover:bg-gold-200">
            Perguntar sobre este processo
          </button>
        </section>

        <Card>
          <div className="border-b border-ink-200 px-5 py-3">
            <h2 className="font-display text-[15px] font-semibold">Exposição financeira</h2>
          </div>
          <div className="space-y-3 px-5 py-4">
            {[
              ["Valor da causa", processo.valorCausa],
              ["Provisionado", processo.provisao],
              ["Honorários contratados", financeiroProcesso.contratado],
            ].map(([k, v]) => (
              <div key={k as string} className="flex items-baseline justify-between">
                <span className="text-[13px] text-ink-500">{k as string}</span>
                <span className="font-display text-[15px] font-semibold tabular-nums">
                  {brl(v as number)}
                </span>
              </div>
            ))}
            <div className="border-t border-ink-200 pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-ink-500">Probabilidade de êxito</span>
                <span className="font-display text-[15px] font-semibold text-ok">{processo.exito}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-ok" style={{ width: `${processo.exito}%` }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Andamentos() {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
        <h2 className="font-display text-[15px] font-semibold">Linha do tempo</h2>
        <Button size="sm"><IconExport className="h-4 w-4" /> Exportar</Button>
      </div>
      <ol className="px-5 py-5">
        {timeline.map((t, i) => (
          <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {i < timeline.length - 1 && (
              <span className="absolute left-[7px] top-4 h-full w-px bg-ink-200" />
            )}
            <span
              className={cx(
                "relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white",
                t.tipo === "Decisão" ? "bg-gold-400" : t.tipo === "Prazo" ? "bg-danger" : "bg-ink-950",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium">{t.data}</span>
                <span className="text-[11px] text-ink-400">{t.hora}</span>
                <Badge tone={t.tipo === "Decisão" ? "gold" : t.tipo === "Prazo" ? "danger" : "neutral"}>
                  {t.tipo}
                </Badge>
                <span className="text-[11px] text-ink-400">via {t.origem}</span>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-ink-900">{t.titulo}</p>
              {t.anexo && (
                <button className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-ink-200 px-2 py-1 text-[11px] text-ink-700 hover:border-gold-400 hover:bg-gold-50">
                  📎 {t.anexo}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Prazos() {
  const tone: Record<string, Tone> = { Pendente: "warn", Concluída: "ok", "A confirmar": "neutral" };
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
        <h2 className="font-display text-[15px] font-semibold">Prazos e tarefas</h2>
        <Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Nova tarefa</Button>
      </div>
      <ul className="divide-y divide-ink-200">
        {prazosProcesso.map((p) => (
          <li key={p.tarefa} className="grid gap-4 px-5 py-3.5 md:grid-cols-[1.4fr_160px_140px_160px_120px] md:items-center">
            <span className="text-[13px] font-medium">{p.tarefa}</span>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-ink-400">Previsto</div>
              <div className="text-[13px]">{p.previsto}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-ink-400">Fatal</div>
              <div className="text-[13px] text-danger">{p.fatal}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-ink-400">Responsável</div>
              <div className="text-[13px]">{p.responsavel}</div>
            </div>
            <div className="md:justify-self-end">
              <Badge tone={tone[p.situacao]}>{p.situacao}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Partes() {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
        <h2 className="font-display text-[15px] font-semibold">Partes e procuradores</h2>
        <Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Adicionar parte</Button>
      </div>
      <ul className="divide-y divide-ink-200">
        {partes.map((p) => (
          <li key={p.doc} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span
              className={cx(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                p.cliente ? "bg-ink-950 text-gold-400" : "bg-ink-100 text-ink-700",
              )}
            >
              {p.nome.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-[200px] flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium">{p.nome}</span>
                {p.cliente && <Badge tone="gold">Cliente</Badge>}
              </div>
              <p className="text-xs text-ink-500">{p.doc}</p>
            </div>
            <div className="min-w-[240px]">
              <div className="text-[11px] uppercase tracking-wide text-ink-400">Advogado</div>
              <div className="text-[13px]">{p.advogado}</div>
            </div>
            <Badge>{p.tipo}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Pedidos() {
  const tone: Record<string, Tone> = { Deferido: "ok", Parcial: "warn", Indeferido: "danger" };
  const soma = (k: "pedido" | "deferido" | "provisao") => pedidos.reduce((s, p) => s + p[k], 0);

  return (
    <Card>
      <div className="border-b border-ink-200 px-5 py-3">
        <h2 className="font-display text-[15px] font-semibold">Pedidos e provisionamento</h2>
        <p className="mt-0.5 text-xs text-ink-500">
          A soma provisionada alimenta o relatório de contingências do cliente.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b border-ink-200 text-[11px] uppercase tracking-wide text-ink-400">
              <th className="px-5 py-2.5 text-left font-medium">Pedido</th>
              <th className="px-5 py-2.5 text-right font-medium">Valor pedido</th>
              <th className="px-5 py-2.5 text-right font-medium">Deferido</th>
              <th className="px-5 py-2.5 text-right font-medium">Provisão</th>
              <th className="px-5 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {pedidos.map((p) => (
              <tr key={p.descricao} className="hover:bg-ink-50">
                <td className="px-5 py-3">{p.descricao}</td>
                <td className="px-5 py-3 text-right tabular-nums">{brl(p.pedido)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{brl(p.deferido)}</td>
                <td className="px-5 py-3 text-right tabular-nums font-medium">{brl(p.provisao)}</td>
                <td className="px-5 py-3 text-right"><Badge tone={tone[p.status]}>{p.status}</Badge></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink-950 font-medium">
              <td className="px-5 py-3">Total</td>
              <td className="px-5 py-3 text-right tabular-nums">{brl(soma("pedido"))}</td>
              <td className="px-5 py-3 text-right tabular-nums">{brl(soma("deferido"))}</td>
              <td className="px-5 py-3 text-right tabular-nums text-gold-600">{brl(soma("provisao"))}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function Documentos() {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
        <h2 className="font-display text-[15px] font-semibold">Documentos</h2>
        <Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Enviar documento</Button>
      </div>
      <ul className="divide-y divide-ink-200">
        {documentos.map((d) => (
          <li key={d.nome} className="flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-200 text-[10px] font-semibold text-ink-500">
              {d.nome.split(".").pop()?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{d.nome}</p>
              <p className="text-xs text-ink-500">{d.data} · {d.tamanho} · {d.autor}</p>
            </div>
            <Badge tone={d.tipo === "Decisão" ? "gold" : "neutral"}>{d.tipo}</Badge>
            <Button size="sm" variant="ghost" aria-label="Baixar">
              <IconExport className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Financeiro() {
  const f = financeiroProcesso;
  const margem = f.faturado - f.custoHoras - f.despesas;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <div className="border-b border-ink-200 px-5 py-3">
          <h2 className="font-display text-[15px] font-semibold">Honorários do caso</h2>
        </div>
        <div className="space-y-3 px-5 py-4">
          {[
            ["Contratado", f.contratado],
            ["Faturado", f.faturado],
            ["Recebido", f.recebido],
            ["Despesas reembolsáveis", f.despesas],
          ].map(([k, v]) => (
            <div key={k as string} className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink-500">{k as string}</span>
              <span className="text-[15px] font-medium tabular-nums">{brl(v as number)}</span>
            </div>
          ))}
          <div className="flex items-baseline justify-between border-t border-ink-200 pt-3">
            <span className="text-[13px] font-medium">A receber</span>
            <span className="font-display text-lg font-semibold tabular-nums text-gold-600">
              {brl(f.faturado - f.recebido)}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-ink-200 px-5 py-3">
          <h2 className="font-display text-[15px] font-semibold">Rentabilidade</h2>
          <p className="mt-0.5 text-xs text-ink-500">Faturado menos custo das horas e despesas.</p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-ink-500">Horas lançadas</span>
            <span className="text-[15px] font-medium tabular-nums">{f.horas} h</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-ink-500">Custo das horas</span>
            <span className="text-[15px] font-medium tabular-nums">{brl(f.custoHoras)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-ink-200 pt-3">
            <span className="text-[13px] font-medium">Margem</span>
            <span
              className={cx(
                "font-display text-lg font-semibold tabular-nums",
                margem >= 0 ? "text-ok" : "text-danger",
              )}
            >
              {brl(margem)}
            </span>
          </div>
          <p className="text-[11px] leading-snug text-ink-500">
            Nenhum concorrente mostra isso por processo — é o número que diz se vale a pena
            continuar tocando o caso.
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Página ---------------- */

export function Ficha() {
  const [aba, setAba] = useState<Aba>("Resumo");

  return (
    <main className="space-y-4 p-6">
      {/* Cabeçalho */}
      <Card>
        <div className="flex flex-wrap items-start gap-5 px-5 py-4">
          <div className="min-w-[280px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[13px] text-ink-500">{processo.pasta}</span>
              <span className="h-3 w-px bg-ink-200" />
              <span className="font-mono text-[13px] font-medium">{processo.numero}</span>
              <Badge tone="ok">{processo.situacao}</Badge>
              {processo.marcadores.map((m) => (
                <Badge key={m} tone="gold">{m}</Badge>
              ))}
            </div>
            <h1 className="mt-1.5 font-display text-[21px] font-semibold leading-tight tracking-tight">
              {processo.titulo}
            </h1>
            <p className="mt-1 text-[13px] text-ink-500">
              <strong className="font-medium text-ink-900">{processo.cliente}</strong> ({processo.papel}){" "}
              × {processo.contraria} · {processo.orgao}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button><IconExport className="h-4 w-4" /> Exportar ficha</Button>
            <Button variant="primary"><IconPlus className="h-4 w-4" /> Nova tarefa</Button>
          </div>
        </div>

        <div className="border-t border-ink-200 px-5 py-3">
          <Trilha />
        </div>

        <div className="flex gap-1 overflow-x-auto border-t border-ink-200 px-3">
          {ABAS.map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={cx(
                "relative shrink-0 px-3 py-2.5 text-[13px] font-medium transition-colors",
                aba === a ? "text-ink-950" : "text-ink-500 hover:text-ink-900",
              )}
            >
              {a}
              {aba === a && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t bg-gold-400" />}
            </button>
          ))}
        </div>
      </Card>

      {aba === "Resumo" && <Resumo />}
      {aba === "Andamentos" && <Andamentos />}
      {aba === "Prazos" && <Prazos />}
      {aba === "Partes" && <Partes />}
      {aba === "Pedidos" && <Pedidos />}
      {aba === "Documentos" && <Documentos />}
      {aba === "Financeiro" && <Financeiro />}
    </main>
  );
}
