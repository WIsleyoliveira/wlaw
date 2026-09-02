import { Topbar } from "@/components/topbar";
import { Card, Empty } from "@/components/ui";

export default function Page() {
  return (
    <>
      <Topbar title="Indicadores" />
      <main className="p-6">
        <Card>
          <Empty title="Monte seu painel de indicadores do escritório." action="Adicionar indicador" />
        </Card>
      </main>
    </>
  );
}
