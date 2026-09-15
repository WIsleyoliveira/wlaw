import type { Banco } from "./tipos";

export function semente(): Banco {
  const pessoas = [
    { id: "p1", nome: "F. M. Rodrigues - ME", tipo: "Jurídica", doc: "12.345.678/0001-90", email: "contato@fmrodrigues.com.br", telefone: "(91) 98123-4455", cidade: "Belém - PA", cliente: true },
    { id: "p2", nome: "Junto Telecom Serviços de Telecomunicações Ltda", tipo: "Jurídica", doc: "09.876.543/0001-21", email: "juridico@juntotelecom.com.br", telefone: "(69) 3222-1100", cidade: "Porto Velho - RO", cliente: true },
    { id: "p3", nome: "Espólio de Ana Francisca de Nazaré", tipo: "Física", doc: "324.556.789-01", email: "—", telefone: "—", cidade: "Ananindeua - PA", cliente: true },
    { id: "p4", nome: "Victor Comércio de Alimentos", tipo: "Jurídica", doc: "22.114.556/0001-45", email: "victor@victoralimentos.com.br", telefone: "(91) 3011-8899", cidade: "Marituba - PA", cliente: true },
    { id: "p5", nome: "Paulo Cagado", tipo: "Física", doc: "455.221.908-77", email: "paulo.c@gmail.com", telefone: "(91) 99777-1212", cidade: "Belém - PA", cliente: true },
    { id: "p6", nome: "Antonia de Oliveira Shinozaki", tipo: "Física", doc: "788.112.334-55", email: "antonia.os@gmail.com", telefone: "(91) 99120-3344", cidade: "Belém - PA", cliente: true },
    { id: "p7", nome: "Alessandra Monteiro da Silva", tipo: "Física", doc: "612.889.014-22", email: "ale.monteiro@gmail.com", telefone: "(91) 98800-7711", cidade: "Castanhal - PA", cliente: true },
    { id: "p8", nome: "Almir Fernandes da Paixão", tipo: "Física", doc: "233.401.556-90", email: "—", telefone: "—", cidade: "Ananindeua - PA", cliente: false },
  ] as Banco["pessoas"];

  const processos = [
    { id: "pr1", pasta: "PRO.0000171", numero: "0803371-35.2024.8.14.0097", titulo: "Ação de cobrança c/c indenização por danos materiais", clienteId: "p1", papel: "Autor", contraria: "Almir Fernandes da Paixão", tribunal: "TJ-PA", orgao: "2ª Vara Cível e Empresarial de Ananindeua", comarca: "Ananindeua - PA", instancia: "1ª", classe: "Procedimento Comum Cível", assunto: "Prestação de serviços / Inadimplemento", juiz: "Dra. Marina Vasconcelos Braga", distribuido: "12/03/2024", valorCausa: 87400, provisao: 61000, exito: 72, fase: "Instrução", situacao: "Ativo", responsaveis: ["Alanna Correa", "Wisley Oliveira"], grupo: "Empresarial", marcadores: ["Prioritário", "Cliente carteira A"], monitorado: true, observacoes: "Cliente pede relatório mensal por e-mail." },
    { id: "pr2", pasta: "PRO.0000254", numero: "0803862-75.2025.8.14.0301", titulo: "Ação de rescisão contratual", clienteId: "p2", papel: "Réu", contraria: "Município de Porto Velho", tribunal: "TJ-RO", orgao: "1ª Vara da Fazenda Pública", comarca: "Porto Velho - RO", instancia: "1ª", classe: "Procedimento Comum Cível", assunto: "Contratos administrativos", juiz: "Dr. Henrique Salomão", distribuido: "08/05/2025", valorCausa: 240000, provisao: 96000, exito: 45, fase: "Contestação", situacao: "Ativo", responsaveis: ["Wisley Oliveira"], grupo: "Empresarial", marcadores: ["Alto valor"], monitorado: true, observacoes: "" },
    { id: "pr3", pasta: "PRO.0000201", numero: "0000042-36.2000.8.14.0082", titulo: "Inventário e partilha", clienteId: "p3", papel: "Autor", contraria: "Dulcineia Lima Pantoja e outros", tribunal: "TJ-PA", orgao: "Vara de Família de Ananindeua", comarca: "Ananindeua - PA", instancia: "1ª", classe: "Inventário", assunto: "Sucessões", juiz: "Dra. Célia Ramos", distribuido: "14/02/2000", valorCausa: 320000, provisao: 0, exito: 88, fase: "Instrução", situacao: "Ativo", responsaveis: ["Alanna Correa"], grupo: "Cível", marcadores: [], monitorado: true, observacoes: "" },
    { id: "pr4", pasta: "PRO.0000291", numero: "0601027-62.2026.6.14.0000", titulo: "Ação de Investigação Judicial Eleitoral", clienteId: "p5", papel: "Autor", contraria: "Coligação Frente Popular", tribunal: "TRE-PA", orgao: "Tribunal Regional Eleitoral do Pará", comarca: "Belém - PA", instancia: "1ª", classe: "Ação Civil Pública", assunto: "Propaganda eleitoral irregular", juiz: "Des. Rui Barata", distribuido: "24/08/2026", valorCausa: 0, provisao: 0, exito: 55, fase: "Distribuição", situacao: "Ativo", responsaveis: ["Alanna Correa"], grupo: "Eleitoral", marcadores: ["Urgente"], monitorado: true, observacoes: "" },
    { id: "pr5", pasta: "PRO.0000290", numero: "0601012-93.2026.6.14.0000", titulo: "Ação Civil Pública eleitoral", clienteId: "p7", papel: "Autor", contraria: "Ministério Público Eleitoral", tribunal: "TRE-PA", orgao: "Tribunal Regional Eleitoral do Pará", comarca: "Castanhal - PA", instancia: "1ª", classe: "Ação Civil Pública", assunto: "Prestação de contas", juiz: "Des. Rui Barata", distribuido: "24/08/2026", valorCausa: 0, provisao: 0, exito: 40, fase: "Distribuição", situacao: "Ativo", responsaveis: ["Alanna Correa"], grupo: "Eleitoral", marcadores: [], monitorado: true, observacoes: "" },
    { id: "pr6", pasta: "PRO.0000230", numero: "0913657-84.2023.8.14.0301", titulo: "Reclamação trabalhista — verbas rescisórias", clienteId: "p1", papel: "Réu", contraria: "Angela Maria Oliveira Pereira", tribunal: "TRT-8", orgao: "3ª Vara do Trabalho de Belém", comarca: "Belém - PA", instancia: "1ª", classe: "Reclamação Trabalhista", assunto: "Verbas rescisórias", juiz: "Dr. Paulo Sérgio Lima", distribuido: "19/09/2023", valorCausa: 46200, provisao: 28000, exito: 35, fase: "Instrução", situacao: "Ativo", responsaveis: ["Wisley Oliveira"], grupo: "Trabalhista", marcadores: [], monitorado: true, observacoes: "" },
    { id: "pr7", pasta: "PRO.0000188", numero: "0804300-78.2018.8.14.0000", titulo: "Agravo de instrumento — tutela de urgência", clienteId: "p4", papel: "Autor", contraria: "Estado do Pará", tribunal: "TJ-PA", orgao: "1ª Turma de Direito Público", comarca: "Belém - PA", instancia: "2ª", classe: "Agravo de Instrumento", assunto: "Tributário", juiz: "Des. Leonardo Tavares", distribuido: "03/07/2018", valorCausa: 118000, provisao: 74000, exito: 61, fase: "Recursal", situacao: "Ativo", responsaveis: ["Alanna Correa", "Wisley Oliveira"], grupo: "Cível", marcadores: ["Cliente carteira A"], monitorado: true, observacoes: "" },
    { id: "pr8", pasta: "PRO.0000142", numero: "1022340-79.2026.4.01.3900", titulo: "Mandado de segurança — licença ambiental", clienteId: "p4", papel: "Autor", contraria: "IBAMA", tribunal: "TRF1", orgao: "2ª Vara Federal de Belém", comarca: "Belém - PA", instancia: "1ª", classe: "Mandado de Segurança", assunto: "Licenciamento ambiental", juiz: "Dr. Fábio Nunes", distribuido: "11/01/2026", valorCausa: 60000, provisao: 0, exito: 70, fase: "Sentença", situacao: "Ativo", responsaveis: ["Wisley Oliveira"], grupo: "Cível", marcadores: [], monitorado: true, observacoes: "" },
    { id: "pr9", pasta: "PRO.0000117", numero: "0803083-24.2023.8.14.0000", titulo: "Execução de título extrajudicial", clienteId: "p1", papel: "Autor", contraria: "Comercial Belém Ltda", tribunal: "TJ-PA", orgao: "4ª Vara Cível de Belém", comarca: "Belém - PA", instancia: "1ª", classe: "Execução de Título Extrajudicial", assunto: "Cheque", juiz: "Dra. Marina Vasconcelos Braga", distribuido: "22/06/2023", valorCausa: 34500, provisao: 30000, exito: 80, fase: "Execução", situacao: "Arquivado", responsaveis: ["Alanna Correa"], grupo: "Empresarial", marcadores: [], monitorado: false, observacoes: "Acordo homologado e cumprido." },
    { id: "pr10", pasta: "PRO.0000096", numero: "7004755-22.2024.8.22.0000", titulo: "Ação declaratória de inexistência de débito", clienteId: "p2", papel: "Réu", contraria: "Marcos Antônio Pereira", tribunal: "TJ-RO", orgao: "Núcleo de Justiça 4.0", comarca: "Porto Velho - RO", instancia: "1ª", classe: "Procedimento Comum Cível", assunto: "Telefonia", juiz: "Dr. Henrique Salomão", distribuido: "30/10/2024", valorCausa: 21000, provisao: 12000, exito: 52, fase: "Sentença", situacao: "Ativo", responsaveis: ["Wisley Oliveira"], grupo: "Empresarial", marcadores: [], monitorado: true, observacoes: "" },
  ] as Banco["processos"];

  const atividades = [
    { id: "a1", identificador: "TAR.0000218", tipo: "Audiência", descricao: "Audiência de instrução e julgamento", processoId: "pr1", prevista: "03/09/2026 16:00", fatal: "03/09/2026", responsavel: "Alanna Correa", situacao: "Pendente" },
    { id: "a2", identificador: "TAR.0000231", tipo: "Audiência", descricao: "Audiência de conciliação", processoId: "pr3", prevista: "03/09/2026 11:00", fatal: "03/09/2026", responsavel: "Alanna Correa", situacao: "Pendente" },
    { id: "a3", identificador: "INT.0000394", tipo: "Contrarrazões", descricao: "Contrarrazões de apelação — Diário de Justiça", processoId: "pr7", prevista: "05/09/2026", fatal: "10/09/2026", responsavel: "Wisley Oliveira", situacao: "A confirmar" },
    { id: "a4", identificador: "TAR.0000117", tipo: "Audiência", descricao: "Audiência em formato híbrido", processoId: "pr6", prevista: "15/09/2026 09:30", fatal: "15/09/2026", responsavel: "Wisley Oliveira", situacao: "Pendente" },
    { id: "a5", identificador: "TAR.0000198", tipo: "Diligência", descricao: "Levantamento de certidões no cartório", processoId: "pr3", prevista: "18/09/2026", fatal: "22/09/2026", responsavel: "Camila Ferreira", situacao: "Em execução" },
    { id: "a6", identificador: "TAR.0000210", tipo: "Cumprimento de sentença", descricao: "Iniciar cumprimento definitivo", processoId: "pr10", prevista: "24/09/2026", fatal: "30/09/2026", responsavel: "Wisley Oliveira", situacao: "Revisão" },
    { id: "a7", identificador: "TAR.0000205", tipo: "Manifestação", descricao: "Manifestação sobre laudo pericial", processoId: "pr2", prevista: "10/09/2026", fatal: "12/09/2026", responsavel: "Wisley Oliveira", situacao: "Pendente" },
    { id: "a8", identificador: "TAR.0000188", tipo: "Embargos de declaração", descricao: "Embargos contra sentença — omissão", processoId: "pr8", prevista: "08/09/2026", fatal: "09/09/2026", responsavel: "Alanna Correa", situacao: "Pendente" },
    { id: "a9", identificador: "TAR.0000174", tipo: "Diligência", descricao: "Protocolo de rol de testemunhas", processoId: "pr1", prevista: "28/08/2026", fatal: "29/08/2026", responsavel: "Wisley Oliveira", situacao: "Concluída" },
    { id: "a10", identificador: "TAR.0000240", tipo: "Manifestação", descricao: "Memoriais finais", processoId: "pr1", prevista: "18/09/2026", fatal: "23/09/2026", responsavel: "Alanna Correa", situacao: "A confirmar" },
    { id: "a11", identificador: "TAR.0000241", tipo: "Atendimento", descricao: "Reunião de alinhamento com o cliente", processoId: "pr4", prevista: "11/09/2026 14:00", fatal: "11/09/2026", responsavel: "Alanna Correa", situacao: "Pendente" },
    { id: "a12", identificador: "TAR.0000160", tipo: "Diligência", descricao: "Cálculo de liquidação", processoId: "pr9", prevista: "20/08/2026", fatal: "25/08/2026", responsavel: "Camila Ferreira", situacao: "Concluída" },
  ] as Banco["atividades"];

  const andamentos = [
    { id: "an1", data: "02/09/2026", orgao: "TJ-RO", tipo: "Intimação", processoId: "pr10", descricao: "Intimação eletrônica — sentença publicada no Núcleo de Justiça 4.0", lido: false },
    { id: "an2", data: "01/09/2026", orgao: "TRF1", tipo: "Intimação", processoId: "pr8", descricao: "Vista dos autos ao impetrante pelo prazo de 5 dias", lido: false },
    { id: "an3", data: "01/09/2026", orgao: "TJ-PA", tipo: "Intimação", processoId: "pr9", descricao: "Decisão publicada — homologação do acordo", lido: true },
    { id: "an4", data: "31/08/2026", orgao: "TJ-PA", tipo: "Movimentação", processoId: "pr1", descricao: "Expedição de outros documentos", lido: true },
    { id: "an5", data: "31/08/2026", orgao: "TJ-PA", tipo: "Movimentação", processoId: "pr9", descricao: "Homologada a transação", lido: true },
    { id: "an6", data: "31/08/2026", orgao: "TJ-PA", tipo: "Movimentação", processoId: "pr3", descricao: "Arquivado definitivamente o incidente", lido: true },
    { id: "an7", data: "30/08/2026", orgao: "TJ-PA", tipo: "Movimentação", processoId: "pr2", descricao: "Expedição de mandado de citação", lido: false },
    { id: "an8", data: "28/08/2026", orgao: "TRE-PA", tipo: "Movimentação", processoId: "pr4", descricao: "Conclusos para despacho", lido: false },
    { id: "an9", data: "24/08/2026", orgao: "TJ-PA", tipo: "Prazo", processoId: "pr1", descricao: "Prazo para especificação de provas — 15 dias", lido: true },
    { id: "an10", data: "18/08/2026", orgao: "TJ-PA", tipo: "Decisão", processoId: "pr1", descricao: "Saneado o feito. Designada audiência de instrução para 03/09/2026 às 16h", lido: true },
    { id: "an11", data: "12/08/2026", orgao: "TRT-8", tipo: "Movimentação", processoId: "pr6", descricao: "Juntada de laudo pericial", lido: false },
    { id: "an12", data: "02/08/2026", orgao: "TJ-PA", tipo: "Petição", processoId: "pr1", descricao: "Manifestação sobre a contestação protocolada", lido: true },
  ] as Banco["andamentos"];

  const intimacoes = [
    { id: "i1", disponibilizacao: "02/09/2026", publicacao: "03/09/2026", numero: "7004755-22.2024.8.22.0000", processoId: "pr10", descricao: "Núcleo de Justiça 4.0 — intimação de sentença", situacao: "Pendente", teor: "Intimadas as partes da sentença proferida nos autos, que julgou PARCIALMENTE PROCEDENTE o pedido, condenando a ré ao pagamento de R$ 8.400,00 a título de repetição de indébito, afastado o dano moral. Prazo recursal na forma da lei." },
    { id: "i2", disponibilizacao: "02/09/2026", publicacao: "03/09/2026", numero: "1007267-77.2020.4.01.3900", processoId: null, descricao: "2ª Vara Federal — despacho", situacao: "Pendente", teor: "Intime-se a parte autora para, no prazo de 15 (quinze) dias, manifestar-se sobre a contestação e especificar as provas que pretende produzir, justificando sua pertinência." },
    { id: "i3", disponibilizacao: "02/09/2026", publicacao: "03/09/2026", numero: "0804300-78.2018.8.14.0000", processoId: "pr7", descricao: "Gab. 22 — decisão monocrática", situacao: "Pendente", teor: "Decisão monocrática que negou provimento ao agravo interno. Publique-se. Intimem-se. Prazo para eventual agravo em recurso especial." },
    { id: "i4", disponibilizacao: "01/09/2026", publicacao: "02/09/2026", numero: "1022340-79.2026.4.01.3900", processoId: "pr8", descricao: "Turma de Direito Público — pauta de julgamento", situacao: "Processada", teor: "Inclusão em pauta de julgamento da sessão do dia 22/09/2026, às 14h, por videoconferência." },
    { id: "i5", disponibilizacao: "01/09/2026", publicacao: "02/09/2026", numero: "0803083-24.2023.8.14.0000", processoId: "pr9", descricao: "Comarca de Belém — homologada a transação", situacao: "Arquivada", teor: "Homologo por sentença o acordo celebrado entre as partes, para que produza seus jurídicos e legais efeitos. Julgo extinto o processo com resolução do mérito." },
    { id: "i6", disponibilizacao: "31/08/2026", publicacao: "01/09/2026", numero: "0913657-84.2023.8.14.0301", processoId: "pr6", descricao: "3ª Vara do Trabalho — laudo pericial", situacao: "Pendente", teor: "Ficam as partes intimadas do laudo pericial juntado aos autos, podendo manifestar-se no prazo comum de 10 (dez) dias." },
  ] as Banco["intimacoes"];

  const capturas = [
    { id: "c1", data: "24/08/2026 10:35", numero: "0601027-62.2026.6.14.0000", orgao: "Tribunal Regional Eleitoral do Pará", instancia: "1ª", status: "Habilitada" },
    { id: "c2", data: "24/08/2026 10:30", numero: "0601012-93.2026.6.14.0000", orgao: "Tribunal Regional Eleitoral do Pará", instancia: "1ª", status: "Habilitada" },
    { id: "c3", data: "24/08/2026 10:29", numero: "0601013-78.2026.6.14.0000", orgao: "Tribunal Regional Eleitoral do Pará", instancia: "1ª", status: "Em andamento" },
    { id: "c4", data: "24/08/2026 10:28", numero: "0601015-48.2026.6.14.0000", orgao: "Tribunal Regional Eleitoral do Pará", instancia: "1ª", status: "Erro" },
    { id: "c5", data: "23/08/2026 18:02", numero: "7004755-22.2024.8.22.0000", orgao: "Tribunal de Justiça de Rondônia", instancia: "2ª", status: "Habilitada" },
    { id: "c6", data: "23/08/2026 17:44", numero: "1022340-79.2026.4.01.3900", orgao: "Tribunal Regional Federal da 1ª Região", instancia: "2ª", status: "Pendente" },
  ] as Banco["capturas"];

  const contratos = [
    { id: "ct1", titulo: "Consultivo mensal — F. M. Rodrigues", clienteId: "p1", modalidade: "Fixo mensal", valor: 4500, inicio: "01/02/2026", proxima: "05/10/2026", situacao: "Habilitado" },
    { id: "ct2", titulo: "Êxito 20% — Junto Telecom", clienteId: "p2", modalidade: "Êxito", valor: 0.2, inicio: "14/03/2026", proxima: "—", situacao: "Habilitado" },
    { id: "ct3", titulo: "Inventário — Espólio de Ana Francisca", clienteId: "p3", modalidade: "Por ato", valor: 12000, inicio: "22/05/2026", proxima: "30/09/2026", situacao: "Habilitado" },
    { id: "ct4", titulo: "Contencioso eleitoral — TRE-PA", clienteId: "p5", modalidade: "Hora técnica", valor: 380, inicio: "10/08/2026", proxima: "—", situacao: "Desabilitado" },
  ] as Banco["contratos"];

  const cobrancas = [
    { id: "cb1", descricao: "Mensalidade set/2026", clienteId: "p1", vencimento: "05/09/2026", valor: 4500, situacao: "Em aberto" },
    { id: "cb2", descricao: "Mensalidade ago/2026", clienteId: "p1", vencimento: "05/08/2026", valor: 4500, situacao: "Pago" },
    { id: "cb3", descricao: "Parcela 2/4 — inventário", clienteId: "p3", vencimento: "30/08/2026", valor: 3000, situacao: "Vencido" },
    { id: "cb4", descricao: "Horas jul/2026 — 18h", clienteId: "p5", vencimento: "15/08/2026", valor: 6840, situacao: "Pago" },
    { id: "cb5", descricao: "Êxito — acordo homologado", clienteId: "p2", vencimento: "20/09/2026", valor: 18400, situacao: "Em aberto" },
    { id: "cb6", descricao: "Honorários contratuais", clienteId: "p4", vencimento: "28/09/2026", valor: 6200, situacao: "Em aberto" },
  ] as Banco["cobrancas"];

  const contasPagar = [
    { id: "cp1", fornecedor: "Aluguel — Sala 1204", categoria: "Ocupação", vencimento: "05/09/2026", valor: 7800, situacao: "Em aberto" },
    { id: "cp2", fornecedor: "Folha de pagamento", categoria: "Pessoal", vencimento: "05/09/2026", valor: 14200, situacao: "Em aberto" },
    { id: "cp3", fornecedor: "Custas TJ-PA", categoria: "Custas e diligências", vencimento: "12/09/2026", valor: 1840, situacao: "Em aberto" },
    { id: "cp4", fornecedor: "Wlaw — assinatura", categoria: "Tecnologia", vencimento: "01/09/2026", valor: 890, situacao: "Pago" },
    { id: "cp5", fornecedor: "Energia e internet", categoria: "Ocupação", vencimento: "10/09/2026", valor: 1120, situacao: "Em aberto" },
  ] as Banco["contasPagar"];

  const lancamentos = [
    { id: "l1", data: "02/09/2026", minutos: 105, faturavel: true, responsavel: "Alanna Correa", processoId: "pr1", descricao: "Elaboração de contrarrazões" },
    { id: "l2", data: "02/09/2026", minutos: 30, faturavel: false, responsavel: "Alanna Correa", processoId: "pr2", descricao: "Reunião interna de estratégia" },
    { id: "l3", data: "01/09/2026", minutos: 195, faturavel: true, responsavel: "Wisley Oliveira", processoId: "pr3", descricao: "Análise de partilha e minuta" },
    { id: "l4", data: "01/09/2026", minutos: 120, faturavel: true, responsavel: "Alanna Correa", processoId: "pr4", descricao: "Sustentação oral — preparação" },
    { id: "l5", data: "29/08/2026", minutos: 45, faturavel: true, responsavel: "Wisley Oliveira", processoId: "pr8", descricao: "Atendimento telefônico ao cliente" },
    { id: "l6", data: "28/08/2026", minutos: 150, faturavel: true, responsavel: "Camila Ferreira", processoId: "pr6", descricao: "Pesquisa de jurisprudência" },
  ] as Banco["lancamentos"];

  const documentos = [
    { id: "d1", nome: "Decisão de saneamento.pdf", tipo: "Decisão", processoId: "pr1", tamanho: "312 KB", data: "18/08/2026", autor: "Captura automática" },
    { id: "d2", nome: "Manifestação sobre contestação.docx", tipo: "Petição", processoId: "pr1", tamanho: "84 KB", data: "02/08/2026", autor: "Alanna Correa" },
    { id: "d3", nome: "Contrato de honorários — Junto Telecom.pdf", tipo: "Contrato", processoId: "pr2", tamanho: "220 KB", data: "14/03/2026", autor: "Wisley Oliveira" },
    { id: "d4", nome: "Notas fiscais 04-09/2023.pdf", tipo: "Prova", processoId: "pr1", tamanho: "2,8 MB", data: "12/03/2024", autor: "Wisley Oliveira" },
    { id: "d5", nome: "Procuração — Espólio.pdf", tipo: "Procuração", processoId: "pr3", tamanho: "96 KB", data: "22/05/2026", autor: "Camila Ferreira" },
    { id: "d6", nome: "Ata de audiência 03-09.pdf", tipo: "Decisão", processoId: "pr6", tamanho: "148 KB", data: "31/08/2026", autor: "Captura automática" },
    { id: "d7", nome: "Laudo pericial.pdf", tipo: "Prova", processoId: "pr6", tamanho: "1,4 MB", data: "12/08/2026", autor: "Captura automática" },
  ] as Banco["documentos"];

  const usuarios = [
    { id: "u1", nome: "Alanna Correa Halliday e Silva", email: "alanna@escritorio.adv.br", oab: "OAB/PA 28.114", perfil: "Administrador", grupos: ["Cível", "Empresarial"], ativo: true },
    { id: "u2", nome: "Wisley Oliveira", email: "wisley@escritorio.adv.br", oab: "OAB/PA 31.402", perfil: "Advogado", grupos: ["Empresarial"], ativo: true },
    { id: "u3", nome: "Camila Ferreira", email: "camila@escritorio.adv.br", oab: "Estagiária", perfil: "Estagiário", grupos: ["Cível"], ativo: true },
    { id: "u4", nome: "Rodrigo Alves", email: "rodrigo@escritorio.adv.br", oab: "—", perfil: "Financeiro", grupos: [], ativo: false },
  ] as Banco["usuarios"];

  const tiposTarefa = [
    { id: "t1", nome: "Audiência", cor: "#b3261e", prazoPadrao: "Data da audiência", diasUteis: false },
    { id: "t2", nome: "Contrarrazões", cor: "#c98500", prazoPadrao: "15 dias", diasUteis: true },
    { id: "t3", nome: "Manifestação", cor: "#2a78d6", prazoPadrao: "15 dias", diasUteis: true },
    { id: "t4", nome: "Embargos de declaração", cor: "#1f7a4d", prazoPadrao: "5 dias", diasUteis: true },
    { id: "t5", nome: "Diligência", cor: "#71717a", prazoPadrao: "Livre", diasUteis: false },
    { id: "t6", nome: "Cumprimento de sentença", cor: "#7c3aed", prazoPadrao: "15 dias", diasUteis: true },
    { id: "t7", nome: "Atendimento", cor: "#0891b2", prazoPadrao: "Livre", diasUteis: false },
  ] as Banco["tiposTarefa"];

  const feriados = [
    { id: "f1", data: "07/09/2026", nome: "Independência do Brasil", tipo: "Nacional" },
    { id: "f2", data: "12/10/2026", nome: "Nossa Senhora Aparecida", tipo: "Nacional" },
    { id: "f3", data: "15/08/2026", nome: "Adesão do Pará à Independência", tipo: "Estadual" },
    { id: "f4", data: "08/12/2026", nome: "Recesso — TJ-PA (Portaria 1.204)", tipo: "Tribunal" },
  ] as Banco["feriados"];

  const atendimentos = [
    { id: "at1", data: "29/08/2026", clienteId: "p5", tipo: "Ligação", assunto: "Atendimento telefônico ao cliente", responsavel: "Wisley Oliveira", processoId: "pr8" },
    { id: "at2", data: "26/08/2026", clienteId: "p1", tipo: "Reunião", assunto: "Alinhamento sobre andamento da cobrança", responsavel: "Alanna Correa", processoId: "pr1" },
    { id: "at3", data: "20/08/2026", clienteId: "p3", tipo: "Presencial", assunto: "Entrega de documentos do inventário", responsavel: "Camila Ferreira", processoId: "pr3" },
  ] as Banco["atendimentos"];

  return {
    processos, pessoas, atividades, andamentos, intimacoes, capturas,
    contratos, cobrancas, contasPagar, lancamentos, documentos,
    usuarios, tiposTarefa, feriados, atendimentos,
    config: {
      razaoSocial: "Correa Halliday Sociedade de Advogados",
      cnpj: "41.882.115/0001-30",
      oab: "OAB/PA 2.114",
      telefone: "(91) 3222-8800",
      endereco: "Av. Nazaré, 1204 — sala 1204, Belém - PA",
      fuso: "América/Belém (UTC−3)",
      primeiroDia: "Segunda-feira",
      resumoEmail: "1x ao dia, às 8h",
      antecedencia: "5 dias",
      margem: "Data prevista = fatal − 2 dias",
      art220: "Aplicar automaticamente",
      modeloIA: "llama3.1:8b",
    },
  };
}

