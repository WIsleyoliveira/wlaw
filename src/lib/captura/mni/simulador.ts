import crypto from "node:crypto";
import { NS_SERVICO, NS_TIPOS, type Transporte } from "./soap";

/** Tribunal de mentira que responde no formato do MNI 2.2.2, para testar sem certificado. */
export type CenarioMni = {
  processos: Record<string, { classe: number; orgao: string; movimentos: { dataHora: string; descricao: string; codigo?: number }[] }>;
  avisos?: { idAviso: string; numero: string; dataDisponibilizacao: string; destinatario: string; tipo?: string }[];
  falha?: "fora-do-ar" | "senha" | "lento";
  senhaValida?: string;
};

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
const campo = (xml: string, nome: string) => xml.match(new RegExp(`<(?:\\w+:)?${nome}>([^<]*)</`))?.[1] ?? "";

const embrulhar = (operacao: string, corpo: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>` +
  `<ns4:${operacao}Resposta xmlns:ns2="http://www.cnj.jus.br/intercomunicacao-2.2.2" xmlns:ns3="${NS_TIPOS}" xmlns:ns4="${NS_SERVICO}">${corpo}</ns4:${operacao}Resposta>` +
  `</soap:Body></soap:Envelope>`;

const recusa = (operacao: string, mensagem: string) =>
  embrulhar(operacao, `<ns3:sucesso>false</ns3:sucesso><ns3:mensagem>${esc(mensagem)}</ns3:mensagem>`);

export function transporteSimulado(cenario: CenarioMni): Transporte {
  return async (_url, xml, { signal }) => {
    if (cenario.falha === "fora-do-ar") return { status: 503, corpo: "<html><body>Service Unavailable</body></html>" };
    if (cenario.falha === "lento") {
      await new Promise((_, rejeitar) => signal?.addEventListener("abort", () => rejeitar(new Error("abortado"))));
    }

    const operacao = xml.match(/<ser:(\w+)>/)?.[1] ?? "";
    const senha = campo(xml, "senhaConsultante");
    if (cenario.falha === "senha" || (cenario.senhaValida && senha !== cenario.senhaValida)) {
      return { status: 200, corpo: recusa(operacao, "Usuário ou senha inválidos.") };
    }

    if (operacao === "consultarAvisosPendentes") {
      const avisos = (cenario.avisos ?? [])
        .map((a) =>
          `<ns3:aviso idAviso="${esc(a.idAviso)}" tipoComunicacao="${esc(a.tipo ?? "INT")}">` +
          `<ns2:destinatario><ns2:pessoa nome="${esc(a.destinatario)}" sexo="D" tipoPessoa="fisica"/></ns2:destinatario>` +
          `<ns2:processo numero="${esc(a.numero)}" classeProcessual="7" codigoLocalidade="1" nivelSigilo="0">` +
          `<ns2:orgaoJulgador codigoOrgao="1" nomeOrgao="Vara simulada" instancia="ORIG" codigoMunicipioIBGE="1501402"/></ns2:processo>` +
          `<ns2:dataDisponibilizacao>${esc(a.dataDisponibilizacao)}</ns2:dataDisponibilizacao></ns3:aviso>`,
        )
        .join("");
      return { status: 200, corpo: embrulhar(operacao, `<ns3:sucesso>true</ns3:sucesso><ns3:mensagem>OK</ns3:mensagem>${avisos}`) };
    }

    const numero = campo(xml, "numeroProcesso");
    const processo = cenario.processos[numero];
    if (!processo) return { status: 200, corpo: recusa(operacao, `Processo ${numero} não encontrado ou sem acesso.`) };

    const assinatura = crypto.createHash("sha1").update(JSON.stringify(processo.movimentos)).digest("hex");

    if (operacao === "consultarAlteracao") {
      return {
        status: 200,
        corpo: embrulhar(
          operacao,
          `<ns3:sucesso>true</ns3:sucesso><ns3:mensagem>OK</ns3:mensagem><ns3:hashCabecalho>c${numero}</ns3:hashCabecalho>` +
            `<ns3:hashMovimentacoes>${assinatura}</ns3:hashMovimentacoes><ns3:hashDocumentos>d0</ns3:hashDocumentos>`,
        ),
      };
    }

    if (operacao === "consultarProcesso") {
      const movimentos = processo.movimentos
        .map((m, i) =>
          `<ns2:movimento dataHora="${m.dataHora}" identificadorMovimento="sim-${numero}-${i}">` +
          (m.codigo
            ? `<ns2:movimentoNacional codigoNacional="${m.codigo}"><ns2:complemento>${esc(m.descricao)}</ns2:complemento></ns2:movimentoNacional>`
            : `<ns2:movimentoLocal codigoMovimento="${900 + i}" codigoPaiNacional="0" descricao="${esc(m.descricao)}"/>`) +
          `</ns2:movimento>`,
        )
        .join("");
      return {
        status: 200,
        corpo: embrulhar(
          operacao,
          `<ns3:sucesso>true</ns3:sucesso><ns3:mensagem>OK</ns3:mensagem><ns3:processo>` +
            `<ns2:dadosBasicos numero="${numero}" classeProcessual="${processo.classe}" codigoLocalidade="1" nivelSigilo="0" dataAjuizamento="20240312101500">` +
            `<ns2:polo polo="AT"><ns2:parte><ns2:pessoa nome="PARTE AUTORA SIMULADA" sexo="D" tipoPessoa="juridica"/></ns2:parte></ns2:polo>` +
            `<ns2:assunto><ns2:codigoNacional>7619</ns2:codigoNacional></ns2:assunto>` +
            `<ns2:orgaoJulgador codigoOrgao="1" nomeOrgao="${esc(processo.orgao)}" instancia="ORIG" codigoMunicipioIBGE="1500800"/>` +
            `</ns2:dadosBasicos>${movimentos}</ns3:processo>`,
        ),
      };
    }

    if (operacao === "consultarTeorComunicacao") {
      return {
        status: 200,
        corpo: embrulhar(
          operacao,
          `<ns3:sucesso>true</ns3:sucesso><ns3:mensagem>OK</ns3:mensagem>` +
            `<ns3:comunicacao id="${esc(campo(xml, "identificadorAviso"))}" prazo="15" tipoPrazo="D"><ns2:destinatario/><ns2:processo>${numero}</ns2:processo>` +
            `<ns2:teor>Teor simulado da intimação.</ns2:teor></ns3:comunicacao>`,
        ),
      };
    }

    return {
      status: 500,
      corpo: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><soap:Fault><faultstring>Operação ${esc(operacao)} desconhecida</faultstring></soap:Fault></soap:Body></soap:Envelope>`,
    };
  };
}
