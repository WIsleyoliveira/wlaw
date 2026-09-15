import Link from "next/link";
import { validarConvite } from "@/lib/auth/sessao";
import { FormDefinirSenha } from "../formularios";

export default async function DefinirSenhaPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { token = "" } = await searchParams;
  const convite = await validarConvite(token);

  if (!convite) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="font-display text-[20px] font-semibold tracking-tight">Link inválido</h1>
        <p className="text-[13px] leading-snug text-ink-500">
          Este link não existe, já foi usado ou expirou. Peça um novo ao administrador do escritório.
        </p>
        <Link href="/entrar" className="inline-block text-[13px] font-medium text-gold-600 hover:underline">
          Ir para o login
        </Link>
      </div>
    );
  }
  return <FormDefinirSenha token={token} nome={convite.nome} finalidade={convite.finalidade} />;
}
