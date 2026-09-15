"use client";

import { useState, useTransition } from "react";
import { Badge, cx } from "@/components/ui";
import { alternarUsuario } from "@/lib/acoes";
import { encerrarSessoesDoUsuario, gerarLinkAcesso, mudarPerfil } from "@/lib/auth/acoes";
import { type Acao, PERFIS, PERMISSOES } from "@/lib/permissoes";
import type { Usuario } from "@/lib/tipos";
import { iniciais } from "@/lib/util";

type Aviso = { ok: boolean; texto: string; link?: string; expiraEm?: string };

const botao = "h-8 rounded-lg border border-ink-200 px-2.5 text-[12px] font-medium text-ink-700 hover:border-ink-400 disabled:opacity-50";

export function ListaEquipe({ usuarios, usuarioLogadoId }: { usuarios: Usuario[]; usuarioLogadoId: string }) {
  const [pendente, iniciar] = useTransition();
  const [avisos, setAvisos] = useState<Record<string, Aviso>>({});
  const [copiado, setCopiado] = useState<string | null>(null);
  const avisar = (id: string, aviso: Aviso) => setAvisos((a) => ({ ...a, [id]: aviso }));

  return (
    <ul className="divide-y divide-ink-200">
      {usuarios.map((u) => {
        const souEu = u.id === usuarioLogadoId;
        const aviso = avisos[u.id];
        const acesso = !u.ativo ? { tone: "neutral" as const, texto: "Inativo" } : u.temSenha ? { tone: "ok" as const, texto: "Senha criada" } : { tone: "warn" as const, texto: "Sem senha" };
        return (
          <li key={u.id} className="px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-3">
              <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-semibold", u.ativo ? "bg-ink-950 text-gold-400" : "bg-ink-100 text-ink-400")}>
                {iniciais(u.nome) || u.nome.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-[180px] flex-1">
                <p className="text-[13px] font-medium">
                  {u.nome} {souEu && <span className="text-[11px] font-normal text-ink-400">(você)</span>}
                </p>
                <p className="text-xs text-ink-500">
                  {u.email || "sem e-mail"} · {u.oab}
                  {u.ultimoAcesso ? ` · último acesso ${new Date(u.ultimoAcesso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}
                </p>
              </div>
              <select
                aria-label={`Perfil de ${u.nome}`}
                value={u.perfil}
                disabled={pendente || souEu}
                title={souEu ? "Peça a outro administrador para mudar o seu perfil" : undefined}
                onChange={(e) => {
                  const perfil = e.target.value;
                  iniciar(async () => {
                    const r = await mudarPerfil(u.id, perfil);
                    if (r) avisar(u.id, { ok: r.ok, texto: r.mensagem });
                  });
                }}
                className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-[12px] outline-none focus:border-gold-400 disabled:bg-ink-50"
              >
                {PERFIS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <Badge tone={acesso.tone}>{acesso.texto}</Badge>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={pendente || !u.ativo}
                  className={botao}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await gerarLinkAcesso(u.id);
                      avisar(u.id, r.ok ? { ok: true, texto: r.finalidade === "redefinir" ? "Link para redefinir a senha" : "Link de primeiro acesso", link: r.link, expiraEm: r.expiraEm } : { ok: false, texto: r.mensagem });
                    })
                  }
                >
                  {u.temSenha ? "Link para redefinir senha" : "Gerar link de acesso"}
                </button>
                {u.temSenha && !souEu && (
                  <button
                    type="button"
                    disabled={pendente}
                    className={botao}
                    onClick={() => {
                      if (!window.confirm(`Desconectar ${u.nome} de todos os dispositivos?`)) return;
                      iniciar(async () => {
                        await encerrarSessoesDoUsuario(u.id);
                        avisar(u.id, { ok: true, texto: "Sessões encerradas." });
                      });
                    }}
                  >
                    Encerrar sessões
                  </button>
                )}
                {!souEu && (
                  <button
                    type="button"
                    disabled={pendente}
                    className={cx(botao, u.ativo && "hover:border-red-300 hover:text-danger")}
                    onClick={() => {
                      if (u.ativo && !window.confirm(`Desativar ${u.nome}? O acesso é cortado na hora.`)) return;
                      iniciar(async () => {
                        const r = await alternarUsuario(u.id);
                        avisar(u.id, { ok: r.ok, texto: r.mensagem });
                      });
                    }}
                  >
                    {u.ativo ? "Desativar" : "Reativar"}
                  </button>
                )}
              </div>
            </div>

            {aviso && (
              <div className={cx("mt-2.5 rounded-lg border px-3 py-2 text-[12px]", aviso.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50 text-danger")}>
                <p className={aviso.ok ? "text-ok" : undefined}>{aviso.texto}</p>
                {aviso.link && (
                  <>
                    <div className="mt-1.5 flex gap-2">
                      <input readOnly value={aviso.link} aria-label="Link de acesso" className="h-8 min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-2 font-mono text-[11px]" onFocus={(e) => e.target.select()} />
                      <button
                        type="button"
                        className="h-8 shrink-0 rounded-lg bg-ink-950 px-3 text-[12px] font-medium text-white"
                        onClick={() => navigator.clipboard?.writeText(aviso.link!).then(() => setCopiado(u.id)).catch(() => {})}
                      >
                        {copiado === u.id ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <p className="mt-1 text-ink-500">
                      Envie para {u.nome.split(" ")[0]} por um canal seguro. Vale uma vez, até {aviso.expiraEm}.
                    </p>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const ACOES: { chave: Acao; rotulo: string }[] = [
  { chave: "ver", rotulo: "Visualizar" },
  { chave: "editar", rotulo: "Criar e editar" },
  { chave: "excluir", rotulo: "Excluir" },
];

/** Gerada da mesma matriz que protege páginas, ações e APIs. */
export function MatrizPermissoes() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-[13px]">
        <thead>
          <tr className="border-b border-ink-200 text-[11px] uppercase tracking-wide text-ink-400">
            <th className="px-5 py-2.5 text-left font-medium">Recurso</th>
            {ACOES.map((a) => (
              <th key={a.chave} className="px-5 py-2.5 text-left font-medium">
                {a.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-200">
          {Object.entries(PERMISSOES).map(([chave, regra]) => (
            <tr key={chave} className="hover:bg-ink-50">
              <td className="px-5 py-3 font-medium">{regra.rotulo}</td>
              {ACOES.map((a) => {
                const perfis = regra[a.chave] as string[];
                return (
                  <td key={a.chave} className="px-5 py-3">
                    {perfis.length === 0 ? (
                      <span className="text-ink-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {perfis.map((p) => (
                          <span key={p} className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-700">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
