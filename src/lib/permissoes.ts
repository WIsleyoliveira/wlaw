import type { Usuario } from "./tipos";

export type Perfil = Usuario["perfil"];
export type Acao = "ver" | "editar" | "excluir";

const ADM: Perfil = "Administrador";
const ADV: Perfil = "Advogado";
const EST: Perfil = "Estagiário";
const FIN: Perfil = "Financeiro";

export const PERFIS: Perfil[] = [ADM, ADV, EST, FIN];

/** Fonte única: menu, páginas, Server Actions, APIs e a tabela em Configurações leem daqui. */
export const PERMISSOES = {
  painel: { rotulo: "Painel de controle", ver: [ADM, ADV, EST, FIN], editar: [], excluir: [] },
  processos: { rotulo: "Processos", ver: [ADM, ADV, EST], editar: [ADM, ADV], excluir: [ADM] },
  atividades: { rotulo: "Atividades e prazos", ver: [ADM, ADV, EST], editar: [ADM, ADV, EST], excluir: [ADM, ADV] },
  intimacoes: { rotulo: "Intimações", ver: [ADM, ADV, EST], editar: [ADM, ADV], excluir: [ADM] },
  andamentos: { rotulo: "Andamentos", ver: [ADM, ADV, EST], editar: [ADM, ADV, EST], excluir: [] },
  monitoramento: { rotulo: "Monitoramento e captura", ver: [ADM, ADV], editar: [ADM], excluir: [ADM] },
  pessoas: { rotulo: "Pessoas", ver: [ADM, ADV, EST, FIN], editar: [ADM, ADV, FIN], excluir: [ADM] },
  atendimentos: { rotulo: "Atendimentos", ver: [ADM, ADV, EST], editar: [ADM, ADV, EST], excluir: [ADM, ADV] },
  documentos: { rotulo: "Documentos", ver: [ADM, ADV, EST], editar: [ADM, ADV], excluir: [ADM] },
  timesheet: { rotulo: "Timesheet (próprias horas)", ver: [ADM, ADV, EST], editar: [ADM, ADV, EST], excluir: [ADM, ADV, EST] },
  equipeTimesheet: { rotulo: "Timesheet da equipe", ver: [ADM], editar: [ADM], excluir: [ADM] },
  honorarios: { rotulo: "Honorários", ver: [ADM, FIN], editar: [ADM, FIN], excluir: [ADM] },
  financeiro: { rotulo: "Financeiro", ver: [ADM, FIN], editar: [ADM, FIN], excluir: [ADM] },
  indicadores: { rotulo: "Indicadores do escritório", ver: [ADM], editar: [], excluir: [] },
  relatorios: { rotulo: "Relatórios", ver: [ADM, ADV, EST, FIN], editar: [], excluir: [] },
  ia: { rotulo: "Wlaw IA", ver: [ADM, ADV, EST], editar: [ADM, ADV, EST], excluir: [] },
  configuracoes: { rotulo: "Configurações, equipe e certificados", ver: [ADM], editar: [ADM], excluir: [ADM] },
} satisfies Record<string, { rotulo: string } & Record<Acao, Perfil[]>>;

export type Recurso = keyof typeof PERMISSOES;

export function pode(perfil: Perfil | null | undefined, recurso: Recurso, acao: Acao = "ver") {
  return !!perfil && (PERMISSOES[recurso][acao] as Perfil[]).includes(perfil);
}

const ROTAS: [prefixo: string, recurso: Recurso][] = [
  ["/processos", "processos"],
  ["/atividades", "atividades"],
  ["/intimacoes", "intimacoes"],
  ["/andamentos", "andamentos"],
  ["/monitoramento", "monitoramento"],
  ["/pessoas", "pessoas"],
  ["/atendimentos", "atendimentos"],
  ["/documentos", "documentos"],
  ["/timesheet", "timesheet"],
  ["/honorarios", "honorarios"],
  ["/financeiro", "financeiro"],
  ["/indicadores", "indicadores"],
  ["/relatorios", "relatorios"],
  ["/configuracoes", "configuracoes"],
];

export function recursoDaRota(pathname: string): Recurso {
  if (pathname === "/") return "painel";
  return ROTAS.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1] ?? "painel";
}
