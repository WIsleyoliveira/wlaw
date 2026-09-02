import { Button, SearchInput, cx } from "@/components/ui";
import { IconExport, IconFilter, IconPlus } from "@/components/icons";

export function Toolbar({
  novo,
  placeholder,
  chips,
  filtros = 0,
}: {
  novo: string;
  placeholder: string;
  chips: string[];
  filtros?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 px-5 py-3">
      <Button variant="primary">
        <IconPlus className="h-4 w-4" /> {novo}
      </Button>
      <div className="min-w-[240px] flex-1">
        <SearchInput placeholder={placeholder} />
      </div>
      <Button>
        <IconFilter className="h-4 w-4" /> Filtros
        {filtros > 0 && (
          <span className="ml-1 rounded-full bg-gold-400 px-1.5 text-[11px] font-semibold text-ink-950">
            {filtros}
          </span>
        )}
      </Button>
      <Button aria-label="Exportar">
        <IconExport className="h-4 w-4" />
      </Button>
      <div className="flex items-center rounded-lg border border-ink-200 p-0.5">
        {chips.map((c, i) => (
          <button
            key={c}
            className={cx(
              "rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors",
              i === 0 ? "bg-ink-950 text-white" : "text-ink-500 hover:text-ink-900",
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Row({ accent, children }: { accent?: string; children: React.ReactNode }) {
  return (
    <li className="relative grid items-center gap-4 px-5 py-3.5 transition-colors hover:bg-ink-50">
      {accent && <span className={cx("absolute inset-y-0 left-0 w-[3px]", accent)} />}
      {children}
    </li>
  );
}

export function ListFooter({ total }: { total: number }) {
  return (
    <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3 text-xs text-ink-500">
      <span>
        Exibindo <strong className="text-ink-900">{total}</strong> registros
      </span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost">Anterior</Button>
        <Button size="sm">1</Button>
        <Button size="sm" variant="ghost">2</Button>
        <Button size="sm" variant="ghost">Próxima</Button>
      </div>
    </div>
  );
}
