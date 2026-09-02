import { Topbar } from "@/components/topbar";
import { Card, Empty } from "@/components/ui";

export default function Page() {
  return (
    <>
      <Topbar title="Atendimentos" />
      <main className="p-6">
        <Card>
          <Empty title="Nenhum atendimento registrado." action="Novo atendimento" />
        </Card>
      </main>
    </>
  );
}
