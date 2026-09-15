// Roda os testes com o TypeScript nativo do Node, sem ferramenta extra.
// Copia src/lib para .testes/, ajusta imports (extensão .ts, alias @/lib, server-only) e executa node --test.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const raiz = process.cwd();
const destino = join(raiz, ".testes");
rmSync(destino, { recursive: true, force: true });
cpSync(join(raiz, "src", "lib"), join(destino, "lib"), { recursive: true });
cpSync(join(raiz, "testes"), join(destino, "testes"), { recursive: true });

function comExtensao(arquivo, especificador) {
  const alvo = join(dirname(arquivo), especificador);
  if (existsSync(`${alvo}.ts`)) return `${especificador}.ts`;
  if (existsSync(join(alvo, "index.ts"))) return `${especificador}/index.ts`;
  return especificador;
}

function reescrever(pasta) {
  for (const nome of readdirSync(pasta)) {
    const arquivo = join(pasta, nome);
    if (statSync(arquivo).isDirectory()) {
      reescrever(arquivo);
      continue;
    }
    if (!arquivo.endsWith(".ts")) continue;
    let codigo = readFileSync(arquivo, "utf8").replace(/^import "server-only";\n/m, "");
    codigo = codigo.replace(/from "@\/lib\/([^"]+)"/g, (_, caminho) => {
      let rel = relative(dirname(arquivo), join(destino, "lib", caminho));
      if (!rel.startsWith(".")) rel = `./${rel}`;
      return `from "${rel}"`;
    });
    codigo = codigo.replace(/from "(next\/(?:cache|navigation|server|headers)|react)"/g, (_, modulo) => {
      let rel = relative(dirname(arquivo), join(destino, "stubs", `${modulo.replace("/", "-")}.ts`));
      if (!rel.startsWith(".")) rel = `./${rel}`;
      return `from "${rel}"`;
    });
    codigo = codigo.replace(/from "(\.{1,2}\/[^"]+)"/g, (inteiro, esp) => (esp.endsWith(".ts") ? inteiro : `from "${comExtensao(arquivo, esp)}"`));
    writeFileSync(arquivo, codigo);
  }
}
// Stubs do Next para rodar Server Actions fora do servidor.
const STUBS = {
  "next/cache": "export const revalidatePath = (..._args: unknown[]) => {};\n",
  "next/navigation":
    "export class Redirecionado extends Error {\n  destino: string;\n  constructor(destino: string) {\n    super(`redirect para ${destino}`);\n    this.destino = destino;\n  }\n}\nexport function redirect(destino: string): never {\n  throw new Redirecionado(destino);\n}\n",
  "next/server": "export async function connection() {}\n",
  // Cookies e cabeçalhos em memória: os testes leem e trocam via globalThis.__wlawCookies / __wlawCabecalhos.
  "next/headers":
    "const g = globalThis as unknown as { __wlawCookies?: Map<string, string>; __wlawCabecalhos?: Map<string, string> };\nconst jarra = (g.__wlawCookies ??= new Map());\nconst cabecalhos = (g.__wlawCabecalhos ??= new Map([[\"user-agent\", \"teste\"], [\"x-forwarded-for\", \"10.0.0.1\"], [\"host\", \"localhost:3100\"]]));\nexport async function cookies() {\n  return {\n    get: (nome: string) => (jarra.has(nome) ? { name: nome, value: jarra.get(nome) as string } : undefined),\n    has: (nome: string) => jarra.has(nome),\n    set: (nome: string, valor: string) => void jarra.set(nome, valor),\n    delete: (nome: string) => void jarra.delete(nome),\n  };\n}\nexport async function headers() {\n  return { get: (nome: string) => cabecalhos.get(nome.toLowerCase()) ?? null };\n}\n",
  // Fora do React Server Components o cache() não memoriza; nos testes cada chamada consulta de novo.
  react: "export const cache = <T extends (...args: never[]) => unknown>(fn: T) => fn;\n",
};
mkdirSync(join(destino, "stubs"), { recursive: true });
for (const [modulo, codigo] of Object.entries(STUBS)) writeFileSync(join(destino, "stubs", `${modulo.replace("/", "-")}.ts`), codigo);

reescrever(destino);

// Variáveis do .env (DATABASE_URL, chave mestra) para os testes de integração.
const env = { ...process.env };
if (existsSync(join(raiz, ".env"))) {
  for (const linha of readFileSync(join(raiz, ".env"), "utf8").split("\n")) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in env)) env[m[1]] = m[2];
  }
}

const filtro = process.argv.slice(2);
const arquivos = readdirSync(join(destino, "testes"))
  .filter((n) => n.endsWith(".test.ts") && (filtro.length === 0 || filtro.some((f) => n.includes(f))))
  .map((n) => join(destino, "testes", n));

const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "--test", "--test-concurrency=1", ...arquivos], {
  stdio: "inherit",
  env,
});
process.exit(r.status ?? 1);
