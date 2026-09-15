"use client";

import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { Area, Campo, Entrada, Secao, Selecao } from "@/components/form";
import { IconSpark } from "@/components/icons";
import { buscarProcessoNoDjen } from "@/lib/captura/acoes";
import type { DadosProcessoDjen } from "@/lib/captura/processo-djen";
import { cnjValido, digitosCnj, formatarCnj, tribunalDoCnj } from "@/lib/cnj";

const VAZIO = {
  titulo: "", orgao: "", comarca: "", classe: "", assunto: "",
  contraria: "", valorCausa: "", tribunal: "TJ-PA",
};

const TRIBUNAIS = ["TJ-PA", "TJ-RO", "TRF1", "TRE-PA", "TRT-8", "STJ", "STF"];

export function FormularioProcesso({
  clientes,
  usuarios,
  acao,
}: {
  clientes: { id: string; nome: string }[];
  usuarios: string[];
  acao: (f: FormData) => Promise<void>;
}) {
  const [numero, setNumero] = useState("");
  const [dados, setDados] = useState(VAZIO);
  const [resultado, setResultado] = useState<DadosProcessoDjen | null>(null);
  const [buscando, iniciarBusca] = useTransition();

  const digitos = digitosCnj(numero);
  const completo = digitos.length === 20;
  const valido = completo && cnjValido(digitos);
  const tribunais = dados.tribunal && !TRIBUNAIS.includes(dados.tribunal) ? [dados.tribunal, ...TRIBUNAIS] : TRIBUNAIS;

  const atualizar = (campo: keyof typeof VAZIO, valor: string) => setDados((d) => ({ ...d, [campo]: valor }));

  function mudarNumero(valor: string) {
    setNumero(valor);
    setResultado(null);
    const tribunal = tribunalDoCnj(valor);
    if (tribunal) setDados((d) => ({ ...d, tribunal }));
  }

  function buscar() {
    if (!valido) return;
    iniciarBusca(async () => {
      const r = await buscarProcessoNoDjen(digitos);
      setResultado(r);
      setNumero(formatarCnj(digitos));
      if (!r.encontrado) return;
      setDados((d) => ({
        ...d,
        tribunal: r.tribunal ?? d.tribunal,
        orgao: r.orgao || d.orgao,
        classe: r.classe || d.classe,
        comarca: r.comarca || d.comarca,
        titulo: d.titulo || r.classe,
      }));
    });
  }

  return (
    <form action={acao} className="space-y-4 p-6">
      <section className="rounded-card border border-ink-950 bg-ink-950 p-5 text-white">
        <div className="flex items-center gap-1.5">
          <IconSpark className="h-4 w-4 text-gold-400" />
          <p className="text-[11px] uppercase tracking-[0.12em] text-gold-400">Cadastro por número CNJ</p>
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/85">
          Cole o número do processo. O Wlaw confere o dígito verificador, identifica o tribunal e busca as publicações
          no DJEN para preencher órgão, classe e comarca e mostrar as partes. Você confere antes de salvar.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={numero}
            onChange={(e) => mudarNumero(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                buscar();
              }
            }}
            placeholder="0000000-00.0000.0.00.0000"
            aria-label="Número CNJ"
            className="h-10 min-w-0 flex-1 basis-full rounded-lg sm:basis-auto sm:min-w-[280px] border border-white/20 bg-white/10 px-3 font-mono text-[13px] text-white outline-none placeholder:text-white/35 focus:border-gold-400"
          />
          <button
            type="button"
            onClick={buscar}
            disabled={!valido || buscando}
            className="h-10 rounded-lg bg-gold-400 px-5 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-200 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40"
          >
            {buscando ? "Consultando o DJEN…" : "Buscar e preencher"}
          </button>
        </div>

        {numero.length > 0 && !completo && (
          <p className="mt-2 text-[12px] text-white/60">O número CNJ tem 20 dígitos — faltam {20 - digitos.length}.</p>
        )}
        {completo && !valido && (
          <p className="mt-2 text-[12px] text-red-300">O dígito verificador não confere. Confira se o número foi copiado inteiro.</p>
        )}

        {resultado?.erro && (
          <div className="mt-4 rounded-lg border border-red-300/40 bg-red-400/10 px-4 py-3 text-[13px] text-red-200">{resultado.erro}</div>
        )}

        {resultado && !resultado.erro && resultado.encontrado && (
          <div className="mt-4 rounded-lg border border-gold-400/40 bg-gold-400/10 px-4 py-3">
            <p className="text-[13px] font-medium text-gold-200">
              {resultado.publicacoes} {resultado.publicacoes === 1 ? "publicação" : "publicações"} no DJEN · a mais recente em{" "}
              {resultado.ultimaPublicacao}
            </p>
            <p className="mt-0.5 text-[12px] text-white/70">
              Tribunal, órgão, classe{resultado.comarca ? " e comarca" : ""} preenchidos. Confira antes de salvar.
            </p>
            {resultado.partes.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-wide text-white/50">Partes intimadas — clique para usar como parte contrária</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {resultado.partes.map((parte) => (
                    <button
                      key={parte.nome}
                      type="button"
                      onClick={() => atualizar("contraria", parte.nome)}
                      className="rounded-full border border-white/20 px-2.5 py-1 text-[12px] text-white/85 hover:border-gold-400 hover:text-gold-200"
                    >
                      {parte.nome} <span className="text-white/45">· {parte.polo}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {resultado && !resultado.erro && !resultado.encontrado && (
          <div className="mt-4 rounded-lg border border-white/20 bg-white/5 px-4 py-3">
            <p className="text-[13px] font-medium text-white">Nenhuma publicação no DJEN para este número</p>
            <p className="mt-0.5 text-[12px] text-white/70">
              {resultado.tribunal ? `O tribunal (${resultado.tribunal}) foi identificado pelo número. ` : ""}
              Pode ser processo sem intimações publicadas, em segredo de justiça ou físico. Preencha o restante abaixo.
            </p>
          </div>
        )}
      </section>

      <Card>
        <Secao titulo="Identificação" descricao="Como o processo aparece nas listas e relatórios.">
          <Campo label="Número do processo" obrigatorio>
            <Entrada name="numero" value={numero} onChange={(e) => mudarNumero(e.target.value)} placeholder="0000000-00.0000.0.00.0000" className="font-mono" required />
          </Campo>
          <Campo label="Situação">
            <Selecao name="situacao" opcoes={["Ativo", "Suspenso", "Arquivado"]} />
          </Campo>
          <Campo label="Título interno" className="sm:col-span-2" dica="Aparece no topo da ficha e nos relatórios ao cliente.">
            <Entrada name="titulo" value={dados.titulo} onChange={(e) => atualizar("titulo", e.target.value)} placeholder="Ex.: Ação de cobrança c/c indenização" />
          </Campo>
        </Secao>

        <Secao titulo="Órgão e competência" descricao="O tribunal sai do próprio número; o resto vem do DJEN quando há publicação.">
          <Campo label="Tribunal" obrigatorio>
            <Selecao name="tribunal" value={dados.tribunal} onChange={(e) => atualizar("tribunal", e.target.value)} opcoes={tribunais} />
          </Campo>
          <Campo label="Instância">
            <Selecao name="instancia" opcoes={["1ª", "2ª", "Superior"]} />
          </Campo>
          <Campo label="Órgão julgador">
            <Entrada name="orgao" value={dados.orgao} onChange={(e) => atualizar("orgao", e.target.value)} />
          </Campo>
          <Campo label="Comarca">
            <Entrada name="comarca" value={dados.comarca} onChange={(e) => atualizar("comarca", e.target.value)} />
          </Campo>
          <Campo label="Classe processual">
            <Entrada name="classe" value={dados.classe} onChange={(e) => atualizar("classe", e.target.value)} />
          </Campo>
          <Campo label="Assunto">
            <Entrada name="assunto" value={dados.assunto} onChange={(e) => atualizar("assunto", e.target.value)} />
          </Campo>
        </Secao>

        <Secao titulo="Partes" descricao="Quem é seu cliente e qual o polo que ele ocupa.">
          <Campo label="Cliente" obrigatorio>
            <select name="clienteId" required className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400">
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Polo do cliente" obrigatorio>
            <Selecao name="papel" opcoes={["Autor", "Réu", "Terceiro interessado", "Assistente"]} />
          </Campo>
          <Campo label="Parte contrária" className="sm:col-span-2">
            <Entrada name="contraria" value={dados.contraria} onChange={(e) => atualizar("contraria", e.target.value)} placeholder="Nome ou razão social" />
          </Campo>
        </Secao>

        <Secao titulo="Valores e risco" descricao="Alimenta a exposição financeira e o relatório de contingências.">
          <Campo label="Valor da causa">
            <Entrada name="valorCausa" value={dados.valorCausa} onChange={(e) => atualizar("valorCausa", e.target.value)} placeholder="0,00" inputMode="decimal" />
          </Campo>
          <Campo label="Valor provisionado" dica="Quanto você estima que realmente saia ou entre.">
            <Entrada name="provisao" placeholder="0,00" inputMode="decimal" />
          </Campo>
          <Campo label="Probabilidade de êxito (%)">
            <Entrada name="exito" defaultValue="50" inputMode="numeric" />
          </Campo>
          <Campo label="Grupo de trabalho">
            <Selecao name="grupo" opcoes={["Cível", "Empresarial", "Trabalhista", "Eleitoral", "Tributário"]} />
          </Campo>
        </Secao>

        <Secao titulo="Equipe e acompanhamento" descricao="Quem responde e como o processo é vigiado.">
          <Campo label="Responsável principal" obrigatorio>
            <Selecao name="responsavel" opcoes={usuarios} />
          </Campo>
          <Campo label="Observações internas" className="sm:col-span-2">
            <Area name="observacoes" placeholder="Contexto que a equipe precisa saber antes de mexer no processo." />
          </Campo>
        </Secao>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <label className="flex items-center gap-2 text-[13px] text-ink-700">
            <input type="checkbox" name="monitorado" defaultChecked className="h-4 w-4 accent-[#b08d3f]" />
            Monitorar automaticamente (PJe, quando houver conector do tribunal)
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => {
                setNumero("");
                setDados(VAZIO);
                setResultado(null);
              }}
            >
              Limpar
            </Button>
            <Button type="submit" variant="primary">Salvar processo</Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
