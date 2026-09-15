import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { exigirApi } from "@/lib/auth/sessao";
import { ler } from "@/lib/db";
import { pode } from "@/lib/permissoes";
import { sql } from "@/lib/sql";
import { OLLAMA, SISTEMA, contextoDoProcesso, contextoGeral, modelo, ollamaChat } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Mensagem = { role: "user" | "assistant"; content: string };

const MAX_HISTORICO = 12;
const MAX_CARACTERES = 6000;

const PEDIDO_RESUMO = `Resuma este processo para o advogado responsável em no máximo 5 linhas corridas, sem listas, cobrindo:
1) onde o processo está (fase e último andamento, com a data);
2) o fato recente mais relevante;
3) o próximo passo concreto e o prazo fatal dele, se houver;
4) o principal risco.`;

const texto = (conteudo: string, status: number) =>
  new Response(conteudo, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

const ehMensagem = (m: unknown): m is Mensagem =>
  !!m &&
  typeof m === "object" &&
  ((m as Mensagem).role === "user" || (m as Mensagem).role === "assistant") &&
  typeof (m as Mensagem).content === "string";

export async function POST(req: NextRequest) {
  const acesso = await exigirApi("ia", "editar");
  if ("resposta" in acesso) return acesso.resposta;
  const verFinanceiro = pode(acesso.usuario.perfil, "financeiro");

  const pedido = (await req.json().catch(() => null)) as { mensagens?: unknown; processoId?: unknown; modo?: unknown } | null;
  if (!pedido) return texto("Pedido inválido.", 400);

  const processoId = typeof pedido.processoId === "string" ? pedido.processoId : null;
  if (processoId && !(await ler()).processos.some((p) => p.id === processoId)) return texto("Processo não encontrado.", 404);

  const resumo = pedido.modo === "resumo";
  if (resumo && !processoId) return texto("O resumo precisa de um processo.", 400);

  // Só perguntas e respostas entram no histórico; papel "system" vindo do navegador é descartado.
  const historico: Mensagem[] = resumo
    ? [{ role: "user", content: PEDIDO_RESUMO }]
    : (Array.isArray(pedido.mensagens) ? pedido.mensagens : [])
        .filter(ehMensagem)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CARACTERES) }))
        .slice(-MAX_HISTORICO);
  if (historico.at(-1)?.role !== "user") return texto("Envie uma pergunta.", 400);

  const contexto = processoId ? await contextoDoProcesso(processoId, verFinanceiro) : await contextoGeral(verFinanceiro);

  let resposta: Response;
  try {
    resposta = await ollamaChat(
      [{ role: "system", content: `${SISTEMA}\n\nCONTEXTO ATUAL DO SISTEMA:\n\n${contexto}` }, ...historico],
      { signal: req.signal, temperatura: resumo ? 0.1 : 0.2 },
    );
  } catch {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    return texto(`Não consegui falar com o Ollama em ${OLLAMA}. Abra o aplicativo do Ollama ou rode "ollama serve".`, 503);
  }

  if (resposta.status === 404) {
    return texto(`O modelo "${await modelo()}" não está instalado. Rode "ollama pull ${await modelo()}" ou troque o modelo em Configurações.`, 502);
  }
  if (!resposta.ok || !resposta.body) {
    return texto(`O Ollama respondeu ${resposta.status}. ${(await resposta.text().catch(() => "")).slice(0, 200)}`, 502);
  }

  // Ollama devolve um JSON por linha; repassamos só o texto.
  const decodificador = new TextDecoder();
  const codificador = new TextEncoder();
  let sobra = "";
  let completo = "";

  const fluxo = new TransformStream<Uint8Array, Uint8Array>({
    transform(pedaco, controle) {
      sobra += decodificador.decode(pedaco, { stream: true });
      const linhas = sobra.split("\n");
      sobra = linhas.pop() ?? "";
      for (const linha of linhas) {
        if (!linha.trim()) continue;
        try {
          const j = JSON.parse(linha);
          if (j?.error) controle.enqueue(codificador.encode(`\n\n[Erro do modelo: ${j.error}]`));
          const t = j?.message?.content;
          if (t) {
            completo += t;
            controle.enqueue(codificador.encode(t));
          }
        } catch {
          /* linha parcial — ignora */
        }
      }
    },
    async flush() {
      if (!resumo || !processoId || !completo.trim()) return;
      await sql`update processos set resumo_ia = ${sql.json({ texto: completo.trim(), geradoEm: new Date().toISOString() })} where id = ${processoId}`;
      try {
        revalidatePath(`/processos/${processoId}`);
      } catch {
        /* fora do escopo de requisição — o próximo acesso já lê do disco */
      }
    },
  });

  return new Response(resposta.body.pipeThrough(fluxo), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
