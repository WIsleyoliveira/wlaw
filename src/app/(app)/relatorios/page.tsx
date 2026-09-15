import { exigirPagina } from "@/lib/auth/sessao";
import { pode, recursoDaRota } from "@/lib/permissoes";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui";
import { CatalogoRelatorios, type GrupoRelatorios } from "./catalogo";

const catalogoRelatorios: GrupoRelatorios[] = [
  {
    grupo: "Gestão",
    itens: [
      { nome: "Atendimentos por cliente", desc: "Volume de atendimentos registrados.", href: "/atendimentos" },
      { nome: "Pessoas — completo", desc: "Cadastro consolidado de clientes e envolvidos.", href: "/pessoas" },
    ],
  },
  {
    grupo: "Atividades",
    itens: [
      { nome: "Timesheet", desc: "Horas lançadas por responsável, cliente e faturamento.", href: "/timesheet" },
      { nome: "Tarefas", desc: "Prazos previstos, fatais e situação de conclusão.", href: "/atividades" },
      { nome: "Audiências", desc: "Pauta por período, comarca e responsável.", href: "/atividades?situacao=Todos&q=Audi%C3%AAncia" },
    ],
  },
  {
    grupo: "Processos",
    itens: [
      { nome: "Processos — completo", desc: "Base inteira com partes, assunto e fase.", href: "/processos" },
      { nome: "Andamentos em planilha", desc: "Movimentações capturadas prontas para análise.", href: "/andamentos" },
      { nome: "Processos monitorados", desc: "Carteira sob monitoramento ativo.", href: "/monitoramento" },
    ],
  },
  {
    grupo: "Financeiro",
    itens: [
      { nome: "Financeiro — completo", desc: "Receitas, despesas e resultado por período.", href: "/financeiro" },
      { nome: "Honorários por cliente", desc: "Contratado x faturado x recebido.", href: "/honorarios" },
    ],
  },
];

export default async function RelatoriosPage() {
  const eu = await exigirPagina("relatorios");
  // Cada relatório só aparece para quem pode abrir a tela de destino.
  const grupos = catalogoRelatorios
    .map((g) => ({ ...g, itens: g.itens.filter((it) => pode(eu.perfil, recursoDaRota(it.href.split("?")[0]))) }))
    .filter((g) => g.itens.length > 0);
  return (
    <>
      <Topbar title="Relatórios" />
      <main className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[1fr_360px] *:min-w-0">
        <div className="min-w-0 space-y-4">
          <Card>
            <CatalogoRelatorios grupos={grupos} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="p-5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-gold-500">Como funciona</p>
              <p className="mt-2 text-[13px] leading-snug text-ink-700">
                Cada relatório abre a listagem correspondente, já com os filtros e a busca prontos
                para você refinar. Exportação em XLSX/PDF e envio agendado por e-mail ainda não
                estão disponíveis.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
