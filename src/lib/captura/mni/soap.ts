import crypto from "node:crypto";
import https from "node:https";
import { XMLParser } from "fast-xml-parser";

export const NS_SERVICO = "http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/";
export const NS_TIPOS = "http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2";

/** transitorio = vale tentar de novo depois (tribunal fora do ar, tempo esgotado). */
export class ErroMni extends Error {
  readonly transitorio: boolean;
  constructor(mensagem: string, transitorio: boolean) {
    super(mensagem);
    this.transitorio = transitorio;
  }
}

const escapar = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** Os campos seguem a ordem do xs:sequence do WSDL — a ordem importa. */
export function envelope(operacao: string, campos: [string, string | boolean | undefined][]) {
  const corpo = campos
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `<tip:${k}>${escapar(String(v))}</tip:${k}>`)
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="${NS_SERVICO}" xmlns:tip="${NS_TIPOS}">` +
    `<soapenv:Header/><soapenv:Body><ser:${operacao}>${corpo}</ser:${operacao}></soapenv:Body></soapenv:Envelope>`
  );
}

export type Transporte = (
  url: string,
  xml: string,
  opcoes: { pfx?: Buffer; senhaPfx?: string; timeoutMs: number; signal?: AbortSignal },
) => Promise<{ status: number; corpo: string }>;

const LIMITE_BYTES = 20 * 1024 * 1024;

/** HTTPS com certificado de cliente (mTLS) quando houver A1. */
export const transporteHttps: Transporte = (url, xml, o) =>
  new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: '""', "Content-Length": Buffer.byteLength(xml) },
        pfx: o.pfx,
        passphrase: o.senhaPfx,
        timeout: o.timeoutMs,
        signal: o.signal,
      },
      (res) => {
        const partes: Buffer[] = [];
        let total = 0;
        res.on("data", (pedaco: Buffer) => {
          total += pedaco.length;
          if (total > LIMITE_BYTES) req.destroy(new ErroMni("Resposta do tribunal acima de 20 MB.", false));
          else partes.push(pedaco);
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, corpo: Buffer.concat(partes).toString("utf8") }));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new ErroMni("Tempo esgotado esperando o tribunal.", true)));
    req.on("error", (e) => reject(e instanceof ErroMni ? e : new ErroMni(`Falha de conexão com o tribunal: ${e.message}`, true)));
    req.end(xml);
  });

const LISTAS = new Set([
  "movimento", "documento", "polo", "parte", "advogado", "assunto", "aviso", "comunicacao",
  "complemento", "magistradoAtuante", "outroParametro", "parametro",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (nome) => LISTAS.has(nome),
});

type No = Record<string, unknown>;
export const texto = (v: unknown): string =>
  v == null ? "" : typeof v === "object" ? String((v as No)["#text"] ?? "") : String(v);

export function lerResposta(status: number, xml: string, operacao: string): No {
  let doc: No;
  try {
    doc = parser.parse(xml) as No;
  } catch {
    throw new ErroMni(`O tribunal devolveu algo que não é XML (HTTP ${status}).`, status >= 500);
  }
  const corpo = (doc.Envelope as No | undefined)?.Body as No | undefined;
  if (!corpo) throw new ErroMni(`O tribunal não devolveu SOAP (HTTP ${status}).`, status >= 500 || status === 0);
  const falha = corpo.Fault as No | undefined;
  if (falha) {
    const motivo = texto(falha.faultstring) || texto((falha.Reason as No | undefined)?.Text) || "sem detalhe";
    throw new ErroMni(`Falha SOAP do tribunal: ${motivo}`, status >= 500 && !/senha|usu[aá]rio|autentic|certificad/i.test(motivo));
  }
  const resposta = corpo[`${operacao}Resposta`] as No | undefined;
  if (!resposta) throw new ErroMni(`Resposta sem ${operacao}Resposta.`, false);
  if (texto(resposta.sucesso) !== "true") throw new ErroMni(`O tribunal recusou: ${texto(resposta.mensagem) || "sem mensagem"}`, false);
  return resposta;
}

/** tipoDataHora do MNI: AAAAMMDDHHMMSS, horário de Brasília. */
export function lerDataMni(v: string): Date | null {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (!m) return null;
  const [, a, mes, d, h = "00", mi = "00", s = "00"] = m;
  return new Date(`${a}-${mes}-${d}T${h}:${mi}:${s}-03:00`);
}

export type MovimentoMni = {
  identificador: string;
  dataHora: Date;
  codigoNacional: number | null;
  descricao: string;
};

export function movimentosDe(processo: No | undefined): MovimentoMni[] {
  const lista = (processo?.movimento as No[] | undefined) ?? [];
  return lista.flatMap((m) => {
    const dataHora = lerDataMni(texto(m["@dataHora"]));
    if (!dataHora) return [];
    const nacional = m.movimentoNacional as No | undefined;
    const local = m.movimentoLocal as No | undefined;
    const complementos = [
      ...((m.complemento as unknown[] | undefined) ?? []),
      ...((nacional?.complemento as unknown[] | undefined) ?? []),
    ].map(texto).filter(Boolean);
    const codigo = Number(texto(nacional?.["@codigoNacional"])) || null;
    const descricao =
      [texto(local?.["@descricao"]), ...complementos].filter(Boolean).join(" — ") ||
      (codigo ? `Movimento nacional ${codigo}` : "Movimento sem descrição");
    const identificador =
      texto(m["@identificadorMovimento"]) ||
      crypto.createHash("sha1").update(`${texto(m["@dataHora"])}|${codigo ?? ""}|${descricao}`).digest("hex");
    return [{ identificador, dataHora, codigoNacional: codigo, descricao }];
  });
}

export type CabecalhoMni = {
  numero: string;
  classe: number | null;
  orgao: string;
  instancia: string;
  valorCausa: number | null;
  dataAjuizamento: Date | null;
  polos: { polo: string; partes: string[] }[];
};

export function cabecalhoDe(processo: No | undefined): CabecalhoMni | null {
  const dados = processo?.dadosBasicos as No | undefined;
  if (!dados) return null;
  const orgao = dados.orgaoJulgador as No | undefined;
  return {
    numero: texto(dados["@numero"]),
    classe: Number(texto(dados["@classeProcessual"])) || null,
    orgao: texto(orgao?.["@nomeOrgao"]),
    instancia: texto(orgao?.["@instancia"]),
    valorCausa: dados.valorCausa != null ? Number(texto(dados.valorCausa)) : null,
    dataAjuizamento: lerDataMni(texto(dados["@dataAjuizamento"])),
    polos: ((dados.polo as No[] | undefined) ?? []).map((p) => ({
      polo: texto(p["@polo"]),
      partes: ((p.parte as No[] | undefined) ?? []).map((parte) => texto((parte.pessoa as No | undefined)?.["@nome"])).filter(Boolean),
    })),
  };
}

export type AvisoMni = {
  idAviso: string;
  tipoComunicacao: string;
  dataDisponibilizacao: Date | null;
  numeroProcesso: string;
  destinatario: string;
  orgao: string;
};

export function avisosDe(resposta: No): AvisoMni[] {
  return ((resposta.aviso as No[] | undefined) ?? []).map((a) => {
    const processo = a.processo as No | undefined;
    return {
      idAviso: texto(a["@idAviso"]),
      tipoComunicacao: texto(a["@tipoComunicacao"]),
      dataDisponibilizacao: lerDataMni(texto(a.dataDisponibilizacao)),
      numeroProcesso: texto(processo?.["@numero"]),
      destinatario: texto(((a.destinatario as No | undefined)?.pessoa as No | undefined)?.["@nome"]),
      orgao: texto((processo?.orgaoJulgador as No | undefined)?.["@nomeOrgao"]),
    };
  });
}
