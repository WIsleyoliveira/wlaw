import { Topbar } from "@/components/topbar";
import { Card, Empty } from "@/components/ui";

export default function Page() {
  return (
    <>
      <Topbar title="Documentos" />
      <main className="p-6">
        <Card>
          <Empty title="Nenhum documento na pasta." action="Enviar documento" />
        </Card>
      </main>
    </>
  );
}
