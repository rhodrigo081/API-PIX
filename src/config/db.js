const admin = require("firebase-admin");
const path = require("path");
const logger = require("../utils/Logger");
const fs = require("fs");
// Caminho do arquivo de credenciais do Banco de dados
const serviceAccountPath = process.env.FIREBASE_ACCOUNT_PATH;

// Verifica se o arquivo está definido
if (!serviceAccountPath) {
  logger.fatal("Não foi possível carregar o banco de dados..");
}

// Armazena as credenciais
let serviceAccount;

// Tratamento da inicilização do banco de dados
try {
  // Contrução de caminho absoluto e carrega o arquivo em JSON
  const absoluteServiceAccountPath = path.resolve(process.cwd(), serviceAccountPath);

  // Lê o conteúdo do arquivo JSON
  const serviceAccountContent = fs.readFileSync(absoluteServiceAccountPath, 'utf8');

  // Passa o conteúdo para um objeto JSON
  serviceAccount = JSON.parse(serviceAccountContent);

  // Inicialização o  banco de dados
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    logger.success("Banco de dados inicializado com sucesso!");
  } else {
    logger.info("Banco de dados já está em execução!");
  }
} catch (error) {
  logger.fatal("Falha ao inicializar Banco de dados.");
}

module.exports = admin;
