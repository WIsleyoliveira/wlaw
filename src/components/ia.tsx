"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";
import { IconAlert, IconRefresh, IconSpark } from "@/components/icons";

type Mensagem = { role: "user" | "assistant"; content: string; interrompida?: boolean };

type Status = {
  online: boolean;
  url: string;
  modelo: string;
  instalado: boolean;
  processo: { id: string; pasta: string; titulo: string } | null;
};

type Ctx = {
  aberto: boolean;
  abrir: (processoId?: string | null, pergunta?: string) => void;
  fechar: () => void;
};

const IAContexto = createContext<Ctx>({ aberto: false, abrir: () => {}, fechar: () => {} });
export const useIA = () => useContext(IAContexto);

const SUGESTOES_GERAIS = [
  "Quais prazos vencem esta semana?",
  "Quais processos estão parados há mais tempo?",
  "Resuma a carteira ativa por área.",
  "Que intimações estão pendentes e o que fazer com cada uma?",
];

const SUGESTOES_PROCESSO = [
  "Qual o próximo passo e até quando?",
  "Quais são os riscos deste caso?",
  "Monte uma linha do tempo dos fatos relevantes.",
  "Redija um e-mail curto ao cliente atualizando o andamento.",
];

const ARMAZENAMENTO = "wlaw-ia-conversas";

/** Lê o texto que a rota /api/ia devolve em partes, avisando o acumulado a cada pedaço. */
export async function lerFluxo(r: Response, aoReceber: (acumulado: string) => void) {
  const leitor = r.body!.getReader();
  const dec = new TextDecoder();
  let acumulado = "";
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    acumulado += dec.decode(value, { stream: true });
    aoReceber(acumulado);
  }
  return acumulado;
}

function negritos(linha: string) {
  return linha.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.length > 4 && parte.startsWith("**") && parte.endsWith("**") ? (
      <strong key={i} className="font-semibold">{parte.slice(2, -2)}</strong>
    ) : (
      parte
    ),
  );
}

/** Markdown enxuto (parágrafos, listas, negrito, títulos) sem injetar HTML. */
export function TextoIA({ texto, className }: { texto: string; className?: string }) {
  const blocos: React.ReactNode[] = [];
  const estado: { lista: { ordenada: boolean; itens: string[] } | null } = { lista: null };

  const fecharLista = () => {
    const lista = estado.lista;
    if (!lista) return;
    const Tag = lista.ordenada ? "ol" : "ul";
    blocos.push(
      <Tag key={blocos.length} className={cx("space-y-1 pl-4", lista.ordenada ? "list-decimal" : "list-disc")}>
        {lista.itens.map((item, i) => <li key={i}>{negritos(item)}</li>)}
      </Tag>,
    );
    estado.lista = null;
  };

  for (const bruta of texto.split("\n")) {
    const linha = bruta.trim();
    const marcador = linha.match(/^[-*•]\s+(.*)$/);
    const numero = linha.match(/^\d+[.)]\s+(.*)$/);
    if (marcador || numero) {
      const ordenada = !marcador;
      if (estado.lista && estado.lista.ordenada !== ordenada) fecharLista();
      estado.lista ??= { ordenada, itens: [] };
      estado.lista.itens.push((marcador ?? numero)![1]);
      continue;
    }
    fecharLista();
    if (!linha) continue;
    const titulo = linha.match(/^#{1,4}\s+(.*)$/);
    blocos.push(
      <p key={blocos.length} className={titulo ? "font-semibold" : undefined}>
        {negritos(titulo ? titulo[1] : linha)}
      </p>,
    );
  }
  fecharLista();

  return <div className={cx("space-y-2", className)}>{blocos}</div>;
}

function processoDaRota(pathname: string) {
  const m = pathname.match(/^\/processos\/([^/]+)$/);
  return m && m[1] !== "novo" ? m[1] : null;
}

function conversasSalvas(): Record<string, Mensagem[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(ARMAZENAMENTO) ?? "{}");
  } catch {
    return {};
  }
}

export function ProvedorIA({ children }: { children: React.ReactNode }) {
  const processoRota = processoDaRota(usePathname());
  const [aberto, setAberto] = useState(false);
  const [processoId, setProcessoId] = useState<string | null>(null);
  const [conversas, setConversas] = useState<Record<string, Mensagem[]>>(conversasSalvas);
  const [entrada, setEntrada] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [copiada, setCopiada] = useState<number | null>(null);
  const controle = useRef<AbortController | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  const chave = processoId ?? "geral";
  const mensagens = conversas[chave] ?? [];
  const sugestoes = processoId ? SUGESTOES_PROCESSO : SUGESTOES_GERAIS;
  const indisponivel = status && (!status.online || !status.instalado);

  useEffect(() => {
    try {
      sessionStorage.setItem(ARMAZENAMENTO, JSON.stringify(conversas));
    } catch {
      /* navegação privada — segue sem guardar */
    }
  }, [conversas]);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversas, chave, pensando]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  const definir = (k: string, lista: Mensagem[]) => setConversas((c) => ({ ...c, [k]: lista }));

  function consultarStatus(id: string | null) {
    fetch(`/api/ia/status${id ? `?processoId=${encodeURIComponent(id)}` : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }

  function mudarContexto(id: string | null) {
    setProcessoId(id);
    setErro(null);
    consultarStatus(id);
  }

  function abrir(id?: string | null, pergunta?: string) {
    // Sem processo explícito, a IA usa o processo aberto na tela (se houver).
    const alvo = id === undefined ? processoRota : id;
    mudarContexto(alvo);
    setAberto(true);
    if (pergunta) enviar(pergunta, alvo);
    else setTimeout(() => campo.current?.focus(), 60);
  }

  async function enviar(textoBruto: string, alvo: string | null = processoId, base?: Mensagem[]) {
    const limpo = textoBruto.trim();
    if (!limpo || pensando) return;

    const k = alvo ?? "geral";
    const historico: Mensagem[] = [...(base ?? conversas[k] ?? []), { role: "user", content: limpo }];
    definir(k, historico);
    setEntrada("");
    if (campo.current) campo.current.style.height = "";
    setPensando(true);
    setErro(null);

    const ac = new AbortController();
    controle.current = ac;
    let acumulado = "";

    try {
      const r = await fetch("/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processoId: alvo, mensagens: historico.map(({ role, content }) => ({ role, content })) }),
        signal: ac.signal,
      });
      if (!r.ok || !r.body) {
        setErro(await r.text());
        return;
      }
      await lerFluxo(r, (acc) => {
        acumulado = acc;
        definir(k, [...historico, { role: "assistant", content: acc }]);
      });
    } catch {
      if (ac.signal.aborted) definir(k, [...historico, { role: "assistant", content: acumulado, interrompida: true }]);
      else setErro("Falha de conexão com a IA local.");
    } finally {
      setPensando(false);
      controle.current = null;
    }
  }

  function refazer() {
    const ultimaPergunta = mensagens.findLastIndex((m) => m.role === "user");
    if (ultimaPergunta < 0) return;
    enviar(mensagens[ultimaPergunta].content, processoId, mensagens.slice(0, ultimaPergunta));
  }

  function copiar(i: number, conteudo: string) {
    navigator.clipboard
      ?.writeText(conteudo)
      .then(() => {
        setCopiada(i);
        setTimeout(() => setCopiada(null), 1500);
      })
      .catch(() => {});
  }

  const rotuloContexto = processoId
    ? status?.processo
      ? `${status.processo.pasta} · ${status.processo.titulo}`
      : "Processo aberto"
    : "Escritório inteiro";

  return (
    <IAContexto.Provider value={{ aberto, abrir, fechar: () => setAberto(false) }}>
      {children}

      {aberto && (
        <>
          <div className="fixed inset-0 z-40 bg-ink-950/20 backdrop-blur-[1px]" onClick={() => setAberto(false)} />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-ink-200 bg-white shadow-2xl">
            <header className="border-b border-ink-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-950">
                  <IconSpark className="h-4 w-4 text-gold-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] font-semibold leading-tight">Wlaw IA</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-ink-500">
                    <span
                      className={cx(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        !status ? "bg-ink-200" : indisponivel ? "bg-danger" : "bg-ok",
                      )}
                    />
                    <span className="truncate">{status ? `${status.modelo} · local` : "verificando…"}</span>
                  </p>
                </div>
                <button
                  onClick={() => definir(chave, [])}
                  disabled={pensando || mensagens.length === 0}
                  className="rounded-lg px-2 py-1 text-[12px] text-ink-500 hover:bg-ink-100 disabled:opacity-40"
                >
                  Limpar
                </button>
                <button
                  onClick={() => setAberto(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-400">Contexto</span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink-900">{rotuloContexto}</span>
                {(processoRota || processoId) && (
                  <button
                    onClick={() => mudarContexto(processoId ? null : processoRota)}
                    disabled={pensando}
                    className="shrink-0 text-[12px] font-medium text-gold-600 hover:underline disabled:opacity-40"
                  >
                    {processoId ? "Ver escritório" : "Usar processo aberto"}
                  </button>
                )}
              </div>
            </header>

            <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {indisponivel && (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-snug text-warn">
                  <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    {!status.online ? (
                      <>O Ollama não respondeu em {status.url}. Abra o aplicativo do Ollama ou rode <code className="font-mono">ollama serve</code>.</>
                    ) : (
                      <>O modelo <strong>{status.modelo}</strong> não está instalado. Rode <code className="font-mono">ollama pull {status.modelo}</code> ou troque em Configurações → Inteligência artificial.</>
                    )}
                  </p>
                </div>
              )}

              {mensagens.length === 0 && (
                <div className="space-y-3">
                  <p className="text-[13px] leading-relaxed text-ink-500">
                    {processoId
                      ? "Pergunte sobre este processo: andamentos, prazos, riscos, próximos passos ou peça um texto."
                      : "Pergunte sobre prazos, carteira, intimações ou financeiro do escritório."}{" "}
                    Tudo roda no seu computador — nenhum dado sai daqui.
                  </p>
                  <div className="space-y-1.5">
                    {sugestoes.map((s) => (
                      <button
                        key={s}
                        onClick={() => enviar(s)}
                        className="block w-full rounded-lg border border-ink-200 px-3 py-2 text-left text-[13px] text-ink-700 hover:border-gold-400 hover:bg-gold-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mensagens.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="ml-auto max-w-[88%] whitespace-pre-wrap rounded-xl bg-ink-950 px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
                    {m.content}
                  </div>
                ) : (
                  <div key={i} className="group max-w-[94%]">
                    <div className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-900">
                      {m.content ? <TextoIA texto={m.content} /> : <span className="text-ink-400">…</span>}
                      {m.interrompida && <p className="mt-2 text-[11px] text-ink-400">Resposta interrompida.</p>}
                    </div>
                    {m.content && !(pensando && i === mensagens.length - 1) && (
                      <div className="mt-1 flex gap-1 pl-1 text-[11px] text-ink-400">
                        <button onClick={() => copiar(i, m.content)} className="rounded px-1.5 py-0.5 hover:bg-ink-100 hover:text-ink-700">
                          {copiada === i ? "Copiado" : "Copiar"}
                        </button>
                        {i === mensagens.length - 1 && (
                          <button onClick={refazer} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-ink-100 hover:text-ink-700">
                            <IconRefresh className="h-3 w-3" /> Refazer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ),
              )}

              {pensando && mensagens.at(-1)?.role === "user" && (
                <div className="flex items-center gap-2 text-[12px] text-ink-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-400" />
                  lendo os dados e consultando o modelo local…
                </div>
              )}

              {erro && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-danger">{erro}</p>
              )}

              <div ref={fim} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar(entrada);
              }}
              className="border-t border-ink-200 p-3"
            >
              <div className="flex items-end gap-2 rounded-xl border border-ink-200 p-2 focus-within:border-gold-400">
                <textarea
                  ref={campo}
                  value={entrada}
                  onChange={(e) => {
                    setEntrada(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviar(entrada);
                    }
                  }}
                  rows={1}
                  placeholder={processoId ? "Pergunte sobre este processo…" : "Pergunte sobre o escritório…"}
                  className="max-h-32 flex-1 resize-none bg-transparent px-1 py-1 text-[13px] outline-none placeholder:text-ink-400"
                />
                {pensando ? (
                  <button
                    type="button"
                    onClick={() => controle.current?.abort()}
                    className="h-8 rounded-lg border border-ink-200 px-3 text-[13px] font-semibold text-ink-900 hover:border-ink-400"
                  >
                    Parar
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!entrada.trim()}
                    className="h-8 rounded-lg bg-gold-400 px-3 text-[13px] font-semibold text-ink-950 disabled:bg-ink-100 disabled:text-ink-400"
                  >
                    Enviar
                  </button>
                )}
              </div>
              <p className="mt-1.5 px-1 text-[10px] text-ink-400">Enter envia · Shift+Enter quebra linha · a IA pode errar: confira antes de agir.</p>
            </form>
          </aside>
        </>
      )}
    </IAContexto.Provider>
  );
}

/** Botão que abre o painel — usado na topbar e nas fichas. */
export function BotaoIA({
  processoId,
  pergunta,
  children,
  className,
}: {
  processoId?: string | null;
  pergunta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { abrir } = useIA();
  return (
    <button onClick={() => abrir(processoId, pergunta)} className={className}>
      {children}
    </button>
  );
}
