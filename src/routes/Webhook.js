const express = require("express");
const router = express.Router();
const donationService = require("../service/DonationService");

router.post("/webhook/pix", async (req, res) => {
  try {
    const pixNotificationData = req.body.data;

    if (
      !Array.isArray(pixNotificationData) ||
      pixNotificationData.length === 0
    ) {
      console.log("Webhook: Nenhum dado de notificação ou array vazio.");

      return res.status(200).send("Nenhum dado de notificação processado.");
    }

    let hasProcessedSuccessfully = false;

    for (const notification of pixNotificationData) {
      if (notification.type === "charge_paid" && notification.pix) {
        const pixPayLoad = notification.pix;
        try {
          await donationService.handlePixWebhook(pixPayLoad);
          hasProcessedSuccessfully = true;
        } catch (error) {
          console.error(
            "Erro ao processar notificação Pix individual no webhook:",
            error
          );
        }
      } else {
        console.warn(
          "Webhook: Tipo de notificação não tratado ou dados Pix ausentes:",
          notification
        );
      }
    }

    if (hasProcessedSuccessfully) {
      console.log(
        "Webhook Pix recebido e processado com sucesso (pelo menos uma notificação)."
      );
      res.status(200).send("Pix recebido e processado.");
    } else {
      console.log(
        "Webhook Pix recebido, mas nenhuma notificação 'charge_paid' válida foi processada."
      );
      res
        .status(200)
        .send("Nenhuma notificação Pix válida para processamento encontrada.");
    }
  } catch (error) {
    console.error("Erro interno no processamento do webhook Pix:", error);

    res.status(500).send("Erro interno ao processar o webhook.");
  }
});

module.exports = router;
