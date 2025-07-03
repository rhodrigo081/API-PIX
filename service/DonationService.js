const efi = require("../config/efipay");
const admin = require("../config/db");
const DonationModel = require("../models/Donation");

class DonationService {
  async createDonation(data) {
    const { donorCPF, donorName, donorEmail, amount } = data;

    if (
      !donorCPF ||
      !donorName ||
      !donorEmail ||
      !amount ||
      parseFloat(amount) <= 0
    ) {
      throw new Error(
        "Todos os campos são obrigatórios! E o valor da doação tem que ser maior que 0."
      );
    }

    const cleanedCPF = donorCPF.replace(/\D/g, "");
    if (cleanedCPF.length !== 11) {
      throw new Error("CPF Inválido!");
    }

    try {
      const pixBody = {
        calendario: { expiracao: 3600 },
        devedor: {
          cpf: donorCPF,
          nome: donorName,
        },
        valor: { original: parseFloat(amount).toFixed(2) },
        chave: process.env.GN_PIX_KEY,
        solicitacaoPagador: `Doação Realizada por: ${donorName}`,
      };

      const chargeResponse = await efi.pixCreateImmediateCharge([], pixBody);

      const txId = chargeResponse.txid || null;
      const locId = chargeResponse.loc ? chargeResponse.loc.id : null;
      const qrCodeImage = chargeResponse.location || null;
      const copyPastePix = chargeResponse.pixCopiaECola || null;
      const createdAt = chargeResponse.calendario
        ? chargeResponse.calendario.criacao
        : null;

      if (!txId || !locId || !qrCodeImage || !copyPastePix || !createdAt) {
        console.error("Efí did not return all expected Pix data.", {
          txId,
          locId,
          qrCodeImage,
          copyPastePix,
          createdAt,
        });
        throw new Error(
          "Falha ao obter dados Pix essenciais da Efí. Resposta incompleta."
        );
      }

      const newDonationData = {
        donorCPF,
        donorName,
        donorEmail,
        amount: parseFloat(amount),
        txId,
        locId,
        qrCode: qrCodeImage,
        copyPaste: copyPastePix,
        status: "CRIADA",
        createdAt: createdAt,
      };

      const newDonation = new DonationModel(newDonationData);
      const savedDonation = await newDonation.save();

      return savedDonation;
    } catch (error) {
      if (error.response && error.response.data) {
        const apiError = error.response.data;
        const errorName = apiError.nome || apiError.name || "Erro desconhecido";
        const errorDetail =
          apiError.mensagem || apiError.message || JSON.stringify(apiError);
        throw new Error(`Erro: ${errorName} - ${errorDetail}`);
      }
      throw new Error(`Erro: ${error.message}`);
    }
  }

  async getDonationByTxId(txId) {
    return await DonationModel.findByTxId(txId);
  }

  async getDonationByDonorName(donorName) {
    return await DonationModel.findByDonorName(donorName);
  }

  async updateDonationStatus(docId, newStatus) {
    await DonationModel.updateStatus(docId, newStatus);
  }
}

module.exports = new DonationService();
