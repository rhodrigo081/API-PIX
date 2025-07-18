const express = require("express");
const router = express.Router();
const DonationService = require("../service/DonationService");
const { ExternalError } = require("../utils/Errors");
const donationServiceInstance = new DonationService();
/**
 * Rota POST /api/webhook
 * Ponto de entrada base para configuração de webhooks
 * @returns {200} - Confirma que o webhook base está configurado
 */
router.post("/", async (req, res) => {
  res
    .status(200)
    .send(
      "Webhook base configurado. Aguardando notificações em /api/webhook/pix."
    );
});

/**
 * Rota POST /api/webhook/pix
 * Lida com notificações de webhook de pagamento
 * @param {object} req.body - O payload completo da notificação
 * @param {Array<object>} req.body.pix - Um array de objetos notificação Pix
 * @returns {200} - Confirmação de recebimento
 * @returns {500} - Erro interno
 */
router.post("/pix", async (req, res) => {
  try {
    const pixNotificationData = req.body.pix;

    if (
      !Array.isArray(pixNotificationData) ||
      pixNotificationData.length === 0
    ) {
      return res.status(200).send("Nenhum dado de notificação processado.");
    }

    let successfulProcesses = 0;
    const failedTxIds = [];

    for (const pixPayload of pixNotificationData) {
      const txId = pixPayload.txid;

      if (!txId) {
        continue;
      }

      try {
        await donationServiceInstance.handlePixWebhook(pixPayload);
        successfulProcesses++;
      } catch (error) {
        throw new ExternalError();
      }
    }
    if (successfulProcesses > 0 && failedTxIds.length === 0) {
      res.status(200).send("Pix recebido e processado com sucesso.");
    } else if (successfulProcesses > 0 && failedTxIds.length > 0) {
      res
        .status(200)
        .send(
          `Pix recebido. ${successfulProcesses} processados com sucesso. Falha em ${
            failedTxIds.length
          } transações: [${failedTxIds.join(", ")}].`
        );
    } else {
      res
        .status(200)
        .send(
          "Nenhuma notificação Pix válida para processamento encontrada ou todas falharam."
        );
    }
  } catch (error) {
    res.status(500).send("Erro interno ao processar o webhook.");
  }
});

export default router;
