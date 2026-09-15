import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth/sessao";

export default async function SemAcessoPage() {
  const usuario = await exigirUsuario();
  return (
    <>
      <Topbar title="Sem acesso" />
      <main className="p-4 sm:p-6">
        <Card className="mx-auto max-w-lg px-6 py-10 text-center">
          <h2 className="font-display text-[19px] font-semibold tracking-tight">Esta área não faz parte do seu perfil</h2>
          <p className="mt-2 text-[13px] leading-snug text-ink-500">
            Você entrou como <strong className="font-medium text-ink-900">{usuario.perfil}</strong>. Se precisa deste
            acesso, peça ao administrador do escritório para ajustar o seu perfil.
          </p>
          <Link href="/" className="mt-5 inline-flex h-9 items-center rounded-lg bg-ink-950 px-4 text-sm font-medium text-white hover:bg-ink-900">
            Voltar ao painel
          </Link>
        </Card>
      </main>
    </>
  );
}
