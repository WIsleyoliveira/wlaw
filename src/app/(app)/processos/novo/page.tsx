import { exigirPagina } from "@/lib/auth/sessao";
import { Topbar } from "@/components/topbar";
import { FormularioProcesso } from "./formulario";
import { ler } from "@/lib/db";
import { criarProcesso } from "@/lib/acoes";

export default async function NovoProcessoPage() {
  await exigirPagina("processos", "editar");
  const b = await ler();
  return (
    <>
      <Topbar title="Novo processo" />
      <FormularioProcesso
        clientes={b.pessoas.filter((p) => p.cliente).map((p) => ({ id: p.id, nome: p.nome }))}
        usuarios={b.usuarios.filter((u) => u.ativo).map((u) => u.nome)}
        acao={criarProcesso}
      />
    </>
  );
}
