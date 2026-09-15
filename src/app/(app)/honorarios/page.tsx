import { exigirPagina } from "@/lib/auth/sessao";
import { Topbar } from "@/components/topbar";
import { Badge, Button, Card, Tone } from "@/components/ui";
import { BarraFiltros } from "@/components/filtros";
import { BotaoAcao, Modal } from "@/components/modal";
import { Campo, Entrada, Selecao } from "@/components/form";
import { IconPlus } from "@/components/icons";
import { ler } from "@/lib/db";
import { alternarContrato, criarCobranca, criarContrato, quitarCobranca } from "@/lib/acoes";
import { brl, contem } from "@/lib/util";

export default async function HonorariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  await exigirPagina("honorarios");
  const b = await ler();
  const chip = sp.situacao ?? "Todos";
  const clientes = b.pessoas.filter((p) => p.cliente);
  const nome = (id: string) => b.pessoas.find((p) => p.id === id)?.nome ?? "—";

  const lista = b.contratos.filter((c) => {
    if (!contem([c.titulo, c.modalidade, nome(c.clienteId)], sp.q ?? "")) return false;
    if (chip === "Habilitados") return c.situacao === "Habilitado";
    if (chip === "Desabilitados") return c.situacao === "Desabilitado";
    return true;
  });

  const aberto = b.cobrancas.filter((c) => c.situacao === "Em aberto").reduce((s, c) => s + c.valor, 0);
  const recebido = b.cobrancas.filter((c) => c.situacao === "Pago").reduce((s, c) => s + c.valor, 0);
  const vencido = b.cobrancas.filter((c) => c.situacao === "Vencido").reduce((s, c) => s + c.valor, 0);

  const tiles: { label: string; valor: number; tone: Tone; nota: string }[] = [
    { label: "Recebido", valor: recebido, tone: "ok", nota: `${b.cobrancas.filter((c) => c.situacao === "Pago").length} cobranças quitadas` },
    { label: "Em aberto", valor: aberto, tone: "gold", nota: `${b.cobrancas.filter((c) => c.situacao === "Em aberto").length} a vencer` },
    { label: "Vencido", valor: vencido, tone: "danger", nota: `${b.cobrancas.filter((c) => c.situacao === "Vencido").length} em atraso` },
  ];

  const selecaoCliente = () => (
    <select name="clienteId" required className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400">
      {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
    </select>
  );

  return (
    <>
      <Topbar title="Honorários" />
      <main className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-3 *:min-w-0">
          {tiles.map((t) => (
            <Card key={t.label} className="px-5 py-4">
              <p className="text-[13px] font-medium text-ink-700">{t.label}</p>
              <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{brl(t.valor)}</p>
              <div className="mt-2.5"><Badge tone={t.tone}>{t.nota}</Badge></div>
            </Card>
          ))}
        </div>

        <Card>
          <BarraFiltros
            placeholder="Pesquise pelo título, cliente ou modalidade"
            chips={["Todos", "Habilitados", "Desabilitados"]}
            novo={
              <Modal
                titulo="Novo contrato de honorários"
                acao={criarContrato}
                rotuloEnviar="Criar contrato"
                gatilho={<Button variant="primary"><IconPlus className="h-4 w-4" /> Novo contrato</Button>}
              >
                <Campo label="Título" obrigatorio className="sm:col-span-2">
                  <Entrada name="titulo" placeholder="Ex.: Consultivo mensal — Cliente X" required />
                </Campo>
                <Campo label="Cliente" obrigatorio>{selecaoCliente()}</Campo>
                <Campo label="Modalidade" obrigatorio>
                  <Selecao name="modalidade" opcoes={["Fixo mensal", "Êxito", "Por ato", "Hora técnica"]} />
                </Campo>
                <Campo label="Valor" dica="Em êxito, informe o percentual (ex.: 20).">
                  <Entrada name="valor" placeholder="0,00" inputMode="decimal" />
                </Campo>
                <Campo label="Início">
                  <Entrada name="inicio" placeholder="dd/mm/aaaa" />
                </Campo>
                <Campo label="Próxima cobrança" className="sm:col-span-2">
                  <Entrada name="proxima" placeholder="dd/mm/aaaa" />
                </Campo>
              </Modal>
            }
          />

          {lista.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-ink-500">Nenhum contrato encontrado.</p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {lista.map((c) => (
                <li key={c.id} className="relative px-5 py-3.5 transition-colors hover:bg-ink-50">
                  <span className={`absolute inset-y-0 left-0 w-[3px] ${c.situacao === "Habilitado" ? "bg-gold-400" : "bg-ink-200"}`} />
                  <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_150px_140px_120px_100px] md:items-center *:min-w-0">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-ink-400">Contrato</div>
                      <div className="truncate text-[13px] font-medium">{c.titulo}</div>
                      <div className="truncate text-xs text-ink-500">{nome(c.clienteId)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-ink-400">Modalidade</div>
                      <div className="text-[13px]">{c.modalidade}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-ink-400">Valor</div>
                      <div className="text-[13px] tabular-nums">
                        {c.modalidade === "Êxito" ? `${c.valor <= 1 ? c.valor * 100 : c.valor}%` : brl(c.valor)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-ink-400">Próxima cobrança</div>
                      <div className="text-[13px]">{c.proxima}</div>
                    </div>
                    <div className="md:justify-self-end">
                      <Badge tone={c.situacao === "Habilitado" ? "ok" : "neutral"}>{c.situacao}</Badge>
                    </div>
                    <div className="flex justify-end">
                      <BotaoAcao
                        acao={async () => {
                          "use server";
                          await alternarContrato(c.id);
                        }}
                        className="h-8 rounded-lg border border-ink-200 px-2.5 text-[12px] font-medium text-ink-700 hover:border-gold-400"
                      >
                        {c.situacao === "Habilitado" ? "Desativar" : "Ativar"}
                      </BotaoAcao>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
            <h2 className="font-display text-[15px] font-semibold">Cobranças</h2>
            <Modal
              titulo="Nova cobrança"
              acao={criarCobranca}
              rotuloEnviar="Lançar cobrança"
              gatilho={<Button size="sm" variant="primary"><IconPlus className="h-4 w-4" /> Nova cobrança</Button>}
            >
              <Campo label="Descrição" obrigatorio className="sm:col-span-2">
                <Entrada name="descricao" placeholder="Ex.: Mensalidade out/2026" required />
              </Campo>
              <Campo label="Cliente" obrigatorio>{selecaoCliente()}</Campo>
              <Campo label="Vencimento" obrigatorio>
                <Entrada name="vencimento" placeholder="dd/mm/aaaa" required />
              </Campo>
              <Campo label="Valor" obrigatorio className="sm:col-span-2">
                <Entrada name="valor" placeholder="0,00" inputMode="decimal" required />
              </Campo>
            </Modal>
          </div>
          <ul className="divide-y divide-ink-200">
            {b.cobrancas.map((c) => (
              <li key={c.id} className="relative flex flex-wrap items-center gap-4 px-5 py-3.5 hover:bg-ink-50">
                <span className={`absolute inset-y-0 left-0 w-[3px] ${c.situacao === "Vencido" ? "bg-danger" : c.situacao === "Pago" ? "bg-ok" : "bg-gold-400"}`} />
                <div className="min-w-[200px] flex-1">
                  <p className="text-[13px] font-medium">{c.descricao}</p>
                  <p className="text-xs text-ink-500">{nome(c.clienteId)} · vence {c.vencimento}</p>
                </div>
                <span className="text-[13px] font-medium tabular-nums">{brl(c.valor)}</span>
                <Badge tone={c.situacao === "Pago" ? "ok" : c.situacao === "Vencido" ? "danger" : "gold"}>{c.situacao}</Badge>
                <BotaoAcao
                  acao={async () => {
                    "use server";
                    await quitarCobranca(c.id);
                  }}
                  className="h-8 rounded-lg border border-ink-200 px-2.5 text-[12px] font-medium text-ink-700 hover:border-gold-400"
                >
                  {c.situacao === "Pago" ? "Estornar" : "Dar baixa"}
                </BotaoAcao>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </>
  );
}
