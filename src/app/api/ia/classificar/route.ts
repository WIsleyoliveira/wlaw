import { NextRequest } from "next/server";
import { exigirApi } from "@/lib/auth/sessao";
import { ler } from "@/lib/db";
import { SISTEMA, hojeExtenso, modelo, ollamaChat } from "@/lib/ollama";
import {
  AUDIENCIA, PECAS, SEM_PRAZO, calcularPrazo, extrairData, extrairPrazoDoTexto,
  ajustarAoHoje, margemDias, pecasCabiveis, ramoDoNumero, recuarDiasUteis, regrasDe,
} from "@/lib/prazos";
import { diasAte, hoje, normalizar } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const erro = (mensagem: string, status: number) => Response.json({ erro: mensagem }, { status });
const espacos = (s: string) => s.replace(/\s+/g, " ").trim();

type Leitura = { trecho: string; resumo: string; peca: string; providencia: string; urgente: boolean };

const TIPO_POR_PECA: Record<string, string> = {
  "Embargos de declaração": "Embargos de declaração",
  Contrarrazões: "Contrarrazões",
  "Impugnação ao cumprimento de sentença": "Cumprimento de sentença",
  "Pagamento voluntário da condenação": "Cumprimento de sentença",
  [AUDIENCIA]: "Audiência",
  [SEM_PRAZO]: "Diligência",
};

/** Tipo de tarefa do escritório para a peça — decidido aqui, não pelo modelo. */
function tipoDaTarefa(peca: string, tipos: string[]) {
  const candidatos = [TIPO_POR_PECA[peca], tipos.find((t) => normalizar(peca).includes(normalizar(t))), "Manifestação"];
  return candidatos.find((t) => t && tipos.includes(t)) ?? tipos[0] ?? "Manifestação";
}

export async function POST(req: NextRequest) {
  const acesso = await exigirApi("intimacoes", "editar");
  if ("resposta" in acesso) return acesso.resposta;
  const { intimacaoId } = ((await req.json().catch(() => ({}))) ?? {}) as { intimacaoId?: string };
  const b = await ler();
  const i = b.intimacoes.find((x) => x.id === intimacaoId);
  if (!i) return erro("Intimação não encontrada.", 404);

  const p = b.processos.find((x) => x.id === i.processoId);
  const ramo = ramoDoNumero(i.numero);
  const tipos = b.tiposTarefa.map((t) => t.nome);
  const juizado = /juizado/i.test(`${p?.orgao ?? ""} ${p?.classe ?? ""} ${i.descricao} ${i.teor}`);
  const pecas = [...pecasCabiveis(ramo, juizado).map((x) => x.peca), AUDIENCIA, SEM_PRAZO];

  // A ordem das propriedades é a ordem de geração: o modelo lê e resume antes de decidir a peça.
  const esquema = {
    type: "object",
    properties: {
      trecho: { type: "string" },
      resumo: { type: "string" },
      peca: { type: "string", enum: pecas },
      providencia: { type: "string" },
      urgente: { type: "boolean" },
    },
    required: ["trecho", "resumo", "peca", "providencia", "urgente"],
  };

  const prompt = [
    "Analise a intimação abaixo como advogado do NOSSO cliente e preencha o JSON.",
    "",
    `Hoje: ${hojeExtenso()}.`,
    `Ramo da Justiça (pelo número CNJ): ${ramo}${juizado ? ", Juizado Especial" : ""}.`,
    p
      ? `Processo no escritório: ${p.pasta} — ${p.titulo}. Classe: ${p.classe}. Órgão: ${p.orgao} (${p.tribunal}, ${p.instancia} instância). Nosso cliente é ${p.papel}. Fase: ${p.fase}.`
      : "Processo não cadastrado no escritório.",
    "",
    `Publicação: ${i.publicacao}`,
    `Descrição: ${i.descricao}`,
    `Teor: """${i.teor}"""`,
    "",
    "Como preencher:",
    "- trecho: cópia literal do trecho do teor que mostra o que foi decidido ou determinado.",
    "- resumo: o que o juízo decidiu ou determinou, em até 20 palavras.",
    "- peca: a providência cabível para o nosso cliente. Se o teor indicar o recurso ou o ato, siga o teor. Sem indicação: sentença em procedimento comum → Apelação; sentença em Juizado Especial → Recurso inominado; sentença na Justiça do Trabalho → Recurso ordinário trabalhista; decisão na Justiça Eleitoral → Recurso eleitoral; decisão interlocutória agravável → Agravo de instrumento; ordem para falar sobre laudo → Manifestação sobre laudo pericial; sobre contestação → Réplica.",
    `  Pauta, audiência ou sessão marcada → "${AUDIENCIA}". Nada a praticar (ex.: acordo homologado e processo extinto) → "${SEM_PRAZO}".`,
    "- providencia: a tarefa concreta do advogado, começando por verbo no infinitivo, em até 15 palavras. Ex.: \"Interpor apelação contra a sentença de parcial procedência\". Não comece com \"verificar se\".",
    "- urgente: true só se houver tutela de urgência, risco de perecimento de direito ou ato nos próximos dias.",
  ].join("\n");

  let leitura: Leitura;
  try {
    const r = await ollamaChat(
      [{ role: "system", content: SISTEMA }, { role: "user", content: prompt }],
      { stream: false, format: esquema, temperatura: 0, signal: req.signal },
    );
    if (r.status === 404) return erro(`O modelo "${await modelo()}" não está instalado. Rode "ollama pull ${await modelo()}".`, 502);
    if (!r.ok) return erro(`O Ollama respondeu ${r.status}.`, 502);
    const j = await r.json();
    leitura = JSON.parse(j?.message?.content ?? "");
  } catch {
    return erro("Não consegui falar com a IA local. Confira se o Ollama está aberto.", 502);
  }

  const peca = pecas.includes(leitura.peca) ? leitura.peca : "Manifestação simples";
  const tipo = tipoDaTarefa(peca, tipos);
  // Citação que não existe no teor é descartada — a IA não pode "citar" o que não leu.
  const trecho = espacos(i.teor).includes(espacos(leitura.trecho ?? "")) ? espacos(leitura.trecho) : "";

  const regras = regrasDe(b.config, b.feriados, ramo);
  const avisos: string[] = [];
  let dias: number | null = null;
  let uteis = true;
  let origem: "teor" | "lei" | "data" | "nenhum" = "nenhum";
  let fundamento = "";
  let fatal = "";
  let prevista = "";

  if (peca === AUDIENCIA) {
    fatal = prevista = extrairData(i.teor) ?? "";
    origem = fatal ? "data" : "nenhum";
    fundamento = fatal ? "Data do ato informada no teor." : "A data do ato não aparece no teor — preencha manualmente.";
  } else if (peca === SEM_PRAZO) {
    fundamento = "Intimação para ciência, sem ato a praticar.";
  } else {
    const legal = PECAS.find((x) => x.peca === peca)!;
    const expresso = extrairPrazoDoTexto(i.teor);
    if (expresso) {
      dias = expresso.dias;
      uteis = expresso.uteis ?? legal.uteis;
      origem = "teor";
      fundamento = `Prazo fixado na própria intimação: “${espacos(expresso.trecho)}”.`;
    } else {
      dias = legal.dias;
      uteis = legal.uteis;
      origem = "lei";
      fundamento = `${legal.dias} dias ${legal.uteis ? "úteis" : "corridos"} — ${legal.base}.`;
      avisos.push("A intimação não fixou prazo: a contagem segue a lei para a peça sugerida. Confira se a peça está certa.");
    }
    const conta = calcularPrazo(i.publicacao, dias, uteis, regras);
    fatal = conta.fatal;
    prevista = recuarDiasUteis(fatal, margemDias(b.config), i.publicacao, regras);
    if (conta.feriados.length) avisos.push(`Dias sem expediente descontados: ${conta.feriados.join(", ")}.`);
    if (conta.suspenso) {
      avisos.push(
        b.config.art220 === "Perguntar caso a caso"
          ? "O prazo atravessa o recesso de 20/12 a 20/01, e a contagem suspendeu esses dias (art. 220 do CPC). Confirme se se aplica."
          : "Contagem suspensa no recesso de 20/12 a 20/01 (art. 220 do CPC).",
      );
    }
  }
  if (fatal) {
    const ajuste = ajustarAoHoje(prevista || fatal, fatal, hoje());
    prevista = ajuste.prevista;
    avisos.push(...ajuste.avisos);
  }
  if (!p) avisos.push("Intimação sem processo vinculado no Wlaw.");

  return Response.json({
    sugestao: {
      peca, tipo, trecho, dias, uteis, origem, fundamento, fatal, prevista, avisos,
      resumo: espacos(leitura.resumo ?? ""),
      providencia: espacos(leitura.providencia ?? ""),
      urgente: Boolean(leitura.urgente) || (fatal !== "" && diasAte(fatal) <= 5),
      modelo: await modelo(),
    },
  });
}
