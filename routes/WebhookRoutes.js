const express = require("express");
const router = express.Router();
const donationService = require("../service/DonationService");

router.post("/webhook/pix", async (req, res) => {
  console.log("Webhook de Pix recebido!");
  console.log("Payload do Webhook:", JSON.stringify(req.body, null, 2));

  try {
    const pixPayload = req.body;

    if (!pixPayload || !pixPayload.txid) {
      console.warn("Webhook recebido com payload inválido ou txid ausente.");
      return res
        .status(400)
        .json({ message: "Payload do webhook inválido ou txid ausente." });
    }

    const txId = pixPayload.txid;

    const status =
      pixPayload.status || pixPayload.cobrancaStatus || "DESCONHECIDO";

    const donation = await donationService.getDonationByTxId(txId);

    if (donation) {
      await donationService.updateDonationStatus(donation.id, status);
      console.log(
        `Doação com txId ${txId} (ID Firestore: ${donation.id}) atualizada para o status: ${status}`
      );
      res.status(200).json({ message: "Webhook processado com sucesso." });
    } else {
      console.warn(
        `Webhook recebido para txId ${txId}, mas doação não encontrada no Firebase.`
      );
      res
        .status(404)
        .json({ message: "Doação não encontrada para este txId." });
    }
  } catch (error) {
    console.error("Erro ao processar webhook de Pix:", error);
    res.status(500).json({ error: "Erro interno ao processar o webhook." });
  }
});

module.exports = router;
