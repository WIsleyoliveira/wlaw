export const kpis = [
  { label: "Prazos", total: 12, breakdown: [["3 fatais hoje", "danger"], ["9 na semana", "neutral"]] },
  { label: "Intimações", total: 7, breakdown: [["7 pendentes", "warn"], ["0 descartadas", "neutral"]] },
  { label: "Andamentos", total: 24, breakdown: [["18 não lidos", "warn"], ["6 lidos", "neutral"]] },
  { label: "Audiências", total: 9, breakdown: [["3 atrasadas", "danger"], ["6 futuras", "neutral"]] },
  { label: "Compromissos", total: 2, breakdown: [["2 atrasados", "danger"], ["0 futuros", "neutral"]] },
] as const;

export const atividades = [
  { id: "TAR.0000218", tipo: "Audiência", processo: "0803371-35.2024.8.14.0097", cliente: "F. M. Rodrigues - ME", parte: "Almir Fernandes da Paixão", prevista: "03/09/2026 16:00", fatal: "03/09/2026", situacao: "Pendente", tone: "warn" },
  { id: "TAR.0000231", tipo: "Audiência", processo: "0000042-36.2000.8.14.0082", cliente: "Espólio de Ana Francisca de Nazaré", parte: "Dulcineia Lima Pantoja e outros", prevista: "03/09/2026", fatal: "03/09/2026", situacao: "Pendente", tone: "warn" },
  { id: "INT.0000394", tipo: "Contrarrazões", processo: "0804300-60.2018.8.14.0000", cliente: "—", parte: "Diário de Justiça: Justiça Estadual", prevista: "05/09/2026", fatal: "10/09/2026", situacao: "A confirmar", tone: "neutral" },
  { id: "TAR.0000117", tipo: "Audiência", processo: "0913657-84.2023.8.14.0301", cliente: "F. M. Rodrigues - ME", parte: "Angela Maria Oliveira Pereira", prevista: "15/09/2026", fatal: "15/09/2026", situacao: "Pendente", tone: "warn" },
  { id: "TAR.0000198", tipo: "Diligência", processo: "0803083-06.2023.8.14.0000", cliente: "F. M. Rodrigues - ME", parte: "—", prevista: "18/09/2026", fatal: "22/09/2026", situacao: "Em execução", tone: "gold" },
  { id: "TAR.0000210", tipo: "Cumprimento de sentença", processo: "0803862-14.2025.8.14.0301", cliente: "Junto Telecom Serviços", parte: "—", prevista: "24/09/2026", fatal: "30/09/2026", situacao: "Concluída", tone: "ok" },
] as const;

export const processos = [
  { pasta: "PRO.0000291", numero: "0601027-62.2026.6.14.0000", cliente: "Paulo Cagado", papel: "Autor", assunto: "Ação Civil Pública", orgao: "TRE-PA", instancia: "1ª", status: "Movimentado" },
  { pasta: "PRO.0000290", numero: "0601012-93.2026.6.14.0000", cliente: "Alessandra Monteiro da Silva", papel: "Autor", assunto: "Ação Civil Pública", orgao: "TRE-PA", instancia: "1ª", status: "Movimentado" },
  { pasta: "PRO.0000289", numero: "0601013-78.2026.6.14.0000", cliente: "Allaf Pinheiro Wely Correa", papel: "Autor", assunto: "Ação Civil Pública", orgao: "TRE-PA", instancia: "1ª", status: "Parado" },
  { pasta: "PRO.0000288", numero: "0601015-48.2026.6.14.0000", cliente: "Edson Santos Filho", papel: "Autor", assunto: "Ação Civil Pública", orgao: "TRE-PA", instancia: "1ª", status: "Movimentado" },
  { pasta: "PRO.0000287", numero: "0601025-92.2026.6.14.0000", cliente: "Antonio Claudio Lima Feitosa", papel: "Autor", assunto: "Ação Civil Pública", orgao: "TRE-PA", instancia: "1ª", status: "Incompleto" },
  { pasta: "PRO.0000254", numero: "0803862-14.2025.8.14.0301", cliente: "Junto Telecom Serviços", papel: "Réu", assunto: "Prestação de serviços", orgao: "TJ-PA", instancia: "1ª", status: "Movimentado" },
] as const;

export const intimacoes = [
  { disponibilizacao: "02/09/2026", publicacao: "03/09/2026", numero: "7004755-22.2024.8.22.0000", cliente: "Junto Telecom Serviços de Telecomunicações Ltda", descricao: "Núcleo de Justiça 4.0 — intimação de sentença", situacao: "Pendente", vinculado: true },
  { disponibilizacao: "02/09/2026", publicacao: "03/09/2026", numero: "1007267-77.2020.4.01.3900", cliente: "—", descricao: "2ª Vara Federal — despacho", situacao: "Pendente", vinculado: false },
  { disponibilizacao: "02/09/2026", publicacao: "03/09/2026", numero: "0804300-60.2018.8.14.0000", cliente: "—", descricao: "Gab. 22 — decisão monocrática", situacao: "Pendente", vinculado: false },
  { disponibilizacao: "01/09/2026", publicacao: "02/09/2026", numero: "1022340-79.2026.4.01.3900", cliente: "Victor Comércio de Alimentos", descricao: "Turma de Direito Público — pauta de julgamento", situacao: "Processada", vinculado: true },
  { disponibilizacao: "01/09/2026", publicacao: "02/09/2026", numero: "0803083-06.2023.8.14.0000", cliente: "F. M. Rodrigues - ME", descricao: "Comarca de Belém — homologada a transação", situacao: "Arquivada", vinculado: true },
] as const;

export const andamentos = [
  { data: "02/09/2026", orgao: "TJ-RO", tipo: "Intimação", processo: "7004755-22.2024.8.22.0000", cliente: "Junto Telecom", descricao: "Processo: 7004755222024 — intimação eletrônica", lido: false },
  { data: "01/09/2026", orgao: "TRF1", tipo: "Intimação", processo: "1022340-79.2026.4.01.3900", cliente: "Victor Comércio", descricao: "Processo: 1022340792026 — vista dos autos", lido: false },
  { data: "01/09/2026", orgao: "TJ-PA", tipo: "Intimação", processo: "0803083-06.2023.8.14.0000", cliente: "F. M. Rodrigues - ME", descricao: "Processo: 080308306 — decisão publicada", lido: true },
  { data: "31/08/2026", orgao: "TJ-PA", tipo: "Movimentação", processo: "0803083-06.2023.8.14.0000", cliente: "F. M. Rodrigues - ME", descricao: "Expedição de outros documentos", lido: true },
  { data: "31/08/2026", orgao: "TJ-PA", tipo: "Movimentação", processo: "0803083-06.2023.8.14.0000", cliente: "F. M. Rodrigues - ME", descricao: "Homologada a transação", lido: true },
  { data: "31/08/2026", orgao: "TJ-PA", tipo: "Movimentação", processo: "0000042-36.2000.8.14.0082", cliente: "Espólio de Ana Francisca", descricao: "Arquivado definitivamente", lido: true },
  { data: "30/08/2026", orgao: "TJ-PA", tipo: "Movimentação", processo: "0803862-14.2025.8.14.0301", cliente: "Junto Telecom", descricao: "Expedição de mandado", lido: true },
] as const;

export const agenda = [
  { dia: 3, hora: "11:00", titulo: "Audiência de conciliação", tipo: "audiencia" },
  { dia: 7, hora: null, titulo: "Independência do Brasil", tipo: "feriado" },
  { dia: 8, hora: "14:30", titulo: "Audiência de instrução", tipo: "audiencia" },
  { dia: 10, hora: "09:00", titulo: "Prazo fatal — contrarrazões", tipo: "prazo" },
  { dia: 17, hora: "16:00", titulo: "Reunião com cliente", tipo: "compromisso" },
] as const;

export const pessoas = [
  { nome: "F. M. Rodrigues - ME", doc: "12.345.678/0001-90", tipo: "Jurídica", telefone: "(91) 98123-4455", cidade: "Belém - PA", processos: 14 },
  { nome: "Junto Telecom Serviços de Telecomunicações Ltda", doc: "09.876.543/0001-21", tipo: "Jurídica", telefone: "(69) 3222-1100", cidade: "Porto Velho - RO", processos: 8 },
  { nome: "Espólio de Ana Francisca de Nazaré", doc: "324.556.789-01", tipo: "Física", telefone: "—", cidade: "Ananindeua - PA", processos: 3 },
  { nome: "Antonia de Oliveira Shinozaki", doc: "455.221.908-77", tipo: "Física", telefone: "(91) 99777-1212", cidade: "Belém - PA", processos: 2 },
  { nome: "Victor Comércio de Alimentos", doc: "22.114.556/0001-45", tipo: "Jurídica", telefone: "(91) 3011-8899", cidade: "Marituba - PA", processos: 5 },
] as const;

export const capturas = [
  { data: "24/08/2026 10:35", numero: "0601027-62.2026.6.14.0000", orgao: "Tribunal Regional Eleitoral do Pará", instancia: "1ª", status: "Habilitada", responsavel: "AC" },
  { data: "24/08/2026 10:30", numero: "0601012-93.2026.6.14.0000", orgao: "Tribunal Regional Eleitoral do Pará", instancia: "1ª", status: "Habilitada", responsavel: "AC" },
  { data: "24/08/2026 10:29", numero: "0601013-78.2026.6.14.0000", orgao: "Tribunal Regional Eleitoral do Pará", instancia: "1ª", status: "Em andamento", responsavel: "AC" },
  { data: "24/08/2026 10:28", numero: "0601015-48.2026.6.14.0000", orgao: "Tribunal Regional Eleitoral do Pará", instancia: "1ª", status: "Erro", responsavel: "AC" },
  { data: "23/08/2026 18:02", numero: "7004755-22.2024.8.22.0000", orgao: "Tribunal de Justiça de Rondônia", instancia: "2ª", status: "Habilitada", responsavel: "WO" },
  { data: "23/08/2026 17:44", numero: "1022340-79.2026.4.01.3900", orgao: "Tribunal Regional Federal da 1ª Região", instancia: "2ª", status: "Pendente", responsavel: "WO" },
] as const;

export const contratos = [
  { titulo: "Consultivo mensal — F. M. Rodrigues", cliente: "F. M. Rodrigues - ME", modalidade: "Fixo mensal", valor: 4500, inicio: "01/02/2026", situacao: "Habilitado", proxima: "05/10/2026" },
  { titulo: "Êxito 20% — Junto Telecom", cliente: "Junto Telecom Serviços", modalidade: "Êxito", valor: 0.2, inicio: "14/03/2026", situacao: "Habilitado", proxima: "—" },
  { titulo: "Inventário — Espólio de Ana Francisca", cliente: "Espólio de Ana Francisca de Nazaré", modalidade: "Por ato", valor: 12000, inicio: "22/05/2026", situacao: "Habilitado", proxima: "30/09/2026" },
  { titulo: "Contencioso eleitoral — TRE-PA", cliente: "Paulo Cagado", modalidade: "Hora técnica", valor: 380, inicio: "10/08/2026", situacao: "Desabilitado", proxima: "—" },
] as const;

export const cobrancas = [
  { titulo: "Mensalidade set/2026", cliente: "F. M. Rodrigues - ME", vencimento: "05/09/2026", valor: 4500, situacao: "Em aberto" },
  { titulo: "Mensalidade ago/2026", cliente: "F. M. Rodrigues - ME", vencimento: "05/08/2026", valor: 4500, situacao: "Pago" },
  { titulo: "Parcela 2/4 — inventário", cliente: "Espólio de Ana Francisca de Nazaré", vencimento: "30/08/2026", valor: 3000, situacao: "Vencido" },
  { titulo: "Horas jul/2026 — 18h", cliente: "Paulo Cagado", vencimento: "15/08/2026", valor: 6840, situacao: "Pago" },
] as const;

export const lancamentos = [
  { data: "02/09/2026", horas: "01:45", faturavel: true, responsavel: "Alanna Correa", vinculo: "PRO.0000171", cliente: "F. M. Rodrigues - ME", descricao: "Elaboração de contrarrazões" },
  { data: "02/09/2026", horas: "00:30", faturavel: false, responsavel: "Alanna Correa", vinculo: "PRO.0000254", cliente: "Junto Telecom", descricao: "Reunião interna de estratégia" },
  { data: "01/09/2026", horas: "03:15", faturavel: true, responsavel: "Wisley Oliveira", vinculo: "PRO.0000201", cliente: "Espólio de Ana Francisca", descricao: "Análise de partilha e minuta" },
  { data: "01/09/2026", horas: "02:00", faturavel: true, responsavel: "Alanna Correa", vinculo: "PRO.0000291", cliente: "Paulo Cagado", descricao: "Sustentação oral — preparação" },
  { data: "29/08/2026", horas: "00:45", faturavel: true, responsavel: "Wisley Oliveira", vinculo: "ATD.0000012", cliente: "Victor Comércio", descricao: "Atendimento telefônico" },
] as const;

export const catalogoRelatorios = [
  {
    grupo: "Gestão",
    itens: [
      { nome: "Atendimentos por cliente", desc: "Volume e tempo médio por cliente no período." },
      { nome: "Pessoas — completo", desc: "Cadastro consolidado de clientes e envolvidos." },
    ],
  },
  {
    grupo: "Atividades",
    itens: [
      { nome: "Timesheet", desc: "Horas lançadas por responsável, cliente e faturamento." },
      { nome: "Tarefas", desc: "Prazos previstos, fatais e situação de conclusão." },
      { nome: "Audiências", desc: "Pauta por período, comarca e responsável." },
    ],
  },
  {
    grupo: "Processos",
    itens: [
      { nome: "Processos — completo", desc: "Base inteira com partes, assunto e fase." },
      { nome: "Andamentos em planilha", desc: "Movimentações capturadas prontas para análise." },
      { nome: "Processos sem movimentação", desc: "Carteira parada além do limite configurado." },
      { nome: "Pedidos por processo", desc: "Valores pedidos, deferidos e provisionados." },
    ],
  },
  {
    grupo: "Financeiro",
    itens: [
      { nome: "Financeiro — completo", desc: "Receitas, despesas e resultado por período." },
      { nome: "Contas a pagar e receber por dia", desc: "Fluxo diário com saldo projetado." },
      { nome: "Honorários por cliente", desc: "Contratado x faturado x recebido." },
    ],
  },
] as const;

export const kanban = [
  { coluna: "Pendente", tone: "warn", cards: [0, 1, 2] },
  { coluna: "Em execução", tone: "gold", cards: [4] },
  { coluna: "Revisão", tone: "neutral", cards: [3] },
  { coluna: "Concluída", tone: "ok", cards: [5] },
] as const;
