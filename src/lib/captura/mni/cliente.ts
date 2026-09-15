import { type Transporte, avisosDe, cabecalhoDe, envelope, lerResposta, movimentosDe, texto, transporteHttps } from "./soap";

export type CredenciaisMni = {
  url: string;
  idConsultante: string;
  senhaConsultante: string;
  pfx?: Buffer;
  senhaPfx?: string;
};

const numeroUnico = (n: string) => n.replace(/\D/g, "");

/** Operações de consulta do MNI 2.2.2. Peticionamento fica de fora de propósito. */
export function criarClienteMni(cred: CredenciaisMni, transporte: Transporte = transporteHttps, timeoutMs = 60_000) {
  const autenticacao: [string, string][] = [
    ["idConsultante", cred.idConsultante],
    ["senhaConsultante", cred.senhaConsultante],
  ];

  async function chamar(operacao: string, campos: [string, string | boolean | undefined][], signal?: AbortSignal) {
    const xml = envelope(operacao, campos);
    const { status, corpo } = await transporte(cred.url, xml, { pfx: cred.pfx, senhaPfx: cred.senhaPfx, timeoutMs, signal });
    return lerResposta(status, corpo, operacao);
  }

  return {
    /** Só hashes: barato. Serve para decidir se vale baixar o processo. */
    async consultarAlteracao(numero: string, signal?: AbortSignal) {
      const r = await chamar("consultarAlteracao", [...autenticacao, ["numeroProcesso", numeroUnico(numero)]], signal);
      return {
        hashCabecalho: texto(r.hashCabecalho),
        hashMovimentacoes: texto(r.hashMovimentacoes),
        hashDocumentos: texto(r.hashDocumentos),
      };
    },

    async consultarProcesso(numero: string, signal?: AbortSignal) {
      const r = await chamar(
        "consultarProcesso",
        [...autenticacao, ["numeroProcesso", numeroUnico(numero)], ["movimentos", true], ["incluirCabecalho", true], ["incluirDocumentos", false]],
        signal,
      );
      const processo = r.processo as Record<string, unknown> | undefined;
      return { cabecalho: cabecalhoDe(processo), movimentos: movimentosDe(processo) };
    },

    /** Lista avisos sem abrir o teor — abrir o teor pode registrar ciência da intimação. */
    async consultarAvisosPendentes(signal?: AbortSignal) {
      const r = await chamar("consultarAvisosPendentes", [["idConsultante", cred.idConsultante], ["senhaConsultante", cred.senhaConsultante]], signal);
      return avisosDe(r);
    },

    /** ATENÇÃO: pode registrar ciência no tribunal. Só chamar por ação explícita de um advogado. */
    async consultarTeorComunicacao(numero: string, idAviso: string, signal?: AbortSignal) {
      const r = await chamar(
        "consultarTeorComunicacao",
        [["idConsultante", cred.idConsultante], ["senhaConsultante", cred.senhaConsultante], ["numeroProcesso", numeroUnico(numero)], ["identificadorAviso", idAviso]],
        signal,
      );
      return ((r.comunicacao as Record<string, unknown>[] | undefined) ?? []).map((c) => ({
        id: texto(c["@id"]),
        teor: texto(c.teor),
        prazo: Number(texto(c["@prazo"])) || null,
        tipoPrazo: texto(c["@tipoPrazo"]),
      }));
    },
  };
}

export type ClienteMni = ReturnType<typeof criarClienteMni>;
