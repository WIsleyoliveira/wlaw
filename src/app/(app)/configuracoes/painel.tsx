"use client";

import { useState } from "react";
import { Badge, Button, Card, Tone, cx } from "@/components/ui";
import { Campo, Entrada, Secao, Selecao } from "@/components/form";
import { BotaoAcao, Modal } from "@/components/modal";
import { IconPlus } from "@/components/icons";
import { ConfigIA } from "./ia";
import { ListaEquipe, MatrizPermissoes } from "./equipe";
import { ConfigCaptura } from "./captura";
import type { PainelCaptura } from "@/lib/captura/painel";
import {
  criarFeriado, criarTipoTarefa, criarUsuario,
  excluirFeriado, excluirTipoTarefa, salvarConfig,
} from "@/lib/acoes";
import type { Config, Feriado, TipoTarefa, Usuario } from "@/lib/tipos";

const SECOES = [
  "Escritório",
  "Equipe e permissões",
  "Tipos de tarefa",
  "Prazos e feriados",
  "Captura e certificados",
  "Inteligência artificial",
  "Integrações",
] as const;
type SecaoNome = (typeof SECOES)[number];

const integracoes = [
  { nome: "Google Agenda", desc: "Espelha audiências e compromissos na agenda pessoal.", status: "Em breve" },
  { nome: "WhatsApp Business", desc: "Avisa o cliente quando o processo anda. Sem você digitar.", status: "Em breve" },
  { nome: "Certificado digital A1/A3", desc: "Peticionamento direto a partir da ficha do processo.", status: "Em breve" },
  { nome: "Contabilidade (Domínio / Omie)", desc: "Exporta receitas e despesas fechadas do mês.", status: "Em breve" },
];

export function PainelConfiguracoes({
  config, usuarios, tiposTarefa, feriados, captura, usuarioLogadoId,
}: {
  config: Config;
  usuarios: Usuario[];
  tiposTarefa: TipoTarefa[];
  feriados: Feriado[];
  captura: PainelCaptura;
  usuarioLogadoId: string;
}) {
  const conectoresReais = captura.conectores.filter((c) => c.ativo && c.modo === "real").length;
  const integracoesCaptura = [
    {
      nome: "DJEN — Diário de Justiça Eletrônico Nacional",
      desc: `Intimações por OAB, direto da API pública do CNJ. ${captura.oabs.filter((o) => o.ativo && o.rotulo).length} OABs monitoradas.`,
      status: captura.djen.ultimaConsulta ? "Ativo" : "Aguardando 1ª consulta",
    },
    {
      nome: "PJe — MNI 2.2.2",
      desc: `Andamentos e avisos com certificado A1. ${captura.conectores.length} conectores, ${conectoresReais} em modo real.`,
      status: conectoresReais > 0 ? "Ativo" : "Sem certificado",
    },
  ];
  const [secao, setSecao] = useState<SecaoNome>("Escritório");

  return (
    <main className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[220px_1fr] *:min-w-0">
      <nav className="min-w-0 lg:sticky lg:top-20 lg:self-start">
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
          <form action={salvarConfig}>
            <Card>
              <Secao titulo="Identificação" descricao="Aparece nos relatórios e documentos enviados ao cliente.">
                <Campo label="Razão social" obrigatorio>
                  <Entrada name="razaoSocial" defaultValue={config.razaoSocial} required />
                </Campo>
                <Campo label="CNPJ">
                  <Entrada name="cnpj" defaultValue={config.cnpj} className="font-mono" />
                </Campo>
                <Campo label="OAB da sociedade">
                  <Entrada name="oab" defaultValue={config.oab} />
                </Campo>
                <Campo label="Telefone">
                  <Entrada name="telefone" defaultValue={config.telefone} />
                </Campo>
                <Campo label="Endereço" className="sm:col-span-2">
                  <Entrada name="endereco" defaultValue={config.endereco} />
                </Campo>
              </Secao>

              <Secao titulo="Preferências" descricao="Como o sistema se comporta no dia a dia.">
                <Campo label="Fuso horário">
                  <Selecao name="fuso" defaultValue={config.fuso} opcoes={["América/Belém (UTC−3)", "América/São_Paulo (UTC−3)"]} />
                </Campo>
                <Campo label="Primeiro dia da semana">
                  <Selecao name="primeiroDia" defaultValue={config.primeiroDia} opcoes={["Segunda-feira", "Domingo"]} />
                </Campo>
                <Campo label="Resumo de intimações por e-mail" className="sm:col-span-2" dica="Um único e-mail com tudo do período — não um por intimação.">
                  <Selecao name="resumoEmail" defaultValue={config.resumoEmail} opcoes={["1x ao dia, às 8h", "2x ao dia, 8h e 17h", "Um e-mail por intimação", "Não enviar"]} />
                </Campo>
              </Secao>

              <div className="flex justify-end gap-2 px-5 py-4">
                <Button type="reset">Descartar</Button>
                <Button type="submit" variant="primary">Salvar alterações</Button>
              </div>
            </Card>
          </form>
        )}

        {secao === "Equipe e permissões" && (
          <>
            <Card>
              <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
                <div>
                  <h2 className="font-display text-[15px] font-semibold">Equipe</h2>
                  <p className="text-xs text-ink-500">{usuarios.length} usuários · {usuarios.filter((u) => u.ativo).length} ativos</p>
                </div>
                <Modal
                  titulo="Convidar para a equipe"
                  acao={criarUsuario}
                  rotuloEnviar="Convidar"
                  gatilho={<Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Convidar</Button>}
                >
                  <Campo label="Nome" obrigatorio className="sm:col-span-2">
                    <Entrada name="nome" required />
                  </Campo>
                  <Campo label="E-mail" obrigatorio>
                    <Entrada name="email" type="email" required />
                  </Campo>
                  <Campo label="OAB">
                    <Entrada name="oab" placeholder="OAB/PA 00.000" />
                  </Campo>
                  <Campo label="Perfil" obrigatorio>
                    <Selecao name="perfil" defaultValue="Advogado" opcoes={["Administrador", "Advogado", "Estagiário", "Financeiro"]} />
                  </Campo>
                  <Campo label="Grupo de trabalho">
                    <Entrada name="grupo" placeholder="Ex.: Cível" />
                  </Campo>
                </Modal>
              </div>
              <ListaEquipe usuarios={usuarios} usuarioLogadoId={usuarioLogadoId} />
            </Card>

            <Card>
              <div className="border-b border-ink-200 px-5 py-3">
                <h2 className="font-display text-[15px] font-semibold">Permissões por perfil</h2>
                <p className="text-xs text-ink-500">
                  É esta matriz que o sistema aplica: menu, telas, botões, ações e APIs. Mudou o perfil, vale na próxima página aberta.
                </p>
              </div>
              <MatrizPermissoes />
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
              <Modal
                titulo="Novo tipo de tarefa"
                acao={criarTipoTarefa}
                rotuloEnviar="Criar tipo"
                gatilho={<Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Novo tipo</Button>}
              >
                <Campo label="Nome" obrigatorio className="sm:col-span-2">
                  <Entrada name="nome" required />
                </Campo>
                <Campo label="Cor">
                  <Entrada name="cor" type="color" defaultValue="#71717a" className="h-10 p-1" />
                </Campo>
                <Campo label="Prazo padrão">
                  <Entrada name="prazoPadrao" placeholder="Ex.: 15 dias" />
                </Campo>
                <Campo label="Contagem" className="sm:col-span-2">
                  <label className="flex h-10 items-center gap-2 text-[13px]">
                    <input type="checkbox" name="diasUteis" className="h-4 w-4 accent-[#b08d3f]" />
                    Contar em dias úteis
                  </label>
                </Campo>
              </Modal>
            </div>
            {tiposTarefa.length === 0 ? (
              <p className="px-5 py-16 text-center text-sm text-ink-500">Nenhum tipo de tarefa cadastrado.</p>
            ) : (
              <ul className="divide-y divide-ink-200">
                {tiposTarefa.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <span className="h-6 w-6 shrink-0 rounded-md" style={{ background: t.cor }} />
                    <span className="min-w-[180px] flex-1 text-[13px] font-medium">{t.nome}</span>
                    <div className="min-w-[140px]">
                      <div className="text-[11px] uppercase tracking-wide text-ink-400">Prazo padrão</div>
                      <div className="text-[13px]">{t.prazoPadrao}</div>
                    </div>
                    <Badge tone={t.diasUteis ? "gold" : "neutral"}>
                      {t.diasUteis ? "Dias úteis" : "Dias corridos"}
                    </Badge>
                    <BotaoAcao
                      acao={() => excluirTipoTarefa(t.id)}
                      titulo="Excluir"
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-danger"
                    >
                      ✕
                    </BotaoAcao>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {secao === "Prazos e feriados" && (
          <>
            <form action={salvarConfig}>
              <Card>
                <Secao titulo="Contagem de prazos" descricao="Regras aplicadas quando a IA cria a tarefa a partir da intimação.">
                  <Campo label="Dias de antecedência do alerta" dica="Quantos dias antes do fatal o responsável é avisado.">
                    <Selecao name="antecedencia" defaultValue={config.antecedencia} opcoes={["3 dias", "5 dias", "7 dias", "10 dias"]} />
                  </Campo>
                  <Campo label="Margem de segurança">
                    <Selecao name="margem" defaultValue={config.margem} opcoes={["Data prevista = fatal − 2 dias", "Data prevista = fatal − 5 dias", "Sem margem"]} />
                  </Campo>
                  <Campo label="Suspensão do art. 220 do CPC" className="sm:col-span-2" dica="20/12 a 20/01 — prazos processuais suspensos.">
                    <Selecao name="art220" defaultValue={config.art220} opcoes={["Aplicar automaticamente", "Perguntar caso a caso", "Não aplicar"]} />
                  </Campo>
                </Secao>
                <div className="flex justify-end gap-2 px-5 py-4">
                  <Button type="reset">Descartar</Button>
                  <Button type="submit" variant="primary">Salvar alterações</Button>
                </div>
              </Card>
            </form>

            <Card>
              <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
                <div>
                  <h2 className="font-display text-[15px] font-semibold">Feriados</h2>
                  <p className="text-xs text-ink-500">
                    Nacionais carregados automaticamente. Adicione os locais e os do tribunal.
                  </p>
                </div>
                <Modal
                  titulo="Adicionar feriado"
                  acao={criarFeriado}
                  rotuloEnviar="Adicionar"
                  gatilho={<Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Adicionar</Button>}
                >
                  <Campo label="Data" obrigatorio>
                    <Entrada name="data" placeholder="dd/mm/aaaa" required />
                  </Campo>
                  <Campo label="Tipo">
                    <Selecao name="tipo" opcoes={["Nacional", "Estadual", "Tribunal"]} />
                  </Campo>
                  <Campo label="Nome" obrigatorio className="sm:col-span-2">
                    <Entrada name="nome" required />
                  </Campo>
                </Modal>
              </div>
              {feriados.length === 0 ? (
                <p className="px-5 py-16 text-center text-sm text-ink-500">Nenhum feriado cadastrado.</p>
              ) : (
                <ul className="divide-y divide-ink-200">
                  {feriados.map((f) => (
                    <li key={f.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="w-24 text-[13px] tabular-nums">{f.data}</span>
                      <span className="flex-1 text-[13px]">{f.nome}</span>
                      <Badge tone={(f.tipo === "Tribunal" ? "gold" : "neutral") as Tone}>{f.tipo}</Badge>
                      <BotaoAcao
                        acao={() => excluirFeriado(f.id)}
                        titulo="Excluir"
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-danger"
                      >
                        ✕
                      </BotaoAcao>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}

        {secao === "Captura e certificados" && (
          <ConfigCaptura captura={captura} usuarios={usuarios.filter((u) => u.ativo).map((u) => ({ id: u.id, nome: u.nome }))} />
        )}

        {secao === "Inteligência artificial" && <ConfigIA modeloAtual={config.modeloIA} />}

        {secao === "Integrações" && (
          <Card>
            <div className="border-b border-ink-200 px-5 py-3">
              <h2 className="font-display text-[15px] font-semibold">Integrações</h2>
              <p className="text-xs text-ink-500">Tudo incluso no plano — sem módulo cobrado à parte.</p>
            </div>
            <ul className="divide-y divide-ink-200">
              {[...integracoesCaptura, ...integracoes].map((i) => (
                <li key={i.nome} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ink-200 font-display text-[13px] font-semibold text-ink-700">
                    {i.nome[0]}
                  </span>
                  <div className="min-w-[240px] flex-1">
                    <p className="text-[13px] font-medium">{i.nome}</p>
                    <p className="text-xs text-ink-500">{i.desc}</p>
                  </div>
                  <Badge tone={i.status === "Em breve" ? "neutral" : i.status === "Ativo" || i.status === "Conectado" ? "ok" : "warn"}>{i.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </main>
  );
}
