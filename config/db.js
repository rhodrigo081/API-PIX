const admin = require('firebase-admin');
require('dotenv').config();

// Armazena as credenciais de serviço do banco de dados
let serviceAccount;

// Execução do banco de dados
try {

    // Converção da string JSON em um objeto
    serviceAccount = JSON.parse(process.env.FIREBASE_ACCOUNT);

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
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