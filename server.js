import app from "./src/app.js"; 
import webhookConfig from "./src/middleware/EFIAuth.js"; 

app.listen(async () => {
  try {
    webhookConfig();
  } catch (error) {
    throw new ExternalError(`Erro ao configurar webhook: `);
  }
});
