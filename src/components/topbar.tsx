import { IconBell, IconClock, IconPlus, IconSpark } from "@/components/icons";
import { TabsNav } from "@/components/tabs-nav";

type Tab = string | { label: string; href: string };

export function Topbar({ title, tabs }: { title: string; tabs?: Tab[] }) {
  const linked = tabs?.every((t) => typeof t === "object");
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-ink-200 bg-white/90 px-6 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate font-display text-[19px] font-semibold tracking-tight">{title}</h1>
        {tabs && linked && <TabsNav tabs={tabs as { label: string; href: string }[]} />}
        {tabs && !linked && (
          <div className="ml-2 hidden items-center rounded-lg border border-ink-200 p-0.5 md:flex">
            {(tabs as string[]).map((t, i) => (
              <button
                key={t}
                className={
                  i === 0
                    ? "rounded-[6px] bg-ink-950 px-3 py-1 text-[13px] font-medium text-white"
                    : "rounded-[6px] px-3 py-1 text-[13px] font-medium text-ink-500 hover:text-ink-900"
                }
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto hidden w-full max-w-md items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 lg:flex">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
        </svg>
        <input
          placeholder="Buscar processo, cliente, prazo…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
        />
        <kbd className="rounded border border-ink-200 px-1.5 text-[10px] text-ink-400">⌘K</kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink-950 px-3 text-sm font-medium text-white hover:bg-ink-900">
          <IconPlus className="h-4 w-4" /> Novo
        </button>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gold-200 bg-gold-50 px-3 text-sm font-medium text-gold-600 hover:bg-gold-200/50">
          <IconSpark className="h-4 w-4" /> Wlaw IA
        </button>
        <button className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100" aria-label="Timesheet rápido">
          <IconClock className="h-[18px] w-[18px]" />
        </button>
        <button className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100" aria-label="Notificações">
          <IconBell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold-400" />
        </button>
        <div className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-ink-950 text-[11px] font-semibold text-gold-400">
          AC
        </div>
      </div>
    </header>
  );
}
