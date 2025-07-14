const express = require("express");
const router = express.Router();
const donationService = require("../service/DonationService");
const Donation = require("../models/Donation");
const { success } = require("../utils/Logger");
const { DatabaseError, ValidationError } = require("../utils/Errors");

/**
 * Rota POST /api/doacoes
 * Gera Nova cobrança pix para uma doação
 * @param {object} req.body - Dados da doação no corpo da requisição
 * @param {string} req.body.donorCPF - CPF do doador
 * @param {string} req.body.donorName - Nome do doador
 * @param {number} req.body.amount - Valor da doação
 * @returns {201} - Mensagem de sucesso
 * @returns {400} - Erro de validação
 * @returns {502} - Erro de serviço externo
 * @returns {500} - Erro interno
 */
router.post("/", async (req, res, next) => {
  try {
    const { donorCPF, donorName, amount } = req.body;

    // Chama o serviço para criação da doação e cobrança pix
    const pixDetails = await donationService.createDonation({
      donorCPF,
      donorName,
      amount,
    });

    res.status(201).json({
      message: [
        `Doador: ${donorName} - Valor: R$ ${amount}`,
        `Transação: ${pixDetails.txId}`,
        `QR Code: ${pixDetails.qrCode}`,
        `Copia e Cola: ${pixDetails.copyPaste}`,
      ],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Rota GET /api/doacoes/id/:id
 * Busca doação específica através do ID
 * @param {string} req.params.id - ID único da doação
 * @returns {200} - Objeto com os detalhes da doação
 * @returns {404} - Se o ID não corresponde a nenhuma doação
 * @returns {400} - Erro de validação
 * @returns {500} - Erro de banco ded dados ou erro interno do servidor
 */
router.get("/id/:id", async (req, res, next) => {
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

/**
 * Rota GET /api/doacoes/nome-do-doador/:donorName
 * Busca doação pelo nome do doador
 * @param {string} req.params.donorName - O nome do doador
 * @returns {200} - Array das doações, pode ser vazio se nada for encontrado
 * @returns {404} - Se o nome não corresponde a nenhuma doação
 * @returns {400} - Erro de validação
 * @returns {500} - Erro de banco de dados ou interno
 */
router.get("/nome-do-doador/:donorName", async (req, res, next) => {
  try {
    const { donorName } = req.params;
    const donations = await donationService.getDonationByDonorName(donorName);

    if (donations.length > 0) {
      res.status(200).json(donations);
    } else {
      res
        .status(404)
        .json({ message: "Nenhuma doação encontrada para este doador." });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/contagem", async (req, res, next) => {
  try {
    const donationsCount = await Donation.totalDonation();
    res.status(200).json(`Total de Doações: ${donationsCount}`);
  } catch (error) {
    next(error);
  }
});

router.get("/contagem/mes", async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      throw new ValidationError(
        "Mês e Ano Obrigatórios."
      );
    }

    const handleMonth = parseInt(month, 10);
    const handleYear = parseInt(year, 10);

    if (isNaN(handleMonth) || isNaN(handleYear)) {
      throw new ValidationError(
        "Mês e Ano Inválidos."
      );
    }

    const donationCount = await Donation.donationByMonth(
      handleMonth,
      handleYear
    );

    res.status(200).json({
      month: handleMonth,
      year: handleYear,
      quantify: donationCount,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
