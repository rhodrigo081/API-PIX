const Gerencianet = require("gn-api-sdk-node");
const fs = require("fs");
const path = require("path");

const tempDir = "/tmp";
const certFileName = "homologacao-791074-Pix.p12";
const certPath = path.join(tempDir, certFileName);

if (!process.env.GN_CERTIFICATE_PATH) {
  console.error("Variável de ambiente GN_CERTIFICATE_PATH não encontrada. O certificado PIX é obrigatório.");
  throw new Error("GN_CERTIFICATE_PATH não configurado. Certificado PIX não pode ser carregado.");
}

try {
  const buffer = Buffer.from(process.env.GN_CERTIFICATE_PATH, "base64");
  fs.writeFileSync(certPath, buffer);
  console.log("Certificado PIX escrito com sucesso em:", certPath);
} catch (error) {
  console.error("Erro ao escrever o certificado PIX no disco:", error);
  throw new Error("Falha ao escrever o certificado PIX no disco. Verifique as permissões ou o caminho.");
}


// Credenciais da conta bancária
const efiOptions = {
  sandbox:          process.env.GN_SANDBOX,
  client_id:        process.env.GN_CLIENT_ID,
  client_secret:    process.env.GN_CLIENT_SECRET,
  certificate:      process.env.GN_CERTIFICATE_PATH,
  certificate_pass: process.env.GN_CERTIFICATE_PASSWORD || "",
};

try {
  const efi = new Gerencianet(efiOptions);
  module.exports = efi;
  console.log("Integração Gerencianet/Efí inicializada com sucesso!");
} catch (error) {
  console.error("Erro ao inicializar a integração Gerencianet/Efí:", error);
  throw new Error("Falha na inicialização da integração Pix com a Gerencianet/Efí.");
}
module.exports = efi;
