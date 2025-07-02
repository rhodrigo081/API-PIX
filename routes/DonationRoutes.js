const express = require("express");
const router = express.Router();
const donationService = require("../service/DonationService");

router.post("/doacoes", async (req, res) => {
  try {
    const { donorCPF, donorName, donorEmail, amount } = req.body;

    const newDonation = await donationService.createDonation({
      donorCPF,
      donorName,
      donorEmail,
      amount,
    });

    res.status(201).json({
      message: "Doação criada com sucesso!",
      data: newDonation,
    });
  } catch (error) {
    console.error("Erro na rota POST /api/doacoes:", error);

    const statusCode =
      error.message.includes("obrigatórios") ||
      error.message.includes("API Efí")
        ? 400
        : 500;

    res.status(statusCode).json({
      error: error.message || "Erro interno ao processar a doação.",
    });
  }
});

router.get("/doacoes/:txId", async (req, res) => {
  try {
    const { txId } = req.params;
    const donation = await donationService.getDonationByTxId(txId);

    if (donation) {
      res.status(200).json(donation);
    } else {
      res.status(404).json({ message: "Doação não encontrada." });
    }
  } catch (error) {
    console.error("Erro na rota GET /api/doacoes/:txId:", error);
    res.status(500).json({ error: "Erro interno ao buscar a doação." });
  }
});

module.exports = router;
