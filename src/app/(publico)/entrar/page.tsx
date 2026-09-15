import { redirect } from "next/navigation";
import { existeSenhaCadastrada, usuarioAtual } from "@/lib/auth/sessao";
import { FormEntrar } from "../formularios";

export default async function EntrarPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (await usuarioAtual()) redirect("/");
  if (!(await existeSenhaCadastrada())) redirect("/primeiro-acesso");
  const { de } = await searchParams;
  return <FormEntrar de={de} />;
}
