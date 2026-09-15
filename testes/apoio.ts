import forge from "node-forge";

/** Gera um A1 de teste no formato ICP-Brasil (CN = NOME:CPF), com criptografia 3DES antiga. */
export function gerarPfx(opcoes: { senha?: string; cn?: string; dias?: number; algoritmo?: "3des" | "aes256" } = {}) {
  const chaves = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = chaves.publicKey;
  cert.serialNumber = "01";
  const agora = new Date();
  cert.validity.notBefore = new Date(agora.getTime() - 86_400_000 * 2);
  cert.validity.notAfter = new Date(agora.getTime() + 86_400_000 * (opcoes.dias ?? 365));
  const atributos = [{ name: "commonName", value: opcoes.cn ?? "FULANA DE TAL:12345678901" }, { name: "countryName", value: "BR" }];
  cert.setSubject(atributos);
  cert.setIssuer([{ name: "commonName", value: "AC TESTE WLAW" }]);
  cert.sign(chaves.privateKey, forge.md.sha256.create());
  const asn1 = forge.pkcs12.toPkcs12Asn1(chaves.privateKey, [cert], opcoes.senha ?? "segredo", { algorithm: opcoes.algoritmo ?? "3des" });
  return Buffer.from(forge.asn1.toDer(asn1).getBytes(), "binary");
}
