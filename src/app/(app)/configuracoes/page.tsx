import { Topbar } from "@/components/topbar";
import { Card, Empty } from "@/components/ui";

export default function Page() {
  return (
    <>
      <Topbar title="Configurações" />
      <main className="p-6">
        <Card>
          <Empty title="Preferências do escritório, equipe e integrações." action="Abrir preferências" />
        </Card>
      </main>
    </>
  );
}
