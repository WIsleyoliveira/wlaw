"use client";

import { useActionState } from "react";
import { type EstadoAcesso, definirSenha, entrar, primeiroAcesso } from "@/lib/auth/acoes";

const campo =
  "h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-[14px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-gold-400";

function Rotulo({ texto, dica, children }: { texto: string; dica?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-ink-700">{texto}</span>
      {children}
      {dica && <span className="mt-1 block text-[11px] leading-snug text-ink-500">{dica}</span>}
    </label>
  );
}

function Mensagem({ estado }: { estado: EstadoAcesso }) {
  if (!estado) return null;
  return (
    <p
      role="alert"
      className={
        estado.ok
          ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-ok"
          : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-danger"
      }
    >
      {estado.mensagem}
    </p>
  );
}

function Enviar({ pendente, texto, pendenteTexto }: { pendente: boolean; texto: string; pendenteTexto: string }) {
  return (
    <button
      type="submit"
      disabled={pendente}
      className="h-11 w-full rounded-lg bg-ink-950 text-sm font-semibold text-white transition-colors hover:bg-ink-900 disabled:opacity-60"
    >
      {pendente ? pendenteTexto : texto}
    </button>
  );
}

const DICA_SENHA = "Pelo menos 10 caracteres, com letras e números.";

export function FormEntrar({ de }: { de?: string }) {
  const [estado, acao, pendente] = useActionState(entrar, null);
  return (
    <form action={acao} className="space-y-4">
      <div>
        <h1 className="font-display text-[20px] font-semibold tracking-tight">Entrar</h1>
        <p className="mt-0.5 text-[13px] text-ink-500">Use o e-mail cadastrado pelo escritório.</p>
      </div>
      {de && <input type="hidden" name="de" value={de} />}
      <Rotulo texto="E-mail">
        <input name="email" type="email" autoComplete="username" required autoFocus className={campo} />
      </Rotulo>
      <Rotulo texto="Senha">
        <input name="senha" type="password" autoComplete="current-password" required className={campo} />
      </Rotulo>
      <Mensagem estado={estado} />
      <Enviar pendente={pendente} texto="Entrar" pendenteTexto="Conferindo…" />
      <p className="text-center text-[12px] leading-snug text-ink-500">
        Esqueceu a senha? Peça ao administrador do escritório um novo link de acesso.
      </p>
    </form>
  );
}

export function FormPrimeiroAcesso() {
  const [estado, acao, pendente] = useActionState(primeiroAcesso, null);
  return (
    <form action={acao} className="space-y-4">
      <div>
        <h1 className="font-display text-[20px] font-semibold tracking-tight">Primeiro acesso</h1>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-500">
          Nenhuma senha foi criada ainda. Defina a senha de um administrador para liberar o sistema; os demais
          usuários recebem link de acesso depois, em Configurações → Equipe.
        </p>
      </div>
      <Rotulo texto="Código de instalação" dica="Está no arquivo .env do servidor, na variável WLAW_CODIGO_INSTALACAO.">
        <input name="codigo" type="password" autoComplete="off" required className={campo} />
      </Rotulo>
      <Rotulo texto="E-mail do administrador">
        <input name="email" type="email" autoComplete="username" required className={campo} />
      </Rotulo>
      <Rotulo texto="Nova senha" dica={DICA_SENHA}>
        <input name="senha" type="password" autoComplete="new-password" required minLength={10} className={campo} />
      </Rotulo>
      <Rotulo texto="Confirme a senha">
        <input name="confirmacao" type="password" autoComplete="new-password" required minLength={10} className={campo} />
      </Rotulo>
      <Mensagem estado={estado} />
      <Enviar pendente={pendente} texto="Criar senha e entrar" pendenteTexto="Salvando…" />
    </form>
  );
}

export function FormDefinirSenha({ token, nome, finalidade }: { token: string; nome: string; finalidade: string }) {
  const [estado, acao, pendente] = useActionState(definirSenha, null);
  return (
    <form action={acao} className="space-y-4">
      <div>
        <h1 className="font-display text-[20px] font-semibold tracking-tight">
          {finalidade === "redefinir" ? "Redefinir senha" : "Criar sua senha"}
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-500">Olá, {nome}. Este link só funciona uma vez.</p>
      </div>
      <input type="hidden" name="token" value={token} />
      <Rotulo texto="Nova senha" dica={DICA_SENHA}>
        <input name="senha" type="password" autoComplete="new-password" required minLength={10} autoFocus className={campo} />
      </Rotulo>
      <Rotulo texto="Confirme a senha">
        <input name="confirmacao" type="password" autoComplete="new-password" required minLength={10} className={campo} />
      </Rotulo>
      <Mensagem estado={estado} />
      <Enviar pendente={pendente} texto="Salvar senha e entrar" pendenteTexto="Salvando…" />
    </form>
  );
}
