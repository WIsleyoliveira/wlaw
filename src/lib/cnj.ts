/** Numeração única do CNJ (Resolução 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO */

const UF_POR_CODIGO = [
  "", "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SE", "SP", "TO",
];

export const digitosCnj = (numero: string) => numero.replace(/\D/g, "");

export function formatarCnj(numero: string) {
  const d = digitosCnj(numero);
  if (d.length !== 20) return numero;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d[13]}.${d.slice(14, 16)}.${d.slice(16)}`;
}

/** Confere o dígito verificador (módulo 97, ISO 7064). */
export function cnjValido(numero: string) {
  const d = digitosCnj(numero);
  if (d.length !== 20) return false;
  const resto = BigInt(`${d.slice(0, 7)}${d.slice(9)}00`) % BigInt(97);
  return BigInt(98) - resto === BigInt(d.slice(7, 9));
}

/** Tribunal na grafia do cadastro (TJ-PA, TRT-8, TRF1, TRE-PA, STJ…), deduzido de J.TR. */
export function tribunalDoCnj(numero: string): string | null {
  const d = digitosCnj(numero);
  if (d.length !== 20) return null;
  const codigo = Number(d.slice(14, 16));
  const uf = UF_POR_CODIGO[codigo];
  switch (d[13]) {
    case "1":
      return "STF";
    case "3":
      return "STJ";
    case "4":
      return codigo ? `TRF${codigo}` : null;
    case "5":
      return codigo === 0 ? "TST" : `TRT-${codigo}`;
    case "6":
      return codigo === 0 ? "TSE" : uf ? `TRE-${uf}` : null;
    case "7":
      return "STM";
    case "8":
      return uf ? `TJ-${uf}` : null;
    case "9":
      return uf ? `TJM-${uf}` : null;
    default:
      return null;
  }
}

/** UF do tribunal, quando o segmento é estadual ou eleitoral. */
export function ufDoCnj(numero: string): string | null {
  const d = digitosCnj(numero);
  return d.length === 20 && ["6", "8", "9"].includes(d[13]) ? UF_POR_CODIGO[Number(d.slice(14, 16))] || null : null;
}
