import { formatarCnj, tribunalDoCnj, ufDoCnj } from "../cnj";
import type { ItemDjen } from "./djen";

export type DadosProcessoDjen = {
  encontrado: boolean;
  numero: string;
  tribunal: string | null;
  orgao: string;
  classe: string;
  comarca: string;
  partes: { nome: string; polo: string }[];
  advogados: { nome: string; oab: string }[];
  publicacoes: number;
  ultimaPublicacao: string | null;
  erro?: string;
};

const CONECTIVOS = new Set(["de", "da", "do", "das", "dos", "e", "em", "a", "o"]);

/** "PROCEDIMENTO COMUM CíVEL" → "Procedimento Comum Cível" */
export function tituloProprio(texto: string) {
  return texto
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i) => (i > 0 && CONECTIVOS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/** Palavras que aparecem depois de "de" no nome do órgão sem ser cidade. */
const NAO_CIDADE = /^(fazenda|fam[íi]lia|justi[çc]a|execu[çc][õo]es|trabalho|direito|sucess[õo]es|inf[âa]ncia|registros|fal[êe]ncias|recupera|entorpecentes|viol[êe]ncia|acidentes|tr[âa]nsito|meio|com[ée]rcio|consumo|turma|c[âa]mara|se[çc][ãa]o|gabinete)/i;

/** "2ª Vara Cível e Empresarial de Ananindeua" → "Ananindeua - PA". Vazio quando não dá para ter certeza. */
export function comarcaDoOrgao(orgao: string, uf: string | null) {
  // Varas costumam terminar em "de <cidade>"; a cidade pode ter "do"/"da" ("São João do Araguaia").
  const posicao = orgao.lastIndexOf(" de ");
  const cidade = posicao >= 0 ? orgao.slice(posicao + 4).trim() : "";
  if (!/^[A-ZÀ-Ú]/.test(cidade)) return "";
  if (!cidade || /\d/.test(cidade) || NAO_CIDADE.test(cidade)) return "";
  return uf ? `${cidade} - ${uf}` : cidade;
}

const POLO: Record<string, string> = { A: "Polo ativo", P: "Polo passivo" };

export function resumirProcessoDjen(numero: string, itens: ItemDjen[]): DadosProcessoDjen {
  const base: DadosProcessoDjen = {
    encontrado: false,
    numero: formatarCnj(numero),
    tribunal: tribunalDoCnj(numero),
    orgao: "",
    classe: "",
    comarca: "",
    partes: [],
    advogados: [],
    publicacoes: 0,
    ultimaPublicacao: null,
  };
  const validos = itens.filter((i) => i.ativo !== false);
  if (validos.length === 0) return base;

  const recente = [...validos].sort((a, b) => b.data_disponibilizacao.localeCompare(a.data_disponibilizacao))[0];
  const partes = new Map<string, { nome: string; polo: string }>();
  const advogados = new Map<string, { nome: string; oab: string }>();
  for (const item of validos) {
    for (const d of item.destinatarios ?? []) {
      const nome = d.nome.trim();
      if (nome && !partes.has(nome)) partes.set(nome, { nome, polo: POLO[d.polo] ?? "Parte" });
    }
    for (const { advogado } of item.destinatarioadvogados ?? []) {
      const oab = `${advogado.numero_oab.replace(/\D/g, "")}/${advogado.uf_oab}`;
      if (!advogados.has(oab)) advogados.set(oab, { nome: advogado.nome, oab });
    }
  }

  return {
    ...base,
    encontrado: true,
    orgao: recente.nomeOrgao ?? "",
    classe: tituloProprio(recente.nomeClasse ?? ""),
    comarca: comarcaDoOrgao(recente.nomeOrgao ?? "", ufDoCnj(numero)),
    partes: [...partes.values()],
    advogados: [...advogados.values()],
    publicacoes: validos.length,
    ultimaPublicacao: recente.data_disponibilizacao.slice(0, 10).split("-").reverse().join("/"),
  };
}
