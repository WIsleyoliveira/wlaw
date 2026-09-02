export type NavItem = { label: string; href: string; icon: string };
export type NavGroup = { section: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    section: "Rotina",
    items: [
      { label: "Painel de controle", href: "/", icon: "calendar" },
      { label: "Atividades", href: "/atividades", icon: "tasks" },
    ],
  },
  {
    section: "Contencioso",
    items: [
      { label: "Processos", href: "/processos", icon: "gavel" },
      { label: "Intimações", href: "/intimacoes", icon: "mail" },
      { label: "Monitoramento", href: "/monitoramento", icon: "refresh" },
      { label: "Andamentos", href: "/andamentos", icon: "clock" },
    ],
  },
  {
    section: "Gestão",
    items: [
      { label: "Pessoas", href: "/pessoas", icon: "handshake" },
      { label: "Atendimentos", href: "/atendimentos", icon: "spark" },
      { label: "Honorários", href: "/honorarios", icon: "chart" },
      { label: "Timesheet", href: "/timesheet", icon: "gauge" },
      { label: "Financeiro", href: "/financeiro", icon: "chart" },
    ],
  },
  {
    section: "Inteligência",
    items: [
      { label: "Indicadores", href: "/indicadores", icon: "report" },
      { label: "Relatórios", href: "/relatorios", icon: "report" },
      { label: "Documentos", href: "/documentos", icon: "folder" },
    ],
  },
];
