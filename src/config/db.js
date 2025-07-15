// src/config/firebase.js (ou onde estiver seu código)
const admin = require("firebase-admin");
const logger = require("../utils/Logger");

// 1️⃣ Pega a string JSON da variável de ambiente
const serviceAccountJson = process.env.FIREBASE_ACCOUNT_JSON;

// 2️⃣ Verifica se a variável existe
if (!serviceAccountJson) {
  logger.fatal("Credenciais do Firebase não encontradas em FIREBASE_ACCOUNT_JSON.");
  // opcional: process.exit(1);
}

let serviceAccount;
try {
  // 3️⃣ Converte de volta para objeto
  serviceAccount = JSON.parse(serviceAccountJson);
} catch (err) {
  logger.fatal("JSON inválido em FIREBASE_ACCOUNT_JSON:", err);
  // opcional: process.exit(1);
}

// 4️⃣ Inicializa o Admin SDK apenas uma vez
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    logger.success("Firebase inicializado com sucesso!");
  } catch (err) {
    logger.fatal("Falha na inicialização do Firebase:", err);
    // opcional: process.exit(1);
  }
} else {
  logger.info("Firebase já estava inicializado.");
}

module.exports = admin;
