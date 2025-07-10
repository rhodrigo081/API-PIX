const express = require("express");
const router = express.Router();
const donationService = require("../service/DonationService");

router.post("/webhook", async (req, res) => {
  res
    .status(200)
    .send(
      "Webhook base configurado. Aguardando notificações em /api/webhook/pix."
    );
});

router.post("/webhook/pix", async (req, res) => {
  try {
    const pixNotificationData = req.body.pix;

    if (
      !Array.isArray(pixNotificationData) ||
      pixNotificationData.length === 0
    ) {
      return res.status(200).send("Nenhum dado de notificação processado.");
    }

    let hasProcessedSuccessfully = false;

    for (const pixPayload of pixNotificationData) {
      const txId = pixPayload.txid;

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
