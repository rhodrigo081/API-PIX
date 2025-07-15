const admin = require("firebase-admin");
const logger = require("../utils/Logger");
// const fs = require("fs"); // No longer needed if using base64 string
// const path = require("path"); // No longer needed

// Caminho do arquivo de credenciais do Banco de dados (agora é o conteúdo base64)
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!serviceAccountBase64) {
  logger.fatal(
    "Erro: Variável de ambiente FIREBASE_SERVICE_ACCOUNT_BASE64 NÃO DEFINIDA."
  );
  throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not defined.");
}

let serviceAccount;

try {
  logger.info("Conteúdo de credenciais do Firebase lido da ENV (Base64).");

  // Decodifica de Base64 e faz o parse do JSON
  const serviceAccountContent = Buffer.from(
    serviceAccountBase64,
    "base64"
  ).toString("utf8");
  serviceAccount = JSON.parse(serviceAccountContent);

  logger.info(
    "Conteúdo de credenciais do Firebase decodificado e parseado com sucesso para JSON."
  );

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    logger.success("Banco de dados inicializado com sucesso!");
  } else {
    logger.info("Banco de dados já está em execução!");
  }
} catch (error) {
  console.error("=================================================");
  console.error("ERRO CRÍTICO NA INICIALIZAÇÃO DO BANCO DE DADOS:");
  console.error("Mensagem do erro:", error.message);
  console.error("Nome do erro:", error.name);
  console.error("Stack trace do erro:");
  console.error(error.stack);
  console.error("=================================================");
  logger.fatal(
    `Falha CRÍTICA ao inicializar Banco de dados Firebase. Ver logs detalhados acima.`
  );
  throw error;
}

module.exports = admin;
