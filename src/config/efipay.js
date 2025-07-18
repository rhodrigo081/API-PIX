import Gerencianet from "gn-api-sdk-node";
import fs from "fs"; 
import path from "path"; 

// Define diretório temporário 
const tempDir = "/tmp"; 
const certFileName = "homologacao-791074-Pix.p12"; 
const certPath = path.join(tempDir, certFileName); 

// Verifica se a variável de ambiente do certificado está definida
if (!process.env.GN_CERTIFICATE_PATH) {
  console.error("ERRO: Variável de ambiente GN_CERTIFICATE_PATH não encontrada. Certificado PIX é obrigatório.");
  throw new Error("GN_CERTIFICATE_PATH não configurado.");
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

try {
  const efi = new Gerencianet(efiOptions);
  module.exports = efi;
} catch (error) {
  throw new Error("Falha na inicialização da integração Pix.");
}