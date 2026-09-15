import crypto from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const TAMANHO = 64;

function scrypt(senha: string, sal: Buffer, tamanho: number, n = N, r = R, p = P) {
  return new Promise<Buffer>((ok, falha) =>
    crypto.scrypt(senha, sal, tamanho, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (erro, chave) => (erro ? falha(erro) : ok(chave))),
  );
}

/** Formato: scrypt$N$r$p$sal$hash (base64). Guarda os parâmetros para poder endurecer depois. */
export async function hashSenha(senha: string) {
  const sal = crypto.randomBytes(16);
  const hash = await scrypt(senha, sal, TAMANHO);
  return `scrypt$${N}$${R}$${P}$${sal.toString("base64")}$${hash.toString("base64")}`;
}

/** Sem hash guardado, calcula mesmo assim: o tempo de resposta não revela se o e-mail existe. */
export async function conferirSenha(senha: string, guardado: string | null | undefined) {
  const partes = (guardado ?? "").split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") {
    await scrypt(senha, Buffer.from("sal-ficticio-wlaw"), TAMANHO);
    return false;
  }
  const [, n, r, p, sal, hash] = partes;
  const esperado = Buffer.from(hash, "base64");
  const calculado = await scrypt(senha, Buffer.from(sal, "base64"), esperado.length, Number(n), Number(r), Number(p));
  return calculado.length === esperado.length && crypto.timingSafeEqual(calculado, esperado);
}

export function problemaNaSenha(senha: string, email = "") {
  if (senha.length < 10) return "A senha precisa de pelo menos 10 caracteres.";
  if (senha.length > 200) return "A senha pode ter no máximo 200 caracteres.";
  if (!/\p{L}/u.test(senha) || !/\d/.test(senha)) return "Use letras e números na senha.";
  const usuario = email.split("@")[0]?.toLowerCase() ?? "";
  if (usuario.length >= 4 && senha.toLowerCase().includes(usuario)) return "A senha não pode conter o seu e-mail.";
  return null;
}

export const novoToken = () => crypto.randomBytes(32).toString("base64url");
export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export function iguaisEmTempoConstante(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
