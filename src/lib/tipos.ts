export type Id = string;

export type SituacaoAtividade = "Pendente" | "Em execução" | "Revisão" | "Concluída" | "A confirmar" | "Cancelada";
export const SITUACOES_ATIVIDADE: SituacaoAtividade[] = ["Pendente", "Em execução", "Revisão", "Concluída", "A confirmar", "Cancelada"];

export const FASES_PADRAO = ["Distribuição", "Citação", "Contestação", "Saneamento", "Instrução", "Sentença", "Recursal", "Execução"];

export type Processo = {
  id: Id;
  pasta: string;
  numero: string;
  titulo: string;
  clienteId: Id;
  papel: "Autor" | "Réu" | "Terceiro interessado" | "Assistente";
  contraria: string;
  tribunal: string;
  orgao: string;
  comarca: string;
  instancia: string;
  classe: string;
  assunto: string;
  juiz: string;
  distribuido: string;
  valorCausa: number;
  provisao: number;
  exito: number;
  fase: string;
  /** Etapas definidas pelo usuário; ausente = FASES_PADRAO. */
  fases?: string[];
  /** Último resumo gerado pela IA na ficha. */
  resumoIA?: { texto: string; geradoEm: string };
  situacao: "Ativo" | "Suspenso" | "Arquivado" | "Baixado";
  responsaveis: string[];
  grupo: string;
  marcadores: string[];
  monitorado: boolean;
  observacoes: string;
  criadoEm: string;
};

export type Pessoa = {
  id: Id;
  nome: string;
  tipo: "Física" | "Jurídica";
  doc: string;
  email: string;
  telefone: string;
  cidade: string;
  cliente: boolean;
  criadoEm: string;
};

export type Atividade = {
  id: Id;
  identificador: string;
  tipo: string;
  descricao: string;
  processoId: Id | null;
  prevista: string;
  fatal: string;
  responsavel: string;
  situacao: SituacaoAtividade;
  criadoEm: string;
};

export type Andamento = {
  id: Id;
  data: string;
  orgao: string;
  tipo: string;
  processoId: Id | null;
  descricao: string;
  lido: boolean;
  /** manual, djen ou mni */
  origem?: string;
};

export type Intimacao = {
  id: Id;
  disponibilizacao: string;
  publicacao: string;
  numero: string;
  processoId: Id | null;
  descricao: string;
  situacao: "Pendente" | "Processada" | "Arquivada";
  teor: string;
  /** manual, djen ou mni */
  origem?: string;
  chaveOrigem?: string | null;
  link?: string | null;
  canceladaEm?: Date | null;
};

export type Captura = {
  id: Id;
  data: string;
  numero: string;
  orgao: string;
  instancia: string;
  status: "Habilitada" | "Em andamento" | "Pendente" | "Erro";
};

export type Contrato = {
  id: Id;
  titulo: string;
  clienteId: Id;
  modalidade: string;
  valor: number;
  inicio: string;
  proxima: string;
  situacao: "Habilitado" | "Desabilitado";
};

export type Cobranca = {
  id: Id;
  descricao: string;
  clienteId: Id;
  vencimento: string;
  valor: number;
  situacao: "Em aberto" | "Pago" | "Vencido";
};

export type ContaPagar = {
  id: Id;
  fornecedor: string;
  categoria: string;
  vencimento: string;
  valor: number;
  situacao: "Em aberto" | "Pago";
};

export type Lancamento = {
  id: Id;
  data: string;
  minutos: number;
  faturavel: boolean;
  responsavel: string;
  processoId: Id | null;
  descricao: string;
};

export type Documento = {
  id: Id;
  nome: string;
  tipo: string;
  processoId: Id | null;
  tamanho: string;
  data: string;
  autor: string;
};

export type Usuario = {
  id: Id;
  nome: string;
  email: string;
  oab: string;
  perfil: "Administrador" | "Advogado" | "Estagiário" | "Financeiro";
  grupos: string[];
  ativo: boolean;
  /** Preenchidos na leitura do banco; o hash da senha nunca chega aqui. */
  temSenha?: boolean;
  ultimoAcesso?: Date | null;
};

export type TipoTarefa = {
  id: Id;
  nome: string;
  cor: string;
  prazoPadrao: string;
  diasUteis: boolean;
};

export type Feriado = { id: Id; data: string; nome: string; tipo: string };

export type Atendimento = {
  id: Id;
  data: string;
  clienteId: Id;
  tipo: "Reunião" | "Ligação" | "Videochamada" | "Presencial";
  assunto: string;
  responsavel: string;
  processoId: Id | null;
};

export type Config = {
  razaoSocial: string;
  cnpj: string;
  oab: string;
  telefone: string;
  endereco: string;
  fuso: string;
  primeiroDia: string;
  resumoEmail: string;
  antecedencia: string;
  margem: string;
  art220: string;
  modeloIA: string;
};

export type Banco = {
  processos: Processo[];
  pessoas: Pessoa[];
  atividades: Atividade[];
  andamentos: Andamento[];
  intimacoes: Intimacao[];
  capturas: Captura[];
  contratos: Contrato[];
  cobrancas: Cobranca[];
  contasPagar: ContaPagar[];
  lancamentos: Lancamento[];
  documentos: Documento[];
  usuarios: Usuario[];
  tiposTarefa: TipoTarefa[];
  feriados: Feriado[];
  atendimentos: Atendimento[];
  config: Config;
};
