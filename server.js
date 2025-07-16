const app = require("./src/app"); 
const { webhookConfig } = require("./src/middleware/EFIAuth"); 

app.listen(async () => {
  try {
    webhookConfig();
  } catch (error) {
    throw new ExternalError(`Erro ao configurar webhook: `);
  }
});
