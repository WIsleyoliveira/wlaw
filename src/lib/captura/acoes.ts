"use server";

import { revalidatePath } from "next/cache";
import { exigirAcao } from "../auth/sessao";
import { cnjValido, digitosCnj } from "../cnj";
import { novoId } from "../ids";
import { bancoPronto, sql } from "../sql";
import { cifrar, decifrar, inspecionarPfx } from "./cofre";
import { buscarPorProcesso } from "./djen";
import { type DadosProcessoDjen, resumirProcessoDjen } from "./processo-djen";
import { montarCliente, executarCiclo, type ConectorLinha } from "./robo";
import { testarConector } from "./painel";

export type EstadoFormulario = { ok: boolean; mensagem: string } | null;

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const atualizar = () => revalidatePath("/", "layout");

/** Cadastro por número: dados públicos do processo a partir das publicações no DJEN. */
export async function buscarProcessoNoDjen(numero: string): Promise<DadosProcessoDjen> {
  await exigirAcao("processos", "editar");
  const digitos = digitosCnj(numero);
  if (!cnjValido(digitos)) {
    return { ...resumirProcessoDjen(digitos, []), erro: "Número CNJ inválido: o dígito verificador não confere." };
  }
  try {
    const { itens } = await buscarPorProcesso(digitos);
    return resumirProcessoDjen(digitos, itens);
  } catch (erro) {
    return { ...resumirProcessoDjen(digitos, []), erro: erro instanceof Error ? erro.message : "Falha ao consultar o DJEN." };
  }
}

export async function enviarCertificado(_anterior: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirAcao("configuracoes", "editar");
  const arquivo = f.get("arquivo");
  const senha = String(f.get("senha") ?? "");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, mensagem: "Escolha o arquivo .pfx ou .p12." };
  if (arquivo.size > 100_000) return { ok: false, mensagem: "Arquivo grande demais para um certificado A1." };
  if (!senha) return { ok: false, mensagem: "Informe a senha do certificado." };

  let dados;
  try {
    dados = inspecionarPfx(Buffer.from(await arquivo.arrayBuffer()), senha);
  } catch (erro) {
    return { ok: false, mensagem: erro instanceof Error ? erro.message : "Certificado inválido." };
  }

  await bancoPronto();
  const [repetido] = await sql`select id from certificados where impressao_digital = ${dados.impressaoDigital}`;
  if (repetido) return { ok: false, mensagem: "Este certificado já está cadastrado." };

  const id = novoId("cert");
  await sql`insert into certificados ${sql({
    id,
    titular: dados.titular,
    cpf: dados.cpf,
    emissor: dados.emissor,
    validoDe: dados.validoDe,
    validoAte: dados.validoAte,
    impressaoDigital: dados.impressaoDigital,
    pfxCifrado: cifrar(dados.pfx, `certificado:${id}:pfx`),
    senhaCifrada: cifrar(Buffer.from(senha, "utf8"), `certificado:${id}:senha`),
    usuarioId: texto(f, "usuarioId") || null,
  })}`;
  atualizar();
  return {
    ok: true,
    mensagem: `Certificado de ${dados.titular} guardado, válido até ${dados.validoAte.toLocaleDateString("pt-BR")}.`,
  };
}

export async function removerCertificado(id: string) {
  await exigirAcao("configuracoes", "excluir");
  await bancoPronto();
  await sql`delete from certificados where id = ${id}`;
  atualizar();
}

export async function salvarConector(_anterior: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirAcao("configuracoes", "editar");
  const tribunal = texto(f, "tribunal").toUpperCase();
  const grau = texto(f, "grau") || "1º grau";
  const url = texto(f, "url");
  if (!tribunal || !url) return { ok: false, mensagem: "Tribunal e URL do serviço são obrigatórios." };
  if (!/^https:\/\//.test(url)) return { ok: false, mensagem: "A URL do MNI precisa começar com https://." };

  const id = texto(f, "id") || `${tribunal.toLowerCase().replace(/[^a-z0-9]/g, "")}-${grau.startsWith("2") ? "2g" : "1g"}`;
  const modo = texto(f, "modo") === "real" ? "real" : "simulado";
  const certificadoId = texto(f, "certificadoId") || null;
  if (modo === "real" && !certificadoId) return { ok: false, mensagem: "Modo real exige um certificado A1 vinculado." };

  await bancoPronto();
  const senha = String(f.get("senhaConsultante") ?? "");
  await sql`insert into mni_conectores ${sql({
    id,
    tribunal,
    grau,
    url,
    modo,
    certificadoId,
    idConsultante: texto(f, "idConsultante").replace(/\D/g, "") || null,
    consultarAvisos: f.get("consultarAvisos") === "on",
    ativo: f.get("ativo") !== "off",
    observacoes: texto(f, "observacoes"),
  })}
  on conflict (id) do update set tribunal = excluded.tribunal, grau = excluded.grau, url = excluded.url, modo = excluded.modo,
    certificado_id = excluded.certificado_id, id_consultante = excluded.id_consultante,
    consultar_avisos = excluded.consultar_avisos, ativo = excluded.ativo, observacoes = excluded.observacoes`;
  if (senha) {
    await sql`update mni_conectores set senha_consultante_cifrada = ${cifrar(Buffer.from(senha, "utf8"), `conector:${id}:senha`)} where id = ${id}`;
  }
  atualizar();
  return { ok: true, mensagem: `Conector ${id} salvo em modo ${modo}.` };
}

export async function removerConector(id: string) {
  await exigirAcao("configuracoes", "excluir");
  await bancoPronto();
  await sql`delete from mni_conectores where id = ${id}`;
  atualizar();
}

export async function rodarCicloAgora() {
  await exigirAcao("monitoramento", "editar");
  const r = await executarCiclo({ orcamentoMs: 120_000, forcar: true });
  atualizar();
  return r;
}

export async function testarConectorAgora(conectorId: string, numero?: string) {
  await exigirAcao("configuracoes", "editar");
  try {
    return { ok: true as const, ...(await testarConector(conectorId, numero)) };
  } catch (erro) {
    return { ok: false as const, erro: erro instanceof Error ? erro.message : String(erro) };
  }
}

export async function alternarAlvo(fonte: string, alvo: string) {
  await exigirAcao("monitoramento", "editar");
  await bancoPronto();
  await sql`update captura_estado set ativo = not ativo where fonte = ${fonte} and alvo = ${alvo}`;
  atualizar();
}

export async function retomarAlvo(fonte: string, alvo: string) {
  await exigirAcao("monitoramento", "editar");
  await bancoPronto();
  await sql`update captura_estado set pausado_ate = null, falhas_seguidas = 0 where fonte = ${fonte} and alvo = ${alvo}`;
  atualizar();
}

/** Abre o teor no tribunal. Registra ciência da intimação: só por decisão explícita do advogado. */
export async function abrirTeorAviso(intimacaoId: string): Promise<EstadoFormulario> {
  await exigirAcao("intimacoes", "editar");
  await bancoPronto();
  const [aviso] = await sql<{ conectorId: string; idAviso: string; numeroProcesso: string; teorAbertoEm: Date | null }[]>`
    select conector_id, id_aviso, numero_processo, teor_aberto_em from mni_avisos where intimacao_id = ${intimacaoId}`;
  if (!aviso) return { ok: false, mensagem: "Esta intimação não veio de um aviso do MNI." };

  const [conector] = await sql<ConectorLinha[]>`
    select id, tribunal, grau, url, modo, certificado_id, id_consultante, senha_consultante_cifrada, consultar_avisos, ativo
    from mni_conectores where id = ${aviso.conectorId}`;
  try {
    const { cliente, certificadoId } = await montarCliente(sql, conector);
    const comunicacoes = await cliente.consultarTeorComunicacao(aviso.numeroProcesso, aviso.idAviso);
    const teor = comunicacoes.map((c) => c.teor).filter(Boolean).join("\n\n") || "O tribunal não devolveu teor.";
    await sql`update mni_avisos set teor_aberto_em = now() where conector_id = ${aviso.conectorId} and id_aviso = ${aviso.idAviso}`;
    await sql`update intimacoes set teor = ${teor}, publicacao = ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Belem" })} where id = ${intimacaoId}`;
    await sql`insert into certificado_usos (certificado_id, operacao, alvo, sucesso) values (${certificadoId}, 'consultarTeorComunicacao', ${aviso.idAviso}, true)`;
    atualizar();
    return { ok: true, mensagem: "Teor aberto. A ciência foi registrada no tribunal hoje." };
  } catch (erro) {
    return { ok: false, mensagem: erro instanceof Error ? erro.message : String(erro) };
  }
}

/** Confere se a chave mestra abre um pacote de teste — usado pelo painel para avisar chave trocada. */
export async function conferirChaveMestra() {
  await exigirAcao("configuracoes", "ver");
  try {
    return decifrar(cifrar(Buffer.from("ok"), "teste"), "teste").toString() === "ok";
  } catch {
    return false;
  }
}
