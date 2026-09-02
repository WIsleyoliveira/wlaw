export const processo = {
  pasta: "PRO.0000171",
  numero: "0803371-35.2024.8.14.0097",
  titulo: "Ação de cobrança c/c indenização por danos materiais",
  cliente: "F. M. Rodrigues - ME",
  papel: "Autor",
  contraria: "Almir Fernandes da Paixão",
  orgao: "TJ-PA — 2ª Vara Cível e Empresarial de Ananindeua",
  comarca: "Ananindeua - PA",
  instancia: "1ª",
  classe: "Procedimento Comum Cível",
  assunto: "Prestação de serviços / Inadimplemento",
  juiz: "Dra. Marina Vasconcelos Braga",
  distribuido: "12/03/2024",
  segredo: false,
  gratuidade: false,
  valorCausa: 87_400,
  provisao: 61_000,
  exito: 72,
  fase: "Instrução",
  situacao: "Ativo",
  ultimoAndamento: "31/08/2026",
  diasSemMovimento: 2,
  responsaveis: ["Alanna Correa", "Wisley Oliveira"],
  marcadores: ["Prioritário", "Cliente carteira A"],
};

export const fases = [
  { nome: "Distribuição", data: "12/03/2024", concluida: true },
  { nome: "Citação", data: "28/04/2024", concluida: true },
  { nome: "Contestação", data: "17/06/2024", concluida: true },
  { nome: "Saneamento", data: "09/11/2025", concluida: true },
  { nome: "Instrução", data: "em curso", concluida: false },
  { nome: "Sentença", data: "—", concluida: false },
  { nome: "Recursal", data: "—", concluida: false },
  { nome: "Execução", data: "—", concluida: false },
];

export const partes = [
  { nome: "F. M. Rodrigues - ME", tipo: "Autor", doc: "12.345.678/0001-90", advogado: "Alanna Correa Halliday e Silva — OAB/PA 28.114", cliente: true },
  { nome: "Almir Fernandes da Paixão", tipo: "Réu", doc: "324.556.789-01", advogado: "Ricardo Menezes Lobo — OAB/PA 15.902", cliente: false },
  { nome: "Seguradora Norte S.A.", tipo: "Denunciada à lide", doc: "44.221.900/0001-05", advogado: "Bandeira & Associados — OAB/PA 9.331", cliente: false },
];

export const pedidos = [
  { descricao: "Cobrança de faturas 04/2023 a 09/2023", pedido: 62_400, deferido: 62_400, provisao: 48_000, status: "Deferido" },
  { descricao: "Danos materiais — reposição de equipamento", pedido: 18_000, deferido: 13_000, provisao: 13_000, status: "Parcial" },
  { descricao: "Danos morais", pedido: 7_000, deferido: 0, provisao: 0, status: "Indeferido" },
];

export const timeline = [
  { data: "31/08/2026", hora: "07:42", tipo: "Movimentação", titulo: "Expedição de outros documentos", origem: "TJ-PA", lido: true, anexo: "Ato Ordinatório.pdf" },
  { data: "24/08/2026", hora: "11:05", tipo: "Prazo", titulo: "Prazo para especificação de provas — 15 dias", origem: "Wlaw", lido: true, anexo: null },
  { data: "18/08/2026", hora: "16:30", tipo: "Decisão", titulo: "Saneado o feito. Designada audiência de instrução para 03/09/2026 às 16h", origem: "TJ-PA", lido: true, anexo: "Decisão.pdf" },
  { data: "02/08/2026", hora: "09:14", tipo: "Petição", titulo: "Manifestação sobre a contestação protocolada", origem: "Wlaw", lido: true, anexo: "Manifestação.pdf" },
  { data: "17/06/2026", hora: "13:50", tipo: "Movimentação", titulo: "Juntada de contestação com denunciação da lide", origem: "TJ-PA", lido: true, anexo: "Contestação.pdf" },
];

export const documentos = [
  { nome: "Decisão de saneamento.pdf", tipo: "Decisão", tamanho: "312 KB", data: "18/08/2026", autor: "Captura automática" },
  { nome: "Manifestação sobre contestação.docx", tipo: "Petição", tamanho: "84 KB", data: "02/08/2026", autor: "Alanna Correa" },
  { nome: "Contrato de prestação de serviços.pdf", tipo: "Prova", tamanho: "1,2 MB", data: "12/03/2024", autor: "Wisley Oliveira" },
  { nome: "Notas fiscais 04-09/2023.pdf", tipo: "Prova", tamanho: "2,8 MB", data: "12/03/2024", autor: "Wisley Oliveira" },
  { nome: "Procuração.pdf", tipo: "Procuração", tamanho: "96 KB", data: "10/03/2024", autor: "Wisley Oliveira" },
];

export const prazosProcesso = [
  { tarefa: "Audiência de instrução", previsto: "03/09/2026 16:00", fatal: "03/09/2026", responsavel: "Alanna Correa", situacao: "Pendente" },
  { tarefa: "Rol de testemunhas", previsto: "28/08/2026", fatal: "29/08/2026", responsavel: "Wisley Oliveira", situacao: "Concluída" },
  { tarefa: "Memoriais finais", previsto: "18/09/2026", fatal: "23/09/2026", responsavel: "Alanna Correa", situacao: "A confirmar" },
];

export const financeiroProcesso = {
  contratado: 26_220,
  faturado: 14_500,
  recebido: 10_000,
  despesas: 1_840,
  horas: 42.5,
  custoHoras: 16_150,
};
