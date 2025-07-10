const express = require("express");
const router = express.Router();
const donationService = require("../service/DonationService");
const errorHandler = require("../middleware/ErrorHandler");

router.post("/doacoes", async (req, res) => {
  try {
    const { donorCPF, donorName, amount } = req.body;

    const newDonationDetails = await donationService.createDonation({
      donorCPF,
      donorName,
      amount,
    });

    res.status(201).json({
      message: "Doação Pix gerada com sucesso! Aguardando pagamento.",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/doacoes/id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const donation = await donationService.getDonationById(id);

    if (donation) {
      res.status(200).json(donation);
    } else {
      res.status(404).json({ message: "Doação não encontrada." });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/doacoes/nome-do-doador/:donorName", async (req, res) => {
  try {
    const { donorName } = req.params;
    const donations = await donationService.getDonationByDonorName(donorName);

    if (donations.length > 0) {
      res.status(200).json(donations);
    } else {
      res.status(404).json({ message: "Nenhuma doação encontrada para este doador." });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
