import { Topbar } from "@/components/topbar";
import { FormularioProcesso } from "./formulario";

export default function NovoProcessoPage() {
  return (
    <>
      <Topbar title="Novo processo" />
      <FormularioProcesso />
    </>
  );
}
