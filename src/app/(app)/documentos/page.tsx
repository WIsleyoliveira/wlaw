import { exigirPagina } from "@/lib/auth/sessao";
import { pode } from "@/lib/permissoes";
import { Topbar } from "@/components/topbar";
import { Badge, Button, Card, CardHeader, Tone } from "@/components/ui";
import { BarraFiltros } from "@/components/filtros";
import { BotaoAcao, Modal } from "@/components/modal";
import { Campo, Entrada, Selecao } from "@/components/form";
import { IconPlus, IconSpark } from "@/components/icons";
import { ler } from "@/lib/db";
import { criarDocumento, excluirDocumento } from "@/lib/acoes";
import { contem } from "@/lib/util";

const modelos = [
  { nome: "Contrarrazões de apelação", area: "Cível" },
  { nome: "Petição inicial — cobrança", area: "Cível" },
  { nome: "Contrato de honorários — êxito", area: "Contratos" },
  { nome: "Embargos de declaração", area: "Cível" },
];

const tone: Record<string, Tone> = {
  Decisão: "gold",
  Petição: "neutral",
  Contrato: "ok",
  Prova: "neutral",
  Procuração: "neutral",
};

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const eu = await exigirPagina("documentos");
  const podeEditar = pode(eu.perfil, "documentos", "editar");
  const podeExcluir = pode(eu.perfil, "documentos", "excluir");
  const b = await ler();
  const chip = sp.situacao ?? "Todos";
  const processoRotulo = (id: string | null) => {
    const p = id ? b.processos.find((x) => x.id === id) : null;
    return p ? `${p.pasta} — ${p.numero}` : null;
  };
  const clienteDoProcesso = (id: string | null) => {
    const p = id ? b.processos.find((x) => x.id === id) : null;
    return p ? b.pessoas.find((x) => x.id === p.clienteId)?.nome : null;
  };

  const lista = b.documentos.filter((d) => {
    if (!contem([d.nome, processoRotulo(d.processoId), clienteDoProcesso(d.processoId), d.autor], sp.q ?? "")) return false;
    if (chip !== "Todos" && d.tipo !== chip) return false;
    return true;
  });

  return (
    <>
      <Topbar title="Documentos" />
      <main className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[1fr_320px] *:min-w-0">
        <Card>
          <BarraFiltros
            placeholder="Pesquise por nome, tipo, processo ou cliente"
            chips={["Todos", "Petição", "Decisão", "Prova", "Contrato", "Procuração"]}
            novo={
              <Modal permitido={podeEditar}
                titulo="Enviar documento"
                acao={criarDocumento}
                rotuloEnviar="Registrar"
                gatilho={<Button variant="primary"><IconPlus className="h-4 w-4" /> Enviar documento</Button>}
              >
                <Campo label="Nome do arquivo" obrigatorio className="sm:col-span-2">
                  <Entrada name="nome" placeholder="Ex.: Petição inicial.pdf" required />
                </Campo>
                <Campo label="Tipo">
                  <Selecao name="tipo" opcoes={["Petição", "Decisão", "Prova", "Contrato", "Procuração"]} />
                </Campo>
                <Campo label="Tamanho">
                  <Entrada name="tamanho" placeholder="Ex.: 240 KB" />
                </Campo>
                <Campo label="Processo vinculado" className="sm:col-span-2">
                  <select name="processoId" className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400">
                    <option value="">Sem vínculo</option>
                    {b.processos.map((p) => <option key={p.id} value={p.id}>{p.pasta} — {p.numero}</option>)}
                  </select>
                </Campo>
                <Campo label="Autor" className="sm:col-span-2">
                  <Selecao name="autor" opcoes={b.usuarios.filter((u) => u.ativo).map((u) => u.nome)} />
                </Campo>
              </Modal>
            }
          />
          {lista.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-ink-500">Nenhum documento encontrado.</p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {lista.map((d) => (
                <li key={d.id} className="relative px-5 py-3.5 transition-colors hover:bg-ink-50">
                  <div className="grid gap-4 md:grid-cols-[40px_1.6fr_1fr_120px_50px] md:items-center *:min-w-0">
                    <span className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-[10px] font-semibold text-ink-500">
                      {d.nome.split(".").pop()?.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-ink-400">Documento</div>
                      <div className="truncate text-[13px] font-medium">{d.nome}</div>
                      <div className="truncate text-xs text-ink-500">{d.data} · {d.tamanho} · {d.autor}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-ink-400">Vínculo</div>
                      <span className="font-mono text-[12px]">{processoRotulo(d.processoId) ?? "—"}</span>
                      <div className="truncate text-xs text-ink-500">{clienteDoProcesso(d.processoId) ?? ""}</div>
                    </div>
                    <div className="md:justify-self-end">
                      <Badge tone={tone[d.tipo]}>{d.tipo}</Badge>
                    </div>
                    <div className="flex justify-end">
                      <BotaoAcao permitido={podeExcluir}
                        acao={async () => {
                          "use server";
                          await excluirDocumento(d.id);
                        }}
                        titulo="Excluir"
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-danger"
                      >
                        ✕
                      </BotaoAcao>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3 text-xs text-ink-500">
            <span><strong className="text-ink-900">{lista.length}</strong> de {b.documentos.length} documentos</span>
          </div>
        </Card>

        <div className="space-y-4">
          <section className="rounded-card border border-ink-950 bg-ink-950 p-5 text-white">
            <div className="flex items-center gap-1.5">
              <IconSpark className="h-4 w-4 text-gold-400" />
              <p className="text-[11px] uppercase tracking-[0.12em] text-gold-400">Redação assistida</p>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-white/85">
              Escolha um modelo e o processo. A peça sai registrada na lista de documentos, pronta
              para você revisar e substituir pelo arquivo final.
            </p>
            <Modal permitido={podeEditar}
              titulo="Gerar peça a partir de modelo"
              acao={criarDocumento}
              rotuloEnviar="Gerar peça"
              gatilho={
                <button className="mt-4 h-9 w-full rounded-lg bg-gold-400 text-sm font-semibold text-ink-950 hover:bg-gold-200">
                  Gerar peça a partir de modelo
                </button>
              }
            >
              <Campo label="Modelo" obrigatorio className="sm:col-span-2">
                <Selecao name="nome" opcoes={modelos.map((m) => m.nome)} />
              </Campo>
              <Campo label="Processo" obrigatorio className="sm:col-span-2">
                <select name="processoId" required className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400">
                  {b.processos.map((p) => <option key={p.id} value={p.id}>{p.pasta} — {p.numero}</option>)}
                </select>
              </Campo>
              <Campo label="Autor" className="sm:col-span-2">
                <Selecao name="autor" opcoes={b.usuarios.filter((u) => u.ativo).map((u) => u.nome)} />
              </Campo>
              <input type="hidden" name="tipo" value="Petição" />
            </Modal>
          </section>

          <Card>
            <CardHeader title="Modelos" hint="Inclusos no plano" />
            <ul className="divide-y divide-ink-200 border-t border-ink-200">
              {modelos.map((m) => (
                <li key={m.nome} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{m.nome}</p>
                    <p className="text-xs text-ink-500">{m.area}</p>
                  </div>
                  <Modal permitido={podeEditar}
                    titulo={`Usar modelo: ${m.nome}`}
                    acao={criarDocumento}
                    rotuloEnviar="Gerar peça"
                    gatilho={<Button size="sm">Usar</Button>}
                  >
                    <Campo label="Processo" obrigatorio className="sm:col-span-2">
                      <select name="processoId" required className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400">
                        {b.processos.map((p) => <option key={p.id} value={p.id}>{p.pasta} — {p.numero}</option>)}
                      </select>
                    </Campo>
                    <Campo label="Autor" className="sm:col-span-2">
                      <Selecao name="autor" opcoes={b.usuarios.filter((u) => u.ativo).map((u) => u.nome)} />
                    </Campo>
                    <input type="hidden" name="nome" value={m.nome} />
                    <input type="hidden" name="tipo" value="Petição" />
                  </Modal>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </main>
    </>
  );
}
