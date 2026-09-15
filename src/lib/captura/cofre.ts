import "server-only";
import crypto from "node:crypto";
import tls from "node:tls";
import forge from "node-forge";

const VERSAO = 1;

function chaveMestra() {
  const chave = Buffer.from(process.env.WLAW_CHAVE_MESTRA ?? "", "base64");
  if (chave.length !== 32) throw new Error("WLAW_CHAVE_MESTRA ausente ou inválida (precisa de 32 bytes em base64).");
  return chave;
}

/** AES-256-GCM. O contexto (ex.: id do certificado) entra como AAD: o pacote não serve em outro registro. */
export function cifrar(dados: Buffer, contexto: string) {
  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv("aes-256-gcm", chaveMestra(), iv);
  cifra.setAAD(Buffer.from(contexto));
  const conteudo = Buffer.concat([cifra.update(dados), cifra.final()]);
  return Buffer.concat([Buffer.from([VERSAO]), iv, cifra.getAuthTag(), conteudo]);
}

export function decifrar(pacote: Buffer, contexto: string) {
  if (pacote[0] !== VERSAO) throw new Error("Pacote cifrado em versão desconhecida.");
  const decifra = crypto.createDecipheriv("aes-256-gcm", chaveMestra(), pacote.subarray(1, 13));
  decifra.setAAD(Buffer.from(contexto));
  decifra.setAuthTag(pacote.subarray(13, 29));
  return Buffer.concat([decifra.update(pacote.subarray(29)), decifra.final()]);
}

export type DadosCertificado = {
  titular: string;
  cpf: string | null;
  emissor: string;
  validoDe: Date;
  validoAte: Date;
  impressaoDigital: string;
  /** PKCS#12 regravado em AES-256 quando o original usa algoritmos que o OpenSSL 3 recusa. */
  pfx: Buffer;
};

/** Abre o A1, confere senha, chave privada e validade, e devolve um .pfx que o Node consegue usar em mTLS. */
export function inspecionarPfx(arquivo: Buffer, senha: string, agora = new Date()): DadosCertificado {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(arquivo.toString("binary")));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, senha);
  } catch {
    throw new Error("Não consegui abrir o certificado: senha incorreta ou arquivo que não é .pfx/.p12.");
  }

  const bolsas = (tipo: string) => p12.getBags({ bagType: tipo })[tipo] ?? [];
  const chave = [...bolsas(forge.pki.oids.pkcs8ShroudedKeyBag), ...bolsas(forge.pki.oids.keyBag)].find((b) => b.key)?.key;
  if (!chave) throw new Error("O arquivo não traz a chave privada. É preciso o certificado A1 completo.");

  const certificados = bolsas(forge.pki.oids.certBag).flatMap((b) => (b.cert ? [b.cert] : []));
  const chavePublica = forge.pki.setRsaPublicKey((chave as forge.pki.rsa.PrivateKey).n, (chave as forge.pki.rsa.PrivateKey).e);
  const folha =
    certificados.find((c) => forge.pki.publicKeyToPem(c.publicKey) === forge.pki.publicKeyToPem(chavePublica)) ??
    certificados[0];
  if (!folha) throw new Error("O arquivo não traz o certificado do titular.");

  const validoDe = folha.validity.notBefore;
  const validoAte = folha.validity.notAfter;
  if (validoAte < agora) throw new Error(`Certificado vencido em ${validoAte.toLocaleDateString("pt-BR")}.`);
  if (validoDe > agora) throw new Error(`Certificado só vale a partir de ${validoDe.toLocaleDateString("pt-BR")}.`);

  // ICP-Brasil: CN = "NOME DO TITULAR:CPF"
  const cn = String(folha.subject.getField("CN")?.value ?? "");
  const [nome, sufixo] = cn.split(":");
  const der = Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(folha)).getBytes(), "binary");

  let pfx = arquivo;
  try {
    tls.createSecureContext({ pfx, passphrase: senha });
  } catch {
    const regravado = forge.pkcs12.toPkcs12Asn1(chave, certificados, senha, { algorithm: "aes256" });
    pfx = Buffer.from(forge.asn1.toDer(regravado).getBytes(), "binary");
    tls.createSecureContext({ pfx, passphrase: senha });
  }

  return {
    titular: (nome || cn).trim(),
    cpf: sufixo?.match(/\d{11}/)?.[0] ?? null,
    emissor: String(folha.issuer.getField("CN")?.value ?? ""),
    validoDe,
    validoAte,
    impressaoDigital: crypto.createHash("sha256").update(der).digest("hex"),
    pfx,
  };
}
