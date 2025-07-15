const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/Logger");

const serviceAccountPath = process.env.FIREBASE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  // Tornando o erro mais específico e FATAL
  logger.fatal(
    "Erro: Variável de ambiente FIREBASE_ACCOUNT_PATH NÃO DEFINIDA."
  );
  throw new Error("FIREBASE_ACCOUNT_PATH is not defined."); // Lança erro para Vercel logar
}

let serviceAccount;

try {
  // Log o caminho bruto da variável de ambiente
  logger.info(`FIREBASE_ACCOUNT_PATH lido da ENV: ${serviceAccountPath}`);

  const absoluteServiceAccountPath = path.resolve(
    process.cwd(),
    serviceAccountPath
  );
  // Log o caminho absoluto que estamos tentando acessar
  logger.info(
    `Tentando carregar credenciais do Firebase de: ${absoluteServiceAccountPath}`
  );

  // **ADICIONE ESTA VERIFICAÇÃO DE EXISTÊNCIA DE ARQUIVO:**
  if (!fs.existsSync(absoluteServiceAccountPath)) {
    logger.fatal(
      `ERRO FATAL: Arquivo de credenciais do Firebase NÃO ENCONTRADO no caminho: ${absoluteServiceAccountPath}`
    );
    throw new Error(
      `Firebase credentials file not found at: ${absoluteServiceAccountPath}`
    );
  }

  const serviceAccountContent = fs.readFileSync(
    absoluteServiceAccountPath,
    "utf8"
  );
  // Log que o conteúdo foi lido (pode omitir o conteúdo real por segurança, apenas confirmar a leitura)
  logger.info(
    "Conteúdo do arquivo de credenciais do Firebase lido com sucesso."
  );

  serviceAccount = JSON.parse(serviceAccountContent);
  // Log que o JSON foi parseado
  logger.info(
    "Conteúdo do arquivo de credenciais do Firebase parseado com sucesso para JSON."
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
  // Use console.error diretamente, pois ele é garantido de aparecer nos logs da Vercel
  // Isso sobrepõe o logger.fatal por um momento para depuração crítica
  console.error("=================================================");
  console.error("ERRO CRÍTICO NA INICIALIZAÇÃO DO BANCO DE DADOS:");
  console.error("Mensagem do erro:", error.message);
  console.error("Nome do erro:", error.name); // Pode ser útil (ex: TypeError, Error, etc.)
  console.error("Stack trace do erro:");
  console.error(error.stack);
  console.error("=================================================");

  // Ainda mantenha seu logger.fatal para consistência na sua aplicação
  // Mas a informação crucial estará nos console.error acima
  logger.fatal(
    `Falha CRÍTICA ao inicializar Banco de dados Firebase. Ver logs detalhados acima.`
  );

  throw error; // Relança o erro para que o processo Node.js saia com status 1
}

module.exports = admin;
