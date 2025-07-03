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

router.get("/doacoes/id/:txId", async (req, res) => {
  try {
    const { txId } = req.params;
    const donation = await donationService.getDonationByTxId(txId);

    if (donation) {
      res.status(200).json(donation);
    } else {
      res.status(404).json({ message: "Doação não encontrada." });
    }
  } catch (error) {
    console.error("Erro de rota:", error);
    res.status(500).json({ error: "Erro interno." });
  }
});

router.get("/doacoes/nome-do-doador/:donorName", async (req, res) => {
  try {
    const { donorName } = req.params;
    const donations = await donationService.getDonationByDonorName(donorName);

    if (donations.length > 0) {
      res.status(200).json(donations);
    } else {
      res.status(404).json({ message: "Doador não encontrado." });
    }
  } catch (error) {
    console.error("Erro de rota: ", error);
    res.status(500).json({ error: "Erro interno." });
  }
});

module.exports = router;
