import { Sidebar } from "@/components/sidebar";
import { ProvedorIA } from "@/components/ia";
import { exigirUsuario } from "@/lib/auth/sessao";
import { NAV } from "@/lib/nav";
import { pode, recursoDaRota } from "@/lib/permissoes";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Filtro visual do menu. A proteção de verdade está em cada página, ação e API.
  const eu = await exigirUsuario();
  const grupos = NAV.map((g) => ({ ...g, items: g.items.filter((i) => pode(eu.perfil, recursoDaRota(i.href))) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <ProvedorIA>
      <div className="min-h-dvh bg-ink-50">
        <Sidebar grupos={grupos} configuracoes={pode(eu.perfil, "configuracoes")} />
        <div className="pl-[68px]">{children}</div>
      </div>
    </ProvedorIA>
  );
}
