const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = process.env.FIREBASE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  process.exit(1);
}

let serviceAccount;

try {
  serviceAccount = require(path.resolve(serviceAccountPath));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),

      databaseURL: process.env.FIREBASE_URL,
    });
    console.log("Firebase Admin SDK inicializado com sucesso!");
  } else {
    console.log("Firebase Admin SDK já está em execução!");
  }
} catch (err) {
  console.error("Erro: Falha ao inicializar Firebase Admin SDK.");
  console.error("Detalhes:", err.message);
  console.error(err);
  process.exit(1);
}

module.exports = admin;
