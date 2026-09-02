"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export function TabsNav({ tabs }: { tabs: { label: string; href: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="ml-2 hidden items-center rounded-lg border border-ink-200 p-0.5 md:flex">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cx(
            "rounded-[6px] px-3 py-1 text-[13px] font-medium transition-colors",
            pathname === t.href ? "bg-ink-950 text-white" : "text-ink-500 hover:text-ink-900",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
