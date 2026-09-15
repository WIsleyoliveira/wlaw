"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavGroup } from "@/lib/nav";
import { cx } from "@/components/ui";
import {
  IconCalendar, IconTasks, IconGavel, IconMail, IconRefresh, IconClock,
  IconHandshake, IconSpark, IconChart, IconGauge, IconReport, IconFolder,
  IconSettings,
} from "@/components/icons";

const ICONS: Record<string, (p: { className?: string }) => React.ReactElement> = {
  calendar: IconCalendar, tasks: IconTasks, gavel: IconGavel, mail: IconMail,
  refresh: IconRefresh, clock: IconClock, handshake: IconHandshake, spark: IconSpark,
  chart: IconChart, gauge: IconGauge, report: IconReport, folder: IconFolder,
};

/** Recebe só os itens que o perfil pode ver (filtrados no servidor). */
export function Sidebar({ grupos, configuracoes }: { grupos: NavGroup[]; configuracoes: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="group/nav fixed inset-y-0 left-0 z-30 flex w-[68px] flex-col border-r border-ink-200 bg-white transition-[width] duration-200 hover:w-60"
    >
      <Link href="/" className="flex h-16 items-center gap-2.5 px-[22px]">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-ink-950 font-display text-[13px] font-semibold text-gold-400">
          W
        </span>
        <span className="whitespace-nowrap font-display text-[17px] font-semibold tracking-tight opacity-0 transition-opacity group-hover/nav:opacity-100">
          Wlaw
        </span>
      </Link>

      <div className="scroll-thin flex-1 overflow-y-auto overflow-x-hidden pb-4">
        {grupos.map((group) => (
          <div key={group.section} className="mt-3">
            <p className="h-4 px-6 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400 opacity-0 transition-opacity group-hover/nav:opacity-100">
              {group.section}
            </p>
            <ul className="mt-1 space-y-0.5 px-3">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      className={cx(
                        "relative flex h-10 items-center gap-3 rounded-lg px-[13px] transition-colors",
                        active
                          ? "bg-ink-950 text-white"
                          : "text-ink-700 hover:bg-ink-100 hover:text-ink-950",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-gold-400" />
                      )}
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="whitespace-nowrap text-[13px] font-medium opacity-0 transition-opacity group-hover/nav:opacity-100">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {configuracoes && (
      <div className="border-t border-ink-200 px-3 py-3">
        <Link
          href="/configuracoes"
          className="flex h-10 items-center gap-3 rounded-lg px-[13px] text-ink-700 hover:bg-ink-100"
        >
          <IconSettings className="h-[18px] w-[18px] shrink-0" />
          <span className="whitespace-nowrap text-[13px] font-medium opacity-0 transition-opacity group-hover/nav:opacity-100">
            Configurações
          </span>
        </Link>
      </div>
      )}
    </nav>
  );
}
