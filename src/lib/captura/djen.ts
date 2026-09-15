import "server-only";
import { type Oab, mesmaOab, variantesOab } from "./oab";

const BASE = process.env.DJEN_URL ?? "https://comunicaapi.pje.jus.br/api/v1";
/** A API devolve x-ratelimit-limit: 20. Espaçamos para nunca encostar no limite. */
const INTERVALO_MS = 3200;
const POR_PAGINA = 100;
const MAX_PAGINAS = 20;

export type ItemDjen = {
  id: number;
  hash: string;
  data_disponibilizacao: string;
  siglaTribunal: string;
  tipoComunicacao: string;
  nomeOrgao: string;
  texto: string;
  numero_processo: string;
  numeroprocessocommascara: string;
  meio: string;
  link: string;
  tipoDocumento: string;
  nomeClasse: string;
  ativo: boolean;
  status: string;
  motivo_cancelamento: string | null;
  data_cancelamento: string | null;
  destinatarios: { nome: string; polo: string }[];
  destinatarioadvogados: { advogado: { nome: string; numero_oab: string; uf_oab: string } }[];
};

export class ErroDjen extends Error {
  readonly status?: number;
  readonly transitorio: boolean;
  constructor(mensagem: string, status?: number, transitorio = true) {
    super(mensagem);
    this.status = status;
    this.transitorio = transitorio;
  }
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
let ultimaChamada = 0;

async function consultar(parametros: Record<string, string>, signal?: AbortSignal) {
  for (let tentativa = 1; ; tentativa++) {
    const espera = ultimaChamada + INTERVALO_MS - Date.now();
    if (espera > 0) await dormir(espera);
    ultimaChamada = Date.now();

    let r: Response;
    try {
      r = await fetch(`${BASE}/comunicacao?${new URLSearchParams(parametros)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.any([AbortSignal.timeout(30_000), ...(signal ? [signal] : [])]),
      });
    } catch (erro) {
      if (signal?.aborted) throw erro;
      if (tentativa < 3) {
        await dormir(2_000 * tentativa);
        continue;
      }
      throw new ErroDjen("O DJEN não respondeu (tempo esgotado ou rede).");
    }

    if (r.status === 429 && tentativa < 3) {
      await dormir((Number(r.headers.get("retry-after")) || 60) * 1_000);
      continue;
    }
    if (r.status >= 500 && tentativa < 3) {
      await dormir(3_000 * tentativa);
      continue;
    }
    if (r.status === 403) throw new ErroDjen("O DJEN recusou o acesso (403). A consulta precisa sair de um IP no Brasil.", 403, false);
    if (!r.ok) throw new ErroDjen(`O DJEN respondeu ${r.status}.`, r.status, r.status >= 500 || r.status === 429);

    const corpo = (await r.json()) as { status: string; message: string; items?: ItemDjen[] };
    if (corpo.status !== "success") throw new ErroDjen(`O DJEN devolveu erro: ${corpo.message}`);
    return corpo.items ?? [];
  }
}

/** Todas as comunicações de um processo (até 500), para o cadastro por número. */
export async function buscarPorProcesso(numero: string, signal?: AbortSignal) {
  const itens: ItemDjen[] = [];
  let requisicoes = 0;
  for (let pagina = 1; pagina <= 5; pagina++) {
    const lote = await consultar(
      { numeroProcesso: numero.replace(/\D/g, ""), itensPorPagina: String(POR_PAGINA), pagina: String(pagina) },
      signal,
    );
    requisicoes++;
    itens.push(...lote);
    if (lote.length < POR_PAGINA) break;
  }
  return { itens, requisicoes };
}

/** Intimações destinadas à OAB no período (datas AAAA-MM-DD, inclusive). */
export async function buscarPorOab(oab: Oab, inicio: string, fim: string, signal?: AbortSignal) {
  const encontrados = new Map<string, ItemDjen>();
  let requisicoes = 0;
  let truncado = false;

  for (const variante of variantesOab(oab)) {
    for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
      const itens = await consultar(
        {
          numeroOab: variante,
          ufOab: oab.uf,
          dataDisponibilizacaoInicio: inicio,
          dataDisponibilizacaoFim: fim,
          itensPorPagina: String(POR_PAGINA),
          pagina: String(pagina),
        },
        signal,
      );
      requisicoes++;
      // A busca por número é aproximada: guarda só o que é da OAB exata.
      for (const item of itens) {
        if (item.destinatarioadvogados?.some(({ advogado }) => mesmaOab(advogado.numero_oab, advogado.uf_oab, oab))) {
          encontrados.set(item.hash, item);
        }
      }
      if (itens.length < POR_PAGINA) break;
      if (pagina === MAX_PAGINAS) truncado = true;
    }
  }

  return { itens: [...encontrados.values()], requisicoes, truncado };
}
