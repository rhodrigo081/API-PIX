import express from "express";
import authenticateToken from "../middleware/auth.js";
import { PartnerService } from "./../service/PartnerService.js";
const router = express.Router();
const partnerServiceInstance = new PartnerService();

router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const allPartners = await PartnerService.allpartners(page, limit);

    if (allPartners) {
      return res.status(200).json(allPartners);
    } else {
      return res.status(404).json("Nenhum Parceiro.");
    }
  } catch (error) {
    next(error);
  }
});

router.post("/cadastrar", authenticateToken, async (req, res, next) => {
  try {
    const { cpf, name, cim, degree, profession } = req.body;

    const partnerDetails = await partnerServiceInstance.createPartner({
      cpf,
      name,
      cim,
      degree,
      profession,
    });

    res.status(201).json(partnerDetails);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/pesquisar/:searchParam",
  authenticateToken,
  async (req, res, next) => {
    try {
      const { searchParam } = req.params;

      const page = parseInt(req.query.page) || 1;
      const limit = 10;

      const result = await PartnerService.searchPartners(
        searchParam,
        page,
        limit
      );

      if (result) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json("Nenhum parceiro encontrado.");
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;