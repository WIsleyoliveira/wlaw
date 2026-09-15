import type { Config, Feriado } from "./tipos";
import { paraData } from "./util";

export const dataBR = (d: Date) => d.toLocaleDateString("pt-BR");

export type Peca = { peca: string; dias: number; uteis: boolean; base: string };

/** Providências com prazo legal conhecido. A IA escolhe a peça; a contagem é sempre feita aqui. */
export const PECAS: Peca[] = [
  { peca: "Apelação", dias: 15, uteis: true, base: "art. 1.003, § 5º, do CPC" },
  { peca: "Embargos de declaração", dias: 5, uteis: true, base: "art. 1.023 do CPC" },
  { peca: "Agravo de instrumento", dias: 15, uteis: true, base: "art. 1.003, § 5º, do CPC" },
  { peca: "Agravo interno", dias: 15, uteis: true, base: "art. 1.070 do CPC" },
  { peca: "Recurso especial ou extraordinário", dias: 15, uteis: true, base: "art. 1.003, § 5º, do CPC" },
  { peca: "Agravo em recurso especial ou extraordinário", dias: 15, uteis: true, base: "art. 1.042 do CPC" },
  { peca: "Contrarrazões", dias: 15, uteis: true, base: "art. 1.010, § 1º, do CPC" },
  { peca: "Contestação", dias: 15, uteis: true, base: "art. 335 do CPC" },
  { peca: "Réplica", dias: 15, uteis: true, base: "art. 351 do CPC" },
  { peca: "Manifestação sobre laudo pericial", dias: 15, uteis: true, base: "art. 477, § 1º, do CPC" },
  { peca: "Impugnação ao cumprimento de sentença", dias: 15, uteis: true, base: "art. 525 do CPC" },
  { peca: "Pagamento voluntário da condenação", dias: 15, uteis: true, base: "art. 523 do CPC" },
  { peca: "Recurso inominado", dias: 10, uteis: true, base: "arts. 12-A e 42 da Lei 9.099/95" },
  { peca: "Recurso ordinário trabalhista", dias: 8, uteis: true, base: "arts. 775 e 895 da CLT" },
  { peca: "Recurso eleitoral", dias: 3, uteis: false, base: "art. 258 do Código Eleitoral" },
  { peca: "Manifestação simples", dias: 5, uteis: true, base: "art. 218, § 3º, do CPC" },
];

/** Peças que fazem sentido no ramo — evita, por exemplo, recurso ordinário trabalhista na Justiça Estadual. */
export function pecasCabiveis(ramo: string, juizado: boolean) {
  if (ramo === "não identificado") return PECAS;
  return PECAS.filter(({ peca }) => {
    if (peca === "Recurso ordinário trabalhista") return ramo === "Justiça do Trabalho";
    if (peca === "Recurso eleitoral") return ramo === "Justiça Eleitoral";
    if (peca === "Recurso inominado") return juizado;
    if (peca === "Apelação") return !juizado && ramo !== "Justiça do Trabalho" && ramo !== "Justiça Eleitoral";
    return true;
  });
}

export const AUDIENCIA = "Comparecer a audiência ou sessão";
export const SEM_PRAZO = "Apenas ciência (sem prazo)";

const RAMOS: Record<string, string> = {
  "1": "STF", "2": "CNJ", "3": "STJ", "4": "Justiça Federal", "5": "Justiça do Trabalho",
  "6": "Justiça Eleitoral", "7": "Justiça Militar da União", "8": "Justiça Estadual", "9": "Justiça Militar Estadual",
};

/** Segmento J do número CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO). */
export function ramoDoNumero(numero: string) {
  const d = numero.replace(/\D/g, "");
  return (d.length === 20 && RAMOS[d[13]]) || "não identificado";
}

export type RegrasPrazo = { feriados: Map<string, string>; art220: boolean };

export function regrasDe(config: Config, feriados: Feriado[], ramo = ""): RegrasPrazo {
  return {
    feriados: new Map(feriados.map((f) => [f.data.slice(0, 10), f.nome])),
    // Prazos eleitorais não se suspendem no recesso.
    art220: config.art220 !== "Não aplicar" && ramo !== "Justiça Eleitoral",
  };
}

/* Só entram automaticamente os dias certamente sem expediente forense. Na dúvida, o dia conta —
   errar para antes é seguro, errar para depois perde prazo. O resto vem do cadastro de feriados. */
const FIXOS: Record<string, string> = {
  "01/01": "Confraternização Universal", "21/04": "Tiradentes", "01/05": "Dia do Trabalho",
  "07/09": "Independência do Brasil", "12/10": "Nossa Senhora Aparecida", "02/11": "Finados",
  "15/11": "Proclamação da República", "20/11": "Consciência Negra", "25/12": "Natal",
};

function pascoa(ano: number) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/** Motivo de o dia não ter expediente, ou null se for dia útil. */
export function semExpediente(d: Date, r: RegrasPrazo): string | null {
  if (d.getDay() === 0 || d.getDay() === 6) return "fim de semana";
  const chave = dataBR(d);
  const cadastrado = r.feriados.get(chave) ?? FIXOS[chave.slice(0, 5)];
  if (cadastrado) return cadastrado;
  const sexta = pascoa(d.getFullYear());
  sexta.setDate(sexta.getDate() - 2);
  return dataBR(sexta) === chave ? "Sexta-feira Santa" : null;
}

export const emRecesso = (d: Date) =>
  (d.getMonth() === 11 && d.getDate() >= 20) || (d.getMonth() === 0 && d.getDate() <= 20);

/** Conta o prazo a partir da publicação: exclui o dia do começo e prorroga vencimento sem expediente (arts. 219, 220 e 224 do CPC). */
export function calcularPrazo(publicacao: string, dias: number, uteis: boolean, r: RegrasPrazo) {
  const d = paraData(publicacao);
  const feriados = new Set<string>();
  let suspenso = false;

  const naoConta = (dia: Date, exigeUtil: boolean) => {
    if (r.art220 && emRecesso(dia)) {
      suspenso = true;
      return true;
    }
    if (!exigeUtil) return false;
    const motivo = semExpediente(dia, r);
    if (motivo && motivo !== "fim de semana") feriados.add(`${dataBR(dia)} (${motivo})`);
    return motivo !== null;
  };

  for (let restam = dias; restam > 0; ) {
    d.setDate(d.getDate() + 1);
    if (!naoConta(d, uteis)) restam--;
  }
  while (naoConta(d, true)) d.setDate(d.getDate() + 1);

  return { fatal: dataBR(d), feriados: [...feriados], suspenso };
}

/** Recua N dias úteis a partir do fatal, sem passar do dia da publicação. */
export function recuarDiasUteis(fatal: string, n: number, publicacao: string, r: RegrasPrazo) {
  const d = paraData(fatal);
  const limite = paraData(publicacao);
  for (let restam = n; restam > 0; ) {
    const anterior = new Date(d);
    anterior.setDate(anterior.getDate() - 1);
    if (anterior <= limite) break;
    d.setTime(anterior.getTime());
    if (!semExpediente(d, r)) restam--;
  }
  return dataBR(d);
}

/** A prevista nunca fica no passado; e um fatal já vencido precisa aparecer, não ser escondido. */
export function ajustarAoHoje(prevista: string, fatal: string, hoje: Date) {
  const avisos: string[] = [];
  if (paraData(fatal) < hoje) {
    avisos.push(`O prazo fatal (${fatal}) já passou. Confira a publicação e se ainda cabe alguma providência.`);
    return { prevista, avisos };
  }
  if (paraData(prevista) < hoje) {
    const ajustada = dataBR(hoje);
    avisos.push(`Prazo curto: a margem de segurança já passou, então a data prevista foi ajustada para hoje (${ajustada}).`);
    return { prevista: ajustada, avisos };
  }
  return { prevista, avisos };
}

export const margemDias = (config: Config) => Number(config.margem.match(/(\d+)\s*dias?/)?.[1] ?? 0);

/** Prazo escrito no próprio teor ("no prazo comum de 10 (dez) dias"). */
export function extrairPrazoDoTexto(teor: string) {
  const m = teor.match(/prazo[^.;]{0,60}?\b(\d{1,3})\s*(?:\([^)]{1,40}\)\s*)?dias?\b(?:\s+(úteis|uteis|corridos))?/i);
  if (!m) return null;
  return { dias: Number(m[1]), uteis: m[2] ? !/corridos/i.test(m[2]) : null, trecho: m[0] };
}

export const extrairData = (teor: string) => teor.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0] ?? null;
