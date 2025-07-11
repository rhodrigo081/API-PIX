const express = require("express");
const router = express.Router();
const donationService = require("../service/DonationService");

/**
 * Rota POST /api/webhook
 * Ponto de entrada base para configuração de webhooks
 * @returns {200} - Confirma que o webhook base está configurado
 */
router.post("/webhook", async (req, res) => {
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
router.post("/webhook/pix", async (req, res) => {
  try {
    // Extração dos dados da notificação
    const pixNotificationData = req.body.pix;

    // Validação do payload
    if (
      !Array.isArray(pixNotificationData) ||
      pixNotificationData.length === 0
    ) {
      return res.status(200).send("Nenhum dado de notificação processado.");
    }

    // Rastrea se a notificação foi processada com sucesso
    let hasProcessedSuccessfully = false;

    // Itera sobre cada notificação pix no payload
    for (const pixPayload of pixNotificationData) {
      const txId = pixPayload.txid;

      // Se o ID da transação estiver ausente, pula para próxima notificação
      if (!txId) {
        continue;
      }

      try {
        await donationService.handlePixWebhook(pixPayload);
        hasProcessedSuccessfully = true;
      } catch (error) {
        throw error;
      }
    }

    if (hasProcessedSuccessfully) {
      res.status(200).send("Pix recebido e processado.");
    } else {
      res
        .status(200)
        .send("Nenhuma notificação Pix válida para processamento encontrada.");
    }
  } catch (error) {
    res.status(500).send("Erro interno ao processar o webhook.");
  }
});

module.exports = router;
