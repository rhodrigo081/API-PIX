import Gerencianet from "gn-api-sdk-node";
import fs from "fs";
import path from "path";

// Arquivo temporário
const tempDir = "/tmp";
const certFileName = "homologacao-791074-Pix.p12";
const certPath = path.join(tempDir, certFileName);

// Verifica se a variável de ambiente do certificado está definida
if (!process.env.GN_CERTIFICATE_PATH) {
  throw new Error("GN_CERTIFICATE_PATH não configurado.");
}

// Tenta decodificar o Base64 e escrever o arquivo do certificado no /tmp
try {
  const buffer = Buffer.from(process.env.GN_CERTIFICATE_PATH, "base64");
  fs.writeFileSync(certPath, buffer);
  console.log(`Certificado PIX gravado com sucesso em: ${certPath}`);
} catch (error) {
  console.error(
    `ERRO: Falha ao gravar o certificado PIX em ${certPath}. Detalhes:`,
    error.message
  );
  throw new Error("Falha crítica ao carregar o certificado PIX.");
}

// Credenciais da conta bancária
const efiOptions = {
  // Converte a string "true"/"false" para booleano
  sandbox: process.env.GN_SANDBOX === "true",
  client_id: process.env.GN_CLIENT_ID,
  client_secret: process.env.GN_CLIENT_SECRET,
  // AGORA, passe o caminho do arquivo temporário
  certificate: certPath,
  certificate_pass: process.env.GN_CERTIFICATE_PASSWORD || "",
};

const efi = new Gerencianet(efiOptions);
export default efi;
