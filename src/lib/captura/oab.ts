export type Oab = { numero: string; uf: string };

const UFS = new Set([
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB",
  "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
]);

const soDigitos = (s: string) => s.replace(/\D/g, "").replace(/^0+/, "");

/** Aceita "OAB/PA 28.114", "28.114/PA", "PA28114", "9124PA", "28114-A PA". */
export function lerOab(texto: string): Oab | null {
  const t = texto.toUpperCase();
  const uf = [...t.matchAll(/(?<![A-Z])([A-Z]{2})(?![A-Z])/g)].map((m) => m[1]).find((s) => UFS.has(s));
  const numero = soDigitos(t.match(/\d[\d.]*/)?.[0] ?? "");
  return uf && numero ? { numero, uf } : null;
}

export const rotuloOab = (o: Oab) => `${o.numero}/${o.uf}`;

/** Cada tribunal grava a OAB de um jeito no DJEN; consultamos as formas comuns e filtramos depois. */
export function variantesOab(o: Oab) {
  const pontuado = o.numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return [...new Set([o.numero, `${o.numero}${o.uf}`, pontuado])];
}

/** Verdadeiro só quando a OAB normalizada (número + UF) bate exatamente. */
export function mesmaOab(numeroBruto: string, ufBruta: string, alvo: Oab) {
  return soDigitos(numeroBruto) === alvo.numero && ufBruta.trim().toUpperCase() === alvo.uf;
}
