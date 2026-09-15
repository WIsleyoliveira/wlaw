"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { IconRefresh } from "@/components/icons";
import { rodarCicloAgora } from "@/lib/captura/acoes";

export function RodarCiclo() {
  const [pendente, iniciar] = useTransition();
  const [resumo, setResumo] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant="primary"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            try {
              const r = await rodarCicloAgora();
              if (r.ignorado) return setResumo(r.ignorado);
              const novos = r.execucoes.reduce((s, e) => s + e.novos, 0);
              const falhas = r.execucoes.filter((e) => e.status === "falha").length;
              setResumo(
                `${r.execucoes.length} consultas em ${Math.round(r.duracaoMs / 1000)} s · ${novos} itens novos · ${falhas} falhas` +
                  (r.adiados ? ` · ${r.adiados} adiadas para o próximo ciclo` : ""),
              );
            } catch {
              setResumo("Não consegui rodar a captura. Veja o log do servidor.");
            }
          })
        }
      >
        <IconRefresh className={pendente ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {pendente ? "Consultando tribunais…" : "Rodar captura agora"}
      </Button>
      {resumo && <p className="mt-2 text-[12px] leading-snug text-ink-500">{resumo}</p>}
    </div>
  );
}
