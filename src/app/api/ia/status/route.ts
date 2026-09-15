import { NextRequest } from "next/server";
import { exigirApi } from "@/lib/auth/sessao";
import { ler } from "@/lib/db";
import { statusOllama } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const acesso = await exigirApi("ia");
  if ("resposta" in acesso) return acesso.resposta;
  const id = req.nextUrl.searchParams.get("processoId");
  const p = id ? (await ler()).processos.find((x) => x.id === id) : null;
  return Response.json({
    ...(await statusOllama()),
    processo: p ? { id: p.id, pasta: p.pasta, titulo: p.titulo } : null,
  });
}
