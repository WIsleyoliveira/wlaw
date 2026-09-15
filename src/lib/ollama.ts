import "server-only";
import { ler } from "./db";
import { dataBR } from "./prazos";
import { FASES_PADRAO, type Atividade, type Banco, type Processo } from "./tipos";
import { diasAte, hoje, paraData } from "./util";

export const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";
export const MODELO_PADRAO = "llama3.1:8b";

export async function modelo() {
  return (await ler()).config.modeloIA || MODELO_PADRAO;
}

const SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
export const hojeExtenso = () => {
  const d = hoje();
  return `${dataBR(d)} (${SEMANA[d.getDay()]})`;
};

export const SISTEMA = `Você é a Wlaw IA, assistente jurídica interna de um escritório de advocacia brasileiro. Você fala com os advogados e a equipe do escritório, nunca com o cliente final.

COMO RESPONDER
- Português do Brasil, tom de colega advogado experiente: direto, sem floreio, sem repetir a pergunta.
- Comece pela resposta. Depois, se ajudar, detalhe em tópicos curtos.
- Ao citar processo, use pasta e título (ex.: PRO.0000171 — Ação de cobrança). Ao citar prazo, dê a data fatal e o responsável.
- Markdown simples: **negrito** no essencial e listas com "-". Sem tabelas.
- Escreva com suas palavras. Não cole as linhas do contexto nem os separadores "|".
- Até 8 linhas, salvo quando pedirem texto longo (e-mail, minuta, relatório).

FIDELIDADE AOS DADOS
- Sua única fonte é o CONTEXTO fornecido. As contagens ("vence em X dias", "parado há N dias") já vêm calculadas: use-as e não refaça contas de data.
- Se a informação não está no contexto, diga que não consta no sistema. Nunca invente número, valor, data, nome, andamento ou decisão.
- Em perguntas ambíguas (ex.: "esta semana"), use o recorte que o contexto oferece e diga qual foi.

TÉCNICA JURÍDICA
- Prazos processuais cíveis correm em dias úteis e excluem o dia do começo.
- Cite artigo de lei só quando tiver certeza; na dúvida, descreva o instituto sem número.
- Risco e estratégia são análise para o advogado responsável decidir, não parecer definitivo.

EXEMPLO DE FORMATO (dados fictícios — nunca os repita):
Pergunta: Quais prazos vencem esta semana?
Resposta: Dois prazos até domingo, os dois com a Fulana:
- **Amanhã, 10/03** — audiência de instrução no PRO.0000999 (Ação de exemplo).
- **12/03** — manifestação no PRO.0000998 (Outra ação de exemplo).`;

type MensagemOllama = { role: "system" | "user" | "assistant"; content: string };

export async function ollamaChat(
  mensagens: MensagemOllama[],
  opcoes: { stream?: boolean; format?: object; signal?: AbortSignal; temperatura?: number } = {},
) {
  return fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: opcoes.signal,
    body: JSON.stringify({
      model: await modelo(),
      messages: mensagens,
      stream: opcoes.stream ?? true,
      format: opcoes.format,
      keep_alive: "30m",
      options: { temperature: opcoes.temperatura ?? 0.2, num_ctx: 12288 },
    }),
  });
}

export type StatusIA = {
  online: boolean;
  url: string;
  modelo: string;
  instalado: boolean;
  modelos: { nome: string; tamanho: string; gb: number }[];
};

export async function statusOllama(): Promise<StatusIA> {
  const atual = await modelo();
  try {
    const r = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2500), cache: "no-store" });
    const j = (await r.json()) as {
      models?: { name: string; size: number; details?: { parameter_size?: string }; capabilities?: string[] }[];
    };
    const modelos = (j.models ?? [])
      .filter((m) => !m.capabilities || m.capabilities.includes("completion"))
      .map((m) => ({ nome: m.name, tamanho: m.details?.parameter_size ?? "", gb: Number((m.size / 1e9).toFixed(1)) }));
    const instalado = modelos.some((m) => m.nome === atual || m.nome === `${atual}:latest`);
    return { online: true, url: OLLAMA, modelo: atual, instalado, modelos };
  } catch {
    return { online: false, url: OLLAMA, modelo: atual, instalado: false, modelos: [] };
  }
}

/* ---------- Contexto: fatos já calculados, para o modelo não fazer conta de data ---------- */

const emAberto = (a: Atividade) => a.situacao !== "Concluída" && a.situacao !== "Cancelada";
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const corta = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

function quando(data: string) {
  const d = diasAte(data);
  if (d < 0) return `VENCIDO há ${-d} dia${d === -1 ? "" : "s"}`;
  if (d === 0) return "vence HOJE";
  if (d === 1) return "vence amanhã";
  return `vence em ${d} dias`;
}

function andamentosDe(b: Banco, processoId: string) {
  return b.andamentos
    .filter((a) => a.processoId === processoId)
    .sort((x, y) => paraData(y.data).getTime() - paraData(x.data).getTime());
}

/** verFinanceiro: só inclui cobranças e horas para perfis com acesso ao financeiro. */
export async function contextoDoProcesso(processoId: string, verFinanceiro = false) {
  const b = await ler();
  const p = b.processos.find((x) => x.id === processoId);
  if (!p) return "";

  const cliente = b.pessoas.find((x) => x.id === p.clienteId);
  const andamentos = andamentosDe(b, p.id);
  const ultimo = andamentos[0];
  const tarefas = b.atividades.filter((a) => a.processoId === p.id);
  const abertas = tarefas.filter(emAberto).sort((x, y) => diasAte(x.fatal) - diasAte(y.fatal));
  const intimacoes = b.intimacoes.filter((i) => i.processoId === p.id);
  const docs = b.documentos.filter((d) => d.processoId === p.id);
  const atendimentos = b.atendimentos.filter((a) => a.processoId === p.id);
  const minutos = b.lancamentos.filter((l) => l.processoId === p.id).reduce((s, l) => s + l.minutos, 0);
  const cobrancas = b.cobrancas.filter((c) => c.clienteId === p.clienteId);
  const fases = p.fases?.length ? p.fases : FASES_PADRAO;

  return [
    `DATA DE HOJE: ${hojeExtenso()}.`,
    "",
    `PROCESSO ${p.numero} — pasta ${p.pasta}`,
    `Título: ${p.titulo}`,
    `Cliente: ${cliente?.nome ?? "—"} (polo ${p.papel}). Parte contrária: ${p.contraria || "não informada"}.`,
    `Órgão: ${p.tribunal} — ${p.orgao}, comarca de ${p.comarca}, ${p.instancia} instância. Magistrado: ${p.juiz || "não informado"}.`,
    `Classe: ${p.classe}. Assunto: ${p.assunto}. Área: ${p.grupo}. Situação: ${p.situacao}.`,
    `Distribuído em ${p.distribuido}. Trilha de fases: ${fases.join(" → ")}. Fase atual: ${p.fase}.`,
    ultimo
      ? `Último andamento: ${ultimo.data} (há ${-diasAte(ultimo.data)} dias).`
      : "Nenhum andamento registrado.",
    `Valor da causa: ${reais(p.valorCausa)}. Provisionado: ${reais(p.provisao)}. Êxito estimado pela equipe: ${p.exito}%.`,
    `Responsáveis: ${p.responsaveis.join(", ")}. Marcadores: ${p.marcadores.join(", ") || "nenhum"}.`,
    p.observacoes ? `Observações internas: ${p.observacoes}` : "",
    "",
    `PRAZOS E TAREFAS EM ABERTO (${abertas.length}):`,
    ...(abertas.length
      ? abertas.map((t) => `- ${t.tipo}${t.descricao ? ` — ${t.descricao}` : ""} | fatal ${t.fatal} (${quando(t.fatal)}) | previsto ${t.prevista} | ${t.situacao} | resp. ${t.responsavel}`)
      : ["- nenhum"]),
    `Tarefas concluídas: ${tarefas.length - abertas.length}.`,
    "",
    `INTIMAÇÕES (${intimacoes.length}):`,
    ...intimacoes.map((i) => `- publicada ${i.publicacao} [${i.situacao}] ${i.descricao}. Teor: ${corta(i.teor, 700)}`),
    "",
    "ANDAMENTOS (do mais recente ao mais antigo):",
    ...(andamentos.length ? andamentos.slice(0, 15).map((a) => `- ${a.data} [${a.tipo}] ${corta(a.descricao, 300)}`) : ["- nenhum"]),
    "",
    `DOCUMENTOS (${docs.length}):`,
    ...docs.map((d) => `- ${d.nome} (${d.tipo}, ${d.data}, por ${d.autor})`),
    "",
    `ATENDIMENTOS AO CLIENTE (${atendimentos.length}):`,
    ...atendimentos.map((a) => `- ${a.data} ${a.tipo}: ${a.assunto} (${a.responsavel})`),
    ...(verFinanceiro
      ? [
          "",
          "FINANCEIRO:",
          `- Horas lançadas neste processo: ${(minutos / 60).toFixed(1)}h.`,
          `- Cobranças do cliente: faturado ${reais(cobrancas.reduce((s, c) => s + c.valor, 0))}, recebido ${reais(cobrancas.filter((c) => c.situacao === "Pago").reduce((s, c) => s + c.valor, 0))}.`,
        ]
      : []),
  ]
    .filter((linha) => linha !== "")
    .join("\n")
    .replace(/\n(?=[A-ZÇÃÉ ]{6,}[ (:])/g, "\n\n");
}

export async function contextoGeral(verFinanceiro = false) {
  const b = await ler();
  const proc = (id: string | null) => b.processos.find((p) => p.id === id);
  const cliente = (id: string) => b.pessoas.find((p) => p.id === id)?.nome ?? "—";
  const perfil = (p: Processo) =>
    `cliente ${cliente(p.clienteId)} (${p.papel}) | ${p.grupo} | fase ${p.fase} | êxito ${p.exito}% | causa ${reais(p.valorCausa)} | resp. ${p.responsaveis.join(", ")}`;

  const dataHoje = hoje();
  const ateDomingo = (7 - dataHoje.getDay()) % 7;
  const domingo = new Date(dataHoje);
  domingo.setDate(dataHoje.getDate() + ateDomingo);

  const prazos = b.atividades
    .filter(emAberto)
    .map((t) => ({ t, d: diasAte(t.fatal) }))
    .sort((x, y) => x.d - y.d);
  const bloco = (titulo: string, itens: typeof prazos) => [
    `${titulo}:`,
    ...(itens.length
      ? itens.map(({ t }) => {
          const p = proc(t.processoId);
          return `- ${t.tipo}${t.descricao ? ` — ${corta(t.descricao, 80)}` : ""} | fatal ${t.fatal} (${quando(t.fatal)}) | ${p ? `${p.pasta} ${p.titulo}` : "sem processo vinculado"} | ${t.situacao} | resp. ${t.responsavel}`;
        })
      : ["- nenhum"]),
  ];

  const ativos = b.processos
    .filter((p) => p.situacao === "Ativo")
    .map((p) => ({ p, u: andamentosDe(b, p.id).at(0) }));
  const comAndamento = ativos
    .flatMap(({ p, u }) => (u ? [{ p, u, parado: -diasAte(u.data) }] : []))
    .sort((x, y) => y.parado - x.parado);
  const semAndamento = ativos.filter(({ u }) => !u);
  const proximo = prazos.find((x) => x.d >= 0);

  const porArea = new Map<string, { n: number; causa: number; provisao: number }>();
  for (const { p } of ativos) {
    const a = porArea.get(p.grupo) ?? { n: 0, causa: 0, provisao: 0 };
    a.n++;
    a.causa += p.valorCausa;
    a.provisao += p.provisao;
    porArea.set(p.grupo, a);
  }

  const intimacoes = b.intimacoes.filter((i) => i.situacao === "Pendente");
  const naoLidos = b.andamentos.filter((a) => !a.lido);
  const aReceber = b.cobrancas.filter((c) => c.situacao !== "Pago");
  const vencidas = aReceber.filter((c) => c.situacao === "Vencido" || diasAte(c.vencimento) < 0);
  const aPagar = b.contasPagar.filter((c) => c.situacao === "Em aberto");

  return [
    `DATA DE HOJE: ${hojeExtenso()}. "Esta semana" vai até domingo, ${dataBR(domingo)}.`,
    `ESCRITÓRIO: ${b.config.razaoSocial}. Equipe ativa: ${b.usuarios.filter((u) => u.ativo).map((u) => `${u.nome} (${u.perfil})`).join(", ")}.`,
    `Carteira: ${b.processos.length} processos, ${ativos.length} ativos.`,
    "",
    "DESTAQUES (já apurados — use-os para perguntas diretas):",
    `- Prazos vencidos: ${prazos.filter((x) => x.d < 0).length}.`,
    `- Próximo prazo: ${proximo ? `${proximo.t.tipo} com fatal ${proximo.t.fatal} (${quando(proximo.t.fatal)}), ${proc(proximo.t.processoId)?.pasta ?? "sem processo"}, resp. ${proximo.t.responsavel}` : "nenhum"}.`,
    `- Processo com andamento registrado que está parado há mais tempo: ${comAndamento[0] ? `${comAndamento[0].p.pasta} ${comAndamento[0].p.titulo}, parado há ${comAndamento[0].parado} dias (último andamento ${comAndamento[0].u.data})` : "nenhum"}.`,
    `- Processos ativos sem nenhum andamento registrado (verificar no tribunal): ${semAndamento.map(({ p }) => p.pasta).join(", ") || "nenhum"}.`,
    "",
    "PRAZOS E TAREFAS EM ABERTO (contagem de dias já calculada):",
    ...bloco("Vencidos", prazos.filter((x) => x.d < 0)),
    ...bloco("Vencem hoje", prazos.filter((x) => x.d === 0)),
    ...bloco(`Vencem até domingo (${dataBR(domingo)})`, prazos.filter((x) => x.d > 0 && x.d <= ateDomingo)),
    ...bloco("Vencem nos 15 dias seguintes", prazos.filter((x) => x.d > ateDomingo && x.d <= ateDomingo + 15)),
    ...bloco("Mais adiante", prazos.filter((x) => x.d > ateDomingo + 15)),
    "",
    "PROCESSOS ATIVOS COM ANDAMENTO REGISTRADO, do mais parado ao mais movimentado (parado = dias desde o último andamento):",
    ...comAndamento.map(({ p, u, parado }) =>
      `- ${p.pasta} ${p.titulo} | parado há ${parado} dias (último andamento ${u.data}, ${u.tipo}) | ${perfil(p)}`,
    ),
    "",
    "PROCESSOS ATIVOS SEM NENHUM ANDAMENTO REGISTRADO NO WLAW (não dá para medir há quanto tempo estão parados; recomende conferir no tribunal):",
    ...(semAndamento.length
      ? semAndamento.map(({ p }) => `- ${p.pasta} ${p.titulo} | distribuído em ${p.distribuido} | ${perfil(p)}`)
      : ["- nenhum"]),
    "",
    "PROCESSOS NÃO ATIVOS:",
    ...b.processos.filter((p) => p.situacao !== "Ativo").map((p) => `- ${p.pasta} ${p.titulo} | ${p.situacao.toUpperCase()}`),
    "",
    "CARTEIRA ATIVA POR ÁREA:",
    ...[...porArea].map(([area, a]) => `- ${area}: ${a.n} processo(s) | causa ${reais(a.causa)} | provisionado ${reais(a.provisao)}`),
    "",
    `INTIMAÇÕES PENDENTES DE PROCESSAR (${intimacoes.length}):`,
    ...intimacoes.map((i) => {
      const p = proc(i.processoId);
      return `- publicada ${i.publicacao} | ${p ? p.pasta : `nº ${i.numero}, sem processo vinculado`} | ${i.descricao}`;
    }),
    "",
    `ANDAMENTOS NÃO LIDOS (${naoLidos.length}):`,
    ...naoLidos.map((a) => `- ${a.data} [${a.tipo}] ${proc(a.processoId)?.pasta ?? "sem processo"}: ${corta(a.descricao, 160)}`),
    ...(verFinanceiro
      ? [
          "",
          "FINANCEIRO:",
          `- A receber em aberto: ${reais(aReceber.reduce((s, c) => s + c.valor, 0))} em ${aReceber.length} cobrança(s).`,
          ...vencidas.map((c) => `- VENCIDA: ${c.descricao} | ${cliente(c.clienteId)} | ${reais(c.valor)} | vencimento ${c.vencimento}`),
          `- Contas a pagar em aberto: ${reais(aPagar.reduce((s, c) => s + c.valor, 0))} em ${aPagar.length} conta(s).`,
        ]
      : ["", "FINANCEIRO: não disponível para o perfil de quem pergunta."]),
  ].join("\n");
}
