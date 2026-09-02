"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { Area, Campo, Entrada, Secao, Selecao } from "@/components/form";
import { IconSpark } from "@/components/icons";

type Estado = "vazio" | "buscando" | "encontrado";

const VAZIO = {
  titulo: "",
  orgao: "",
  comarca: "",
  classe: "",
  assunto: "",
  contraria: "",
  valorCausa: "",
};

const CAPTURADO = {
  titulo: "Ação de cobrança c/c indenização por danos materiais",
  orgao: "2ª Vara Cível e Empresarial de Ananindeua",
  comarca: "Ananindeua - PA",
  classe: "Procedimento Comum Cível",
  assunto: "Prestação de serviços / Inadimplemento",
  contraria: "Almir Fernandes da Paixão",
  valorCausa: "R$ 87.400,00",
};

export function FormularioProcesso() {
  const [numero, setNumero] = useState("");
  const [estado, setEstado] = useState<Estado>("vazio");
  const [dados, setDados] = useState(VAZIO);

  const valido = numero.replace(/\D/g, "").length === 20;

  function atualizar(campo: keyof typeof VAZIO, valor: string) {
    setDados((d) => ({ ...d, [campo]: valor }));
  }

  function buscar() {
    if (!valido) return;
    setEstado("buscando");
    setTimeout(() => {
      setDados(CAPTURADO);
      setEstado("encontrado");
    }, 1200);
  }

  return (
    <main className="space-y-4 p-6">
      {/* Captura automática — o atalho que o concorrente não tem */}
      <section className="rounded-card border border-ink-950 bg-ink-950 p-5 text-white">
        <div className="flex items-center gap-1.5">
          <IconSpark className="h-4 w-4 text-gold-400" />
          <p className="text-[11px] uppercase tracking-[0.12em] text-gold-400">
            Cadastro por número CNJ
          </p>
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/85">
          Cole o número do processo. Buscamos no tribunal, preenchemos partes, classe, assunto,
          órgão julgador e importamos todo o histórico de andamentos. Você só confere.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={numero}
            onChange={(e) => {
              setNumero(e.target.value);
              setEstado("vazio");
              setDados(VAZIO);
            }}
            placeholder="0000000-00.0000.0.00.0000"
            className="h-10 min-w-[280px] flex-1 rounded-lg border border-white/20 bg-white/10 px-3 font-mono text-[13px] text-white outline-none placeholder:text-white/35 focus:border-gold-400"
          />
          <button
            onClick={buscar}
            disabled={!valido || estado === "buscando"}
            className="h-10 rounded-lg bg-gold-400 px-5 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-200 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40"
          >
            {estado === "buscando" ? "Buscando no tribunal…" : "Buscar e preencher"}
          </button>
        </div>

        {estado === "encontrado" && (
          <div className="mt-4 rounded-lg border border-gold-400/40 bg-gold-400/10 px-4 py-3">
            <p className="text-[13px] font-medium text-gold-200">
              Processo localizado no TJ-PA · 47 andamentos importados
            </p>
            <p className="mt-0.5 text-[12px] text-white/70">
              Campos abaixo preenchidos automaticamente. O monitoramento push já foi ativado.
            </p>
          </div>
        )}
        {numero.length > 0 && !valido && (
          <p className="mt-2 text-[12px] text-white/60">
            O número CNJ tem 20 dígitos — faltam {20 - numero.replace(/\D/g, "").length}.
          </p>
        )}
      </section>

      <Card>
        <Secao titulo="Identificação" descricao="Como o processo aparece nas listas e relatórios.">
          <Campo label="Pasta" obrigatorio>
            <Entrada defaultValue="PRO.0000292" readOnly className="bg-ink-50 font-mono" />
          </Campo>
          <Campo label="Número do processo" obrigatorio>
            <Entrada value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="0000000-00.0000.0.00.0000" className="font-mono" />
          </Campo>
          <Campo label="Título interno" className="sm:col-span-2" dica="Aparece no topo da ficha e nos relatórios ao cliente.">
            <Entrada
              value={dados.titulo}
              onChange={(e) => atualizar("titulo", e.target.value)}
              placeholder="Ex.: Ação de cobrança c/c indenização"
            />
          </Campo>
          <Campo label="Instância" obrigatorio>
            <Selecao opcoes={["1ª instância", "2ª instância", "Tribunal superior"]} />
          </Campo>
          <Campo label="Situação">
            <Selecao opcoes={["Ativo", "Suspenso", "Arquivado", "Baixado"]} />
          </Campo>
        </Secao>

        <Secao titulo="Órgão e competência" descricao="Preenchido pela captura quando o tribunal responde.">
          <Campo label="Tribunal" obrigatorio>
            <Selecao opcoes={["TJ-PA", "TJ-RO", "TRF1", "TRE-PA", "TRT-8", "STJ"]} />
          </Campo>
          <Campo label="Órgão julgador">
            <Entrada value={dados.orgao} onChange={(e) => atualizar("orgao", e.target.value)} />
          </Campo>
          <Campo label="Comarca">
            <Entrada value={dados.comarca} onChange={(e) => atualizar("comarca", e.target.value)} />
          </Campo>
          <Campo label="Classe processual">
            <Entrada value={dados.classe} onChange={(e) => atualizar("classe", e.target.value)} />
          </Campo>
          <Campo label="Assunto" className="sm:col-span-2">
            <Entrada value={dados.assunto} onChange={(e) => atualizar("assunto", e.target.value)} />
          </Campo>
        </Secao>

        <Secao titulo="Partes" descricao="Quem é seu cliente e qual o polo que ele ocupa.">
          <Campo label="Cliente" obrigatorio>
            <Selecao opcoes={["F. M. Rodrigues - ME", "Junto Telecom", "Espólio de Ana Francisca", "Victor Comércio"]} />
          </Campo>
          <Campo label="Polo do cliente" obrigatorio>
            <Selecao opcoes={["Autor / Requerente", "Réu / Requerido", "Terceiro interessado", "Assistente"]} />
          </Campo>
          <Campo label="Parte contrária" className="sm:col-span-2">
            <Entrada value={dados.contraria} onChange={(e) => atualizar("contraria", e.target.value)} placeholder="Nome ou razão social" />
          </Campo>
        </Secao>

        <Secao titulo="Valores e risco" descricao="Alimenta a exposição financeira e o relatório de contingências.">
          <Campo label="Valor da causa">
            <Entrada value={dados.valorCausa} onChange={(e) => atualizar("valorCausa", e.target.value)} placeholder="R$ 0,00" inputMode="decimal" />
          </Campo>
          <Campo label="Valor provisionado" dica="Quanto você estima que realmente saia ou entre.">
            <Entrada placeholder="R$ 0,00" inputMode="decimal" />
          </Campo>
          <Campo label="Probabilidade de êxito">
            <Selecao opcoes={["Provável (≥ 70%)", "Possível (30–69%)", "Remota (< 30%)"]} />
          </Campo>
          <Campo label="Contrato de honorários">
            <Selecao opcoes={["Nenhum", "Consultivo mensal", "Êxito 20%", "Hora técnica", "Por ato"]} />
          </Campo>
        </Secao>

        <Secao titulo="Equipe e acompanhamento" descricao="Quem responde e como o processo é vigiado.">
          <Campo label="Responsável principal" obrigatorio>
            <Selecao opcoes={["Alanna Correa Halliday e Silva", "Wisley Oliveira"]} />
          </Campo>
          <Campo label="Grupo de trabalho">
            <Selecao opcoes={["Cível", "Empresarial", "Trabalhista", "Eleitoral"]} />
          </Campo>
          <Campo label="Marcadores" className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-ink-200 p-2">
              {["Prioritário", "Cliente carteira A"].map((m) => (
                <Badge key={m} tone="gold">{m}</Badge>
              ))}
              <button className="text-[12px] text-ink-400 hover:text-gold-600">+ adicionar</button>
            </div>
          </Campo>
          <Campo label="Observações internas" className="sm:col-span-2">
            <Area placeholder="Contexto que a equipe precisa saber antes de mexer no processo." />
          </Campo>
        </Secao>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <label className="flex items-center gap-2 text-[13px] text-ink-700">
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#b08d3f]" />
            Ativar monitoramento automático deste processo
          </label>
          <div className="flex items-center gap-2">
            <Button>Cancelar</Button>
            <Button variant="primary">Salvar processo</Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
