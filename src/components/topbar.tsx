import Link from "next/link";
import { IconBell, IconClock, IconPlus, IconSpark } from "@/components/icons";
import { TabsNav } from "@/components/tabs-nav";
import { BotaoIA } from "@/components/ia";
import { BuscaGlobal } from "@/components/busca-global";
import { MenuUsuario } from "@/components/menu-usuario";
import { exigirUsuario } from "@/lib/auth/sessao";
import { ler } from "@/lib/db";
import { pode } from "@/lib/permissoes";

type Tab = string | { label: string; href: string };

export async function Topbar({ title, tabs }: { title: string; tabs?: Tab[] }) {
  const linked = tabs?.every((t) => typeof t === "object");
  const eu = await exigirUsuario();
  const verAvisos = pode(eu.perfil, "andamentos");
  let naoLidos = 0;
  if (verAvisos) {
    const b = await ler();
    naoLidos = b.andamentos.filter((a) => !a.lido).length + b.intimacoes.filter((i) => i.situacao === "Pendente").length;
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-ink-200 bg-white/90 px-4 backdrop-blur sm:gap-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
        <h1 className="truncate font-display text-[17px] font-semibold tracking-tight sm:text-[19px]">{title}</h1>
        {tabs && linked && <TabsNav tabs={tabs as { label: string; href: string }[]} />}
      </div>

      {pode(eu.perfil, "processos") && <BuscaGlobal />}

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        {pode(eu.perfil, "processos", "editar") && (
          <Link href="/processos/novo" aria-label="Novo processo" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink-950 px-2.5 text-sm font-medium text-white hover:bg-ink-900 sm:px-3">
            <IconPlus className="h-4 w-4" /> <span className="hidden sm:inline">Novo</span>
          </Link>
        )}
        {pode(eu.perfil, "ia") && (
          <BotaoIA className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gold-200 bg-gold-50 px-2.5 text-sm font-medium text-gold-600 hover:bg-gold-200/50 sm:px-3">
            <IconSpark className="h-4 w-4" /> <span className="hidden sm:inline">Wlaw IA</span>
          </BotaoIA>
        )}
        {pode(eu.perfil, "timesheet") && (
          <Link href="/timesheet" className="hidden h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 sm:grid" aria-label="Timesheet rápido">
            <IconClock className="h-[18px] w-[18px]" />
          </Link>
        )}
        {verAvisos && (
          <Link href="/andamentos" className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100" aria-label="Notificações">
            <IconBell className="h-[18px] w-[18px]" />
            {naoLidos > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold-400" />}
          </Link>
        )}
        <MenuUsuario nome={eu.nome} email={eu.email} perfil={eu.perfil} />
      </div>
    </header>
  );
}
