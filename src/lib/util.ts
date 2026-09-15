export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const brlCurto = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function paraData(br: string) {
  const [d, m, a] = br.slice(0, 10).split("/").map(Number);
  return new Date(a || 2026, (m || 1) - 1, d || 1);
}

const FUSO = "America/Belem";

/** Hoje no fuso do escritório, à meia-noite local. Calculado a cada chamada: o servidor fica dias no ar. */
export function hoje() {
  const [a, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date()).split("-").map(Number);
  return new Date(a, m - 1, d);
}

export const hojeBR = () => hoje().toLocaleDateString("pt-BR");

export function atrasado(fatal: string) {
  return paraData(fatal) < hoje();
}

export function diasAte(fatal: string) {
  return Math.round((paraData(fatal).getTime() - hoje().getTime()) / 86_400_000);
}

export function horas(minutos: number) {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

export function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function contem(campos: (string | number | null | undefined)[], busca: string) {
  if (!busca) return true;
  const alvo = normalizar(campos.filter(Boolean).join(" | "));
  return normalizar(busca)
    .split(/\s+/)
    .every((termo) => alvo.includes(termo));
}

export function iniciais(nome: string) {
  return nome.split(" ").filter((p) => p.length > 2).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
