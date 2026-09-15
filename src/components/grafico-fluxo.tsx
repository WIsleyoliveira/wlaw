"use client";

import { useState } from "react";
import { cx } from "@/components/ui";

const SERIES = [
  { chave: "receita", rotulo: "Receita", cor: "#c98500" },
  { chave: "despesa", rotulo: "Despesa", cor: "#2a78d6" },
] as const;

const W = 640;
const H = 240;
const M = { top: 16, right: 8, bottom: 28, left: 56 };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const milhar = (v: number) => `${Math.round(v / 1000)}k`;

export type PontoFluxo = { mes: string; receita: number; despesa: number };

export function GraficoFluxo({ dados }: { dados: PontoFluxo[] }) {
  const [tabela, setTabela] = useState(false);
  const [ativo, setAtivo] = useState<number | null>(null);
  const fluxo = dados;

  const max = Math.max(1, ...fluxo.flatMap((d) => [d.receita, d.despesa]));
  const topo = Math.ceil(max / 10000) * 10000;
  const areaW = W - M.left - M.right;
  const areaH = H - M.top - M.bottom;
  const passo = areaW / fluxo.length;
  const larguraBarra = Math.min(20, (passo - 14) / 2);
  const y = (v: number) => M.top + areaH - (v / topo) * areaH;
  const ticks = [0, topo / 4, topo / 2, (topo * 3) / 4, topo];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3">
        <div className="flex items-center gap-4">
          {SERIES.map((s) => (
            <span key={s.chave} className="flex items-center gap-1.5 text-[12px] text-ink-700">
              <i className="h-2.5 w-2.5 rounded-[2px]" style={{ background: s.cor }} />
              {s.rotulo}
            </span>
          ))}
        </div>
        <button
          onClick={() => setTabela((t) => !t)}
          className="rounded-lg border border-ink-200 px-2.5 py-1 text-[12px] font-medium text-ink-700 hover:border-gold-400 hover:bg-gold-50"
        >
          {tabela ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>

      {tabela ? (
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[420px] text-[13px]">
            <thead>
              <tr className="border-b border-ink-200 text-[11px] uppercase tracking-wide text-ink-400">
                <th className="py-2 text-left font-medium">Mês</th>
                <th className="py-2 text-right font-medium">Receita</th>
                <th className="py-2 text-right font-medium">Despesa</th>
                <th className="py-2 text-right font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {fluxo.map((d) => (
                <tr key={d.mes}>
                  <td className="py-2">{d.mes}</td>
                  <td className="py-2 text-right tabular-nums">{brl(d.receita)}</td>
                  <td className="py-2 text-right tabular-nums">{brl(d.despesa)}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{brl(d.receita - d.despesa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative px-5 pb-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Receita e despesa por mês">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#e4e4e7" strokeWidth="1" />
                <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#a1a1aa">
                  {t === 0 ? "0" : milhar(t)}
                </text>
              </g>
            ))}

            {fluxo.map((d, i) => {
              const base = M.left + i * passo + passo / 2;
              const destaque = ativo === i;
              return (
                <g key={d.mes}>
                  <rect
                    x={M.left + i * passo}
                    y={M.top}
                    width={passo}
                    height={areaH}
                    fill={destaque ? "#0a0a0b" : "transparent"}
                    opacity={destaque ? 0.03 : 0}
                    onMouseEnter={() => setAtivo(i)}
                    onMouseLeave={() => setAtivo(null)}
                  />
                  {SERIES.map((s, si) => {
                    const v = d[s.chave];
                    const x = base - larguraBarra - 1 + si * (larguraBarra + 2);
                    return (
                      <rect
                        key={s.chave}
                        x={x}
                        y={y(v)}
                        width={larguraBarra}
                        height={M.top + areaH - y(v)}
                        rx="4"
                        fill={s.cor}
                        opacity={ativo === null || destaque ? 1 : 0.35}
                        pointerEvents="none"
                      />
                    );
                  })}
                  <text x={base} y={H - 8} textAnchor="middle" fontSize="11" fill="#71717a" pointerEvents="none">
                    {d.mes}
                  </text>
                </g>
              );
            })}

            <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} stroke="#a1a1aa" strokeWidth="1" />
          </svg>

          <div
            className={cx(
              "pointer-events-none absolute top-1 min-w-[168px] -translate-x-1/2 rounded-lg border border-ink-200 bg-white px-3 py-2 shadow-sm transition-opacity",
              ativo === null && "opacity-0",
            )}
            style={{
              left: `${((M.left + (ativo ?? 0) * passo + passo / 2) / W) * 100}%`,
            }}
          >
            {ativo !== null && (
              <>
                <p className="text-[11px] font-medium text-ink-500">{fluxo[ativo].mes}</p>
                {SERIES.map((s) => (
                  <p key={s.chave} className="flex items-center gap-1.5 text-[12px] text-ink-900">
                    <i className="h-2 w-2 rounded-[2px]" style={{ background: s.cor }} />
                    {s.rotulo} <span className="ml-auto tabular-nums font-medium">{brl(fluxo[ativo][s.chave])}</span>
                  </p>
                ))}
                <p className="mt-1 border-t border-ink-200 pt-1 text-[12px] font-medium tabular-nums">
                  Resultado {brl(fluxo[ativo].receita - fluxo[ativo].despesa)}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
