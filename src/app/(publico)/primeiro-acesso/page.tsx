import { redirect } from "next/navigation";
import { connection } from "next/server";
import { existeSenhaCadastrada } from "@/lib/auth/sessao";
import { FormPrimeiroAcesso } from "../formularios";

export default async function PrimeiroAcessoPage() {
  // Sem isto a página seria gerada no build, quando ainda não há senha, e nunca redirecionaria.
  await connection();
  if (await existeSenhaCadastrada()) redirect("/entrar");
  return <FormPrimeiroAcesso />;
}
