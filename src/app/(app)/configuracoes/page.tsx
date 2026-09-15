import { Topbar } from "@/components/topbar";
import { exigirPagina } from "@/lib/auth/sessao";
import { ler } from "@/lib/db";
import { lerPainelCaptura } from "@/lib/captura/painel";
import { PainelConfiguracoes } from "./painel";

export default async function ConfiguracoesPage() {
  const eu = await exigirPagina("configuracoes");
  const b = await ler();
  return (
    <>
      <Topbar title="Configurações" />
      <PainelConfiguracoes
        config={b.config}
        usuarios={b.usuarios}
        tiposTarefa={b.tiposTarefa}
        feriados={b.feriados}
        captura={await lerPainelCaptura()}
        usuarioLogadoId={eu.id}
      />
    </>
  );
}
