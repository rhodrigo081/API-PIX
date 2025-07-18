const Gerencianet = require("gn-api-sdk-node");
const fs = require("fs");
const path = require("path");

// Define diretório temporário
const tempDir = "/tmp";
const certFileName = "homologacao-791074-Pix.p12";
const certPath = path.join(tempDir, certFileName);

// Verifica se a variável de ambiente do certificado está definida
if (!process.env.GN_CERTIFICATE_PATH) {
  throw new Error("Certificado não configurado.");
}

// Tenta decodificar o Base64 e escrever o arquivo do certificado no /tmp
try {
  const buffer = Buffer.from(process.env.GN_CERTIFICATE_PATH, "base64");
  fs.writeFileSync(certPath, buffer);
} catch (error) {

  throw new Error("Falha crítica ao carregar o certificado PIX.");
}

// Credenciais da conta bancária
const efiOptions = {
  sandbox: process.env.GN_SANDBOX === "true",
  client_id: process.env.GN_CLIENT_ID,
  client_secret: process.env.GN_CLIENT_SECRET,
  certificate: certPath,
  certificate_pass: process.env.GN_CERTIFICATE_PASSWORD || "",
};

const efi = new Gerencianet(efiOptions);
export default efi;
