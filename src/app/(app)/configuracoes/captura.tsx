"use client";

import { useActionState, useState, useTransition } from "react";
import { Badge, Button, Card, cx } from "@/components/ui";
import { Campo, Entrada } from "@/components/form";
import { BotaoAcao } from "@/components/modal";
import type { PainelCaptura } from "@/lib/captura/painel";
import {
  type EstadoFormulario, enviarCertificado, removerCertificado, removerConector, salvarConector, testarConectorAgora,
} from "@/lib/captura/acoes";

const DIA = 86_400_000;
const campoSelecao =
  "h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] text-ink-900 outline-none focus:border-gold-400";
const mascararCpf = (cpf: string | null) => (cpf ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}` : "CPF não identificado");
const dia = (d: Date | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

function Mensagem({ estado }: { estado: EstadoFormulario }) {
  if (!estado) return null;
  return (
    <p className={cx("rounded-lg border px-3 py-2 text-[12px]", estado.ok ? "border-emerald-200 bg-emerald-50 text-ok" : "border-red-200 bg-red-50 text-danger")}>
      {estado.mensagem}
    </p>
  );
}

function Cabecalho({ titulo, descricao, children }: { titulo: string; descricao: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-5 py-3">
      <div className="min-w-0 max-w-2xl">
        <h2 className="font-display text-[15px] font-semibold">{titulo}</h2>
        <p className="text-xs leading-snug text-ink-500">{descricao}</p>
      </div>
      {children}
    </div>
  );
}

function Certificados({ captura, usuarios }: { captura: PainelCaptura; usuarios: { id: string; nome: string }[] }) {
  const [estado, enviar, enviando] = useActionState(enviarCertificado, null);

  return (
    <Card>
      <Cabecalho
        titulo="Certificados A1"
        descricao="Arquivo e senha ficam cifrados (AES-256-GCM) com uma chave mestra que não fica no banco. O Wlaw usa o certificado só para consultar — nunca para peticionar."
      />
      {captura.certificados.length > 0 && (
        <ul className="divide-y divide-ink-200">
          {captura.certificados.map((cert) => {
            const restantes = Math.floor((new Date(cert.validoAte).getTime() - captura.agora) / DIA);
            return (
              <li key={cert.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <div className="min-w-[220px] flex-1">
                  <p className="text-[13px] font-medium">{cert.titular}</p>
                  <p className="text-xs text-ink-500">
                    {mascararCpf(cert.cpf)} · {cert.emissor} · último uso {cert.ultimoUso ? dia(cert.ultimoUso) : "nunca"}
                  </p>
                </div>
                <Badge tone={restantes < 0 ? "danger" : restantes <= 30 ? "warn" : "ok"}>
                  {restantes < 0 ? `vencido em ${dia(cert.validoAte)}` : `vale até ${dia(cert.validoAte)}`}
                </Badge>
                <BotaoAcao
                  acao={() => removerCertificado(cert.id)}
                  confirmar={`Remover o certificado de ${cert.titular}? Conectores que o usam param de consultar.`}
                  titulo="Remover"
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-danger"
                >
                  ✕
                </BotaoAcao>
              </li>
            );
          })}
        </ul>
      )}
      <form action={enviar} className="grid gap-4 border-t border-ink-200 px-5 py-4 sm:grid-cols-2 *:min-w-0">
        <Campo label="Arquivo do certificado (.pfx ou .p12)" obrigatorio className="sm:col-span-2">
          <input
            type="file"
            name="arquivo"
            accept=".pfx,.p12,application/x-pkcs12"
            required
            className="block w-full text-[13px] text-ink-700 file:mr-3 file:rounded-lg file:border file:border-ink-200 file:bg-white file:px-3 file:py-2 file:text-[13px] file:font-medium"
          />
        </Campo>
        <Campo label="Senha do certificado" obrigatorio>
          <Entrada type="password" name="senha" autoComplete="off" required />
        </Campo>
        <Campo label="Advogado titular">
          <select name="usuarioId" className={campoSelecao} defaultValue="">
            <option value="">—</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </Campo>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          <Mensagem estado={estado} />
          <Button type="submit" variant="primary" disabled={enviando} className="ml-auto">
            {enviando ? "Conferindo certificado…" : "Guardar certificado"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

type ResultadoTeste = Awaited<ReturnType<typeof testarConectorAgora>>;

function Conectores({ captura }: { captura: PainelCaptura }) {
  const [estado, salvar, salvando] = useActionState(salvarConector, null);
  const [editando, setEditando] = useState<string | null>(null);
  const [testes, setTestes] = useState<Record<string, ResultadoTeste>>({});
  const [testando, iniciarTeste] = useTransition();
  const [emTeste, setEmTeste] = useState<string | null>(null);
  const atual = captura.conectores.find((c) => c.id === editando);

  return (
    <Card>
      <Cabecalho
        titulo="Conectores do PJe (MNI 2.2.2)"
        descricao="Um por tribunal e grau. Em modo simulado o teste usa um tribunal falso aqui mesmo; em modo real, o certificado vinculado. O teor de intimações nunca é aberto automaticamente."
      >
        <Button size="sm" variant="primary" onClick={() => setEditando("novo")}>
          Novo conector
        </Button>
      </Cabecalho>

      <ul className="divide-y divide-ink-200">
        {captura.conectores.map((c) => {
          const certificado = captura.certificados.find((x) => x.id === c.certificadoId);
          const teste = testes[c.id];
          return (
            <li key={c.id} className="px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[220px] flex-1">
                  <p className="text-[13px] font-medium">
                    {c.tribunal} · {c.grau} <span className="text-ink-400">({c.id})</span>
                  </p>
                  <p className="truncate font-mono text-[11px] text-ink-500">{c.url}</p>
                  <p className="text-[11px] text-ink-500">
                    {certificado ? `Certificado: ${certificado.titular}` : "Sem certificado"} ·{" "}
                    {c.consultarAvisos ? "consulta avisos" : "sem avisos"}
                    {c.observacoes ? ` · ${c.observacoes}` : ""}
                  </p>
                </div>
                <Badge tone={!c.ativo ? "neutral" : c.modo === "real" ? "ok" : "gold"}>{!c.ativo ? "desligado" : c.modo}</Badge>
                <Button
                  size="sm"
                  disabled={testando}
                  onClick={() =>
                    iniciarTeste(async () => {
                      setEmTeste(c.id);
                      const r = await testarConectorAgora(c.id);
                      setTestes((t) => ({ ...t, [c.id]: r }));
                      setEmTeste(null);
                    })
                  }
                >
                  {testando && emTeste === c.id ? "Testando…" : "Testar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditando(c.id)}>
                  Editar
                </Button>
                <BotaoAcao
                  acao={() => removerConector(c.id)}
                  confirmar={`Remover o conector ${c.id}?`}
                  titulo="Remover"
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-danger"
                >
                  ✕
                </BotaoAcao>
              </div>

              {teste && (
                <div className="mt-2.5 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-[12px]">
                  {teste.ok ? (
                    <>
                      <p className="mb-1 text-ink-500">
                        Teste {teste.modo} · processo <span className="font-mono">{teste.numero}</span> · nada foi gravado
                      </p>
                      <ul className="space-y-0.5">
                        {teste.passos.map((p) => (
                          <li key={p.operacao} className={p.ok ? "text-ink-700" : "text-danger"}>
                            {p.ok ? "✓" : "✕"} <span className="font-mono">{p.operacao}</span> ({p.ms} ms) — {p.resumo}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-danger">{teste.erro}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {editando && (
        <form key={editando} action={salvar} className="grid gap-4 border-t border-ink-200 bg-ink-50/50 px-5 py-4 sm:grid-cols-2 *:min-w-0">
          {atual && <input type="hidden" name="id" value={atual.id} />}
          <Campo label="Tribunal" obrigatorio dica="Sigla sem hífen, como no número CNJ: TJPA, TRT8, TRF1.">
            <Entrada name="tribunal" defaultValue={atual?.tribunal} placeholder="TJPA" required />
          </Campo>
          <Campo label="Grau">
            <select name="grau" defaultValue={atual?.grau ?? "1º grau"} className={campoSelecao}>
              <option>1º grau</option>
              <option>2º grau</option>
            </select>
          </Campo>
          <Campo label="URL do serviço MNI" obrigatorio className="sm:col-span-2" dica="Endereço do intercomunicacao (sem ?wsdl).">
            <Entrada name="url" defaultValue={atual?.url} placeholder="https://pje.tjpa.jus.br/pje/intercomunicacao" className="font-mono" required />
          </Campo>
          <Campo label="Modo">
            <select name="modo" defaultValue={atual?.modo ?? "simulado"} className={campoSelecao}>
              <option value="simulado">Simulado (sem tocar no tribunal)</option>
              <option value="real">Real (usa certificado)</option>
            </select>
          </Campo>
          <Campo label="Certificado A1">
            <select name="certificadoId" defaultValue={atual?.certificadoId ?? ""} className={campoSelecao}>
              <option value="">—</option>
              {captura.certificados.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titular}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="CPF do consultante" dica="Em branco, usa o CPF do certificado.">
            <Entrada name="idConsultante" defaultValue={atual?.idConsultante ?? ""} inputMode="numeric" />
          </Campo>
          <Campo label="Senha do consultante" dica={atual?.temSenha ? "Já existe senha salva. Deixe em branco para manter." : "Só se o tribunal exigir login e senha além do certificado."}>
            <Entrada name="senhaConsultante" type="password" autoComplete="off" />
          </Campo>
          <Campo label="Observações" className="sm:col-span-2">
            <Entrada name="observacoes" defaultValue={atual?.observacoes ?? ""} />
          </Campo>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="consultarAvisos" defaultChecked={atual?.consultarAvisos ?? true} className="h-4 w-4 accent-[#b08d3f]" />
            Consultar avisos pendentes (sem abrir teor)
          </label>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
            <Mensagem estado={estado} />
            <Button type="button" onClick={() => setEditando(null)}>
              Fechar
            </Button>
            <Button type="submit" variant="primary" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar conector"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export function ConfigCaptura({ captura, usuarios }: { captura: PainelCaptura; usuarios: { id: string; nome: string }[] }) {
  return (
    <>
      <Card>
        <Cabecalho
          titulo="DJEN — intimações por OAB"
          descricao="API pública do CNJ, sem certificado. As OABs vêm do cadastro da equipe (Equipe e permissões). A consulta precisa sair de um IP no Brasil."
        />
        <ul className="divide-y divide-ink-200">
          {captura.oabs.map((o) => (
            <li key={o.usuario} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-[13px] font-medium">{o.usuario}</p>
                <p className="text-[11px] text-ink-500">{o.texto || "sem OAB"}</p>
              </div>
              <Badge tone={!o.ativo ? "neutral" : o.rotulo ? "ok" : "warn"}>
                {!o.ativo ? "inativo" : o.rotulo ? `monitorada · ${o.rotulo}` : "OAB não reconhecida"}
              </Badge>
            </li>
          ))}
        </ul>
        <p className="border-t border-ink-200 px-5 py-3 text-[12px] leading-snug text-ink-500">
          Agendamento: <code className="font-mono">docker compose --profile robo up -d</code> chama a captura a cada 15 min.
          Em produção, qualquer cron que faça <code className="font-mono">POST /api/robo/ciclo</code> com o{" "}
          <code className="font-mono">CRON_SECRET</code> serve.
        </p>
      </Card>
      <Certificados captura={captura} usuarios={usuarios} />
      <Conectores captura={captura} />
    </>
  );
}
