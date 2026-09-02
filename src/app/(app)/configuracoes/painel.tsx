"use client";

import { useState } from "react";
import { Badge, Button, Card, Tone, cx } from "@/components/ui";
import { Campo, Entrada, Secao, Selecao } from "@/components/form";
import { IconPlus } from "@/components/icons";

const SECOES = [
  "Escritório",
  "Equipe e permissões",
  "Tipos de tarefa",
  "Prazos e feriados",
  "Integrações",
] as const;
type SecaoNome = (typeof SECOES)[number];

const equipe = [
  { nome: "Alanna Correa Halliday e Silva", email: "alanna@escritorio.adv.br", oab: "OAB/PA 28.114", perfil: "Administrador", grupos: ["Cível", "Empresarial"], ativo: true },
  { nome: "Wisley Oliveira", email: "wisley@escritorio.adv.br", oab: "OAB/PA 31.402", perfil: "Advogado", grupos: ["Empresarial"], ativo: true },
  { nome: "Camila Ferreira", email: "camila@escritorio.adv.br", oab: "Estagiária", perfil: "Estagiário", grupos: ["Cível"], ativo: true },
  { nome: "Rodrigo Alves", email: "rodrigo@escritorio.adv.br", oab: "—", perfil: "Financeiro", grupos: [], ativo: false },
];

const permissoes = [
  { recurso: "Processos", ver: ["Administrador", "Advogado", "Estagiário"], editar: ["Administrador", "Advogado"], excluir: ["Administrador"] },
  { recurso: "Financeiro", ver: ["Administrador", "Financeiro"], editar: ["Administrador", "Financeiro"], excluir: ["Administrador"] },
  { recurso: "Timesheet da equipe", ver: ["Administrador"], editar: ["Administrador"], excluir: ["Administrador"] },
  { recurso: "Documentos", ver: ["Administrador", "Advogado", "Estagiário"], editar: ["Administrador", "Advogado"], excluir: ["Administrador"] },
];

const tiposTarefa = [
  { nome: "Audiência", cor: "#b3261e", prazoPadrao: "Data da audiência", contaDiasUteis: false },
  { nome: "Contrarrazões", cor: "#c98500", prazoPadrao: "15 dias", contaDiasUteis: true },
  { nome: "Manifestação", cor: "#2a78d6", prazoPadrao: "15 dias", contaDiasUteis: true },
  { nome: "Embargos de declaração", cor: "#1f7a4d", prazoPadrao: "5 dias", contaDiasUteis: true },
  { nome: "Diligência", cor: "#71717a", prazoPadrao: "Livre", contaDiasUteis: false },
];

const integracoes = [
  { nome: "PJe / Projudi / eproc", desc: "Captura de andamentos e intimações em 42 tribunais.", status: "Conectado" },
  { nome: "Google Agenda", desc: "Espelha audiências e compromissos na agenda pessoal.", status: "Conectado" },
  { nome: "WhatsApp Business", desc: "Avisa o cliente quando o processo anda. Sem você digitar.", status: "Disponível" },
  { nome: "Certificado digital A1/A3", desc: "Peticionamento direto a partir da ficha do processo.", status: "Disponível" },
  { nome: "Contabilidade (Domínio / Omie)", desc: "Exporta receitas e despesas fechadas do mês.", status: "Disponível" },
];

function ChipPerfil({ p }: { p: string }) {
  return (
    <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-700">{p}</span>
  );
}

export function PainelConfiguracoes() {
  const [secao, setSecao] = useState<SecaoNome>("Escritório");

  return (
    <main className="grid gap-4 p-6 lg:grid-cols-[220px_1fr]">
      <nav className="lg:sticky lg:top-20 lg:self-start">
        <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {SECOES.map((s) => (
            <li key={s}>
              <button
                onClick={() => setSecao(s)}
                className={cx(
                  "relative w-full shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors",
                  secao === s ? "bg-ink-950 text-white" : "text-ink-700 hover:bg-ink-100",
                )}
              >
                {secao === s && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-gold-400" />
                )}
                {s}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-4">
        {secao === "Escritório" && (
          <Card>
            <Secao titulo="Identificação" descricao="Aparece nos relatórios e documentos enviados ao cliente.">
              <Campo label="Razão social" obrigatorio>
                <Entrada defaultValue="Correa Halliday Sociedade de Advogados" />
              </Campo>
              <Campo label="CNPJ">
                <Entrada defaultValue="41.882.115/0001-30" className="font-mono" />
              </Campo>
              <Campo label="OAB da sociedade">
                <Entrada defaultValue="OAB/PA 2.114" />
              </Campo>
              <Campo label="Telefone">
                <Entrada defaultValue="(91) 3222-8800" />
              </Campo>
              <Campo label="Endereço" className="sm:col-span-2">
                <Entrada defaultValue="Av. Nazaré, 1204 — sala 1204, Belém - PA" />
              </Campo>
            </Secao>

            <Secao titulo="Preferências" descricao="Como o sistema se comporta no dia a dia.">
              <Campo label="Fuso horário">
                <Selecao opcoes={["América/Belém (UTC−3)", "América/São_Paulo (UTC−3)"]} />
              </Campo>
              <Campo label="Primeiro dia da semana">
                <Selecao opcoes={["Segunda-feira", "Domingo"]} />
              </Campo>
              <Campo label="Resumo de intimações por e-mail" className="sm:col-span-2" dica="Um único e-mail com tudo do período — não um por intimação.">
                <Selecao opcoes={["1x ao dia, às 8h", "2x ao dia, 8h e 17h", "Um e-mail por intimação", "Não enviar"]} />
              </Campo>
            </Secao>

            <div className="flex justify-end gap-2 px-5 py-4">
              <Button>Descartar</Button>
              <Button variant="primary">Salvar alterações</Button>
            </div>
          </Card>
        )}

        {secao === "Equipe e permissões" && (
          <>
            <Card>
              <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
                <div>
                  <h2 className="font-display text-[15px] font-semibold">Equipe</h2>
                  <p className="text-xs text-ink-500">4 usuários · 3 ativos no plano</p>
                </div>
                <Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Convidar</Button>
              </div>
              <ul className="divide-y divide-ink-200">
                {equipe.map((u) => (
                  <li key={u.email} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <span
                      className={cx(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                        u.ativo ? "bg-ink-950 text-gold-400" : "bg-ink-100 text-ink-400",
                      )}
                    >
                      {u.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-[200px] flex-1">
                      <p className="text-[13px] font-medium">{u.nome}</p>
                      <p className="text-xs text-ink-500">{u.email} · {u.oab}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {u.grupos.map((g) => <ChipPerfil key={g} p={g} />)}
                    </div>
                    <Badge tone={u.perfil === "Administrador" ? "gold" : "neutral"}>{u.perfil}</Badge>
                    <Badge tone={u.ativo ? "ok" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <div className="border-b border-ink-200 px-5 py-3">
                <h2 className="font-display text-[15px] font-semibold">Permissões por perfil</h2>
                <p className="text-xs text-ink-500">
                  Quem enxerga o quê. O financeiro fica invisível para quem não precisa dele.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-[13px]">
                  <thead>
                    <tr className="border-b border-ink-200 text-[11px] uppercase tracking-wide text-ink-400">
                      <th className="px-5 py-2.5 text-left font-medium">Recurso</th>
                      <th className="px-5 py-2.5 text-left font-medium">Visualizar</th>
                      <th className="px-5 py-2.5 text-left font-medium">Editar</th>
                      <th className="px-5 py-2.5 text-left font-medium">Excluir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-200">
                    {permissoes.map((p) => (
                      <tr key={p.recurso} className="hover:bg-ink-50">
                        <td className="px-5 py-3 font-medium">{p.recurso}</td>
                        {[p.ver, p.editar, p.excluir].map((lista, i) => (
                          <td key={i} className="px-5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {lista.map((l) => <ChipPerfil key={l} p={l} />)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {secao === "Tipos de tarefa" && (
          <Card>
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
              <div>
                <h2 className="font-display text-[15px] font-semibold">Tipos de tarefa</h2>
                <p className="text-xs text-ink-500">
                  A cor identifica a tarefa na agenda e no kanban. O prazo padrão é sugerido pela IA
                  ao classificar a intimação.
                </p>
              </div>
              <Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Novo tipo</Button>
            </div>
            <ul className="divide-y divide-ink-200">
              {tiposTarefa.map((t) => (
                <li key={t.nome} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                  <span className="h-6 w-6 shrink-0 rounded-md" style={{ background: t.cor }} />
                  <span className="min-w-[180px] flex-1 text-[13px] font-medium">{t.nome}</span>
                  <div className="min-w-[140px]">
                    <div className="text-[11px] uppercase tracking-wide text-ink-400">Prazo padrão</div>
                    <div className="text-[13px]">{t.prazoPadrao}</div>
                  </div>
                  <Badge tone={t.contaDiasUteis ? "gold" : "neutral"}>
                    {t.contaDiasUteis ? "Dias úteis" : "Dias corridos"}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {secao === "Prazos e feriados" && (
          <>
            <Card>
              <Secao titulo="Contagem de prazos" descricao="Regras aplicadas quando a IA cria a tarefa a partir da intimação.">
                <Campo label="Dias de antecedência do alerta" dica="Quantos dias antes do fatal o responsável é avisado.">
                  <Selecao opcoes={["3 dias", "5 dias", "7 dias", "10 dias"]} />
                </Campo>
                <Campo label="Margem de segurança">
                  <Selecao opcoes={["Data prevista = fatal − 2 dias", "Data prevista = fatal − 5 dias", "Sem margem"]} />
                </Campo>
                <Campo label="Suspensão do art. 220 do CPC" className="sm:col-span-2" dica="20/12 a 20/01 — prazos processuais suspensos.">
                  <Selecao opcoes={["Aplicar automaticamente", "Perguntar caso a caso", "Não aplicar"]} />
                </Campo>
              </Secao>
            </Card>

            <Card>
              <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
                <div>
                  <h2 className="font-display text-[15px] font-semibold">Feriados</h2>
                  <p className="text-xs text-ink-500">
                    Nacionais carregados automaticamente. Adicione os locais e os do tribunal.
                  </p>
                </div>
                <Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Adicionar</Button>
              </div>
              <ul className="divide-y divide-ink-200">
                {[
                  { data: "07/09/2026", nome: "Independência do Brasil", tipo: "Nacional" },
                  { data: "12/10/2026", nome: "Nossa Senhora Aparecida", tipo: "Nacional" },
                  { data: "15/08/2026", nome: "Adesão do Pará à Independência", tipo: "Estadual" },
                  { data: "08/12/2026", nome: "Recesso — TJ-PA (Portaria 1.204)", tipo: "Tribunal" },
                ].map((f) => (
                  <li key={f.data} className="flex items-center gap-4 px-5 py-3">
                    <span className="w-24 text-[13px] tabular-nums">{f.data}</span>
                    <span className="flex-1 text-[13px]">{f.nome}</span>
                    <Badge tone={(f.tipo === "Tribunal" ? "gold" : "neutral") as Tone}>{f.tipo}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}

        {secao === "Integrações" && (
          <Card>
            <div className="border-b border-ink-200 px-5 py-3">
              <h2 className="font-display text-[15px] font-semibold">Integrações</h2>
              <p className="text-xs text-ink-500">Tudo incluso no plano — sem módulo cobrado à parte.</p>
            </div>
            <ul className="divide-y divide-ink-200">
              {integracoes.map((i) => (
                <li key={i.nome} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ink-200 font-display text-[13px] font-semibold text-ink-700">
                    {i.nome[0]}
                  </span>
                  <div className="min-w-[240px] flex-1">
                    <p className="text-[13px] font-medium">{i.nome}</p>
                    <p className="text-xs text-ink-500">{i.desc}</p>
                  </div>
                  {i.status === "Conectado" ? (
                    <>
                      <Badge tone="ok">Conectado</Badge>
                      <Button size="sm">Gerenciar</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="gold">Conectar</Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </main>
  );
}
