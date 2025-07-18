import Gerencianet from "gn-api-sdk-node";
import fs from "fs"; // Importe o módulo fs
import path from "path"; // Importe o módulo path

// Define o diretório temporário no Vercel. Este é o único local gravável.
const tempDir = "/tmp"; 
const certFileName = "homologacao-791074-Pix.p12"; // Nome do arquivo do certificado
const certPath = path.join(tempDir, certFileName); // Caminho completo do arquivo temporário

// Verifica se a variável de ambiente do certificado está definida
if (!process.env.GN_CERTIFICATE_PATH) {
  console.error("ERRO: Variável de ambiente GN_CERTIFICATE_PATH não encontrada. Certificado PIX é obrigatório.");
  throw new Error("GN_CERTIFICATE_PATH não configurado.");
}

// Tenta decodificar o Base64 e escrever o arquivo do certificado no /tmp
try {
  const buffer = Buffer.from(process.env.GN_CERTIFICATE_PATH, "base64");
  fs.writeFileSync(certPath, buffer);
  console.log(`Certificado PIX gravado com sucesso em: ${certPath}`);
} catch (error) {
  console.error(`ERRO: Falha ao gravar o certificado PIX em ${certPath}. Detalhes:`, error.message);
  // Lança o erro para impedir que a aplicação continue sem o certificado
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

try {
  const efi = new Gerencianet(efiOptions);
  module.exports = efi;
  console.log("Integração Gerencianet/Efí inicializada com sucesso!");
} catch (error) {
  console.error("ERRO: Falha ao inicializar a integração Gerencianet/Efí. Detalhes:", error.message);
  throw new Error("Falha na inicialização da integração Pix.");
}