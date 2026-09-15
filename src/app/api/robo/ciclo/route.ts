import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { executarCiclo } from "@/lib/captura/robo";

export const runtime = "nodejs";
export const maxDuration = 300;

function autorizado(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const recebido = req.headers.get("authorization") ?? "";
  if (!segredo) return false;
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const dado = Buffer.from(recebido);
  return dado.length === esperado.length && crypto.timingSafeEqual(dado, esperado);
}

/** Chamado pelo agendador (docker compose --profile robo, Vercel Cron ou qualquer cron com o segredo). */
async function ciclo(req: NextRequest) {
  if (!autorizado(req)) return Response.json({ erro: "Não autorizado." }, { status: 401 });
  const resultado = await executarCiclo({ orcamentoMs: 240_000, signal: req.signal });
  return Response.json(resultado);
}

export const GET = ciclo;
export const POST = ciclo;
