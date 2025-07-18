import express from "express";
const router = express.Router();
import Errors from "../utils/Errors.js";
const { ValidationError } = Errors;
import DonationService from "../service/DonationService.js";
const donationServiceInstance = new DonationService();

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

router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const allDonations = await DonationService.allDonations(page, limit);

    if (allDonations) {
      return res.status(200).json(allDonations);
    } else {
      return res.status(404).json("Nenhuma Doação.");
    }
  } catch (error) {
    next(error);
  }
});

router.post("/gerar", async (req, res, next) => {
  try {
    const { donorCPF, donorName, amount } = req.body;

    // Chama o serviço para criação da doação e cobrança pix
    const pixDetails = await donationServiceInstance.createDonation({
      donorCPF,
      donorName,
      amount,
    });

    res.status(201).json({
      donor: donorName,
      value: amount,
      txId: pixDetails.txId,
      qrCode: pixDetails.qrCode,
      copyPaste: pixDetails.copyPaste,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/pesquisar/:searchParam", authenticateToken, async (req, res, next) => {
  try {
    const { searchParam } = req.params;

    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const result = await DonationService.searchDonations(
      searchParam,
      page,
      limit
    );

    if (result) {
      return res.status(200).json(result);
    } else {
      return res.status(404).json("Nenhuma doação encontrada");
    }
  } catch (error) {
    next(error);
  }
});

router.get("/contagem", authenticateToken, async (req, res, next) => {
  try {
    const donationsCount = await DonationService.totalDonation();
    res.status(200).json(`Total de Doações: ${donationsCount}`);
  } catch (error) {
    next(error);
  }
});

router.get("/contagem/mes", authenticateToken, async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      throw new ValidationError("Mês e Ano Inválidos.");
    }

    const requestedMonth = parseInt(month, 10);
    const requestedYear = parseInt(year, 10);

    if (isNaN(requestedMonth) || isNaN(requestedYear)) {
      throw new ValidationError("Mês e Ano Inválidos.");
    }

    const donationCount = await DonationService.donationByMonth(
      requestedMonth,
      requestedYear
    );

    res.status(200).json({
      month: requestedMonth,
      year: requestedYear,
      quantify: donationCount,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/contagem/ano", authenticateToken, async (req, res, next) => {
  try {
    const { year } = req.query;

    if (!year) {
      throw new ValidationError("Ano Inválido");
    }

    const requestedYear = parseInt(year, 10);

    if (isNaN(requestedYear)) {
      throw new ValidationError("Ano inválido");
    }

    const donationCount = await DonationService.donationByYear(requestedYear);

    res.status(200).json({
      year: requestedYear,
      quantify: donationCount,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/evolucao", authenticateToken, async (req, res, next) => {
  try {
    const evolutionData = await DonationService.donationEvolution();
    res.status(200).json(evolutionData);
  } catch (error) {
    next(error);
  }
});
export default router;
