const { response } = require("express");
const efi = require("../config/efipay");
const { v4: uuidv4 } = require("uuid");

efi["validateMtls"] = false;

class PixService {
  constructor() {
    this.efi = efi;
  }

  /**
   * @param {object} pixData
   * @param {string} pixData.amount
   * @param {string} pixData.donorCPF
   * @param {string} pixData.donorName
   * @returns {Promise<object>}
   * @throws {Error}
   */
  async createImmediatePixCharge(pixData) {
    const { amount, donorCPF, donorName } = pixData;
    const uniqueTxId = uuidv4().replace(/-/g, "");

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

    try {
      const chargeResponse = await this.efi.pixCreateCharge(
        { txid: uniqueTxId },
        pixBody
      );

      const txId = chargeResponse.txid || null;
      const locId = chargeResponse.loc ? chargeResponse.loc.id : null;
      const qrCodeImage = chargeResponse.location || null;
      const copyPastePix = chargeResponse.pixCopiaECola || null;
      const createdAt = chargeResponse.calendario
        ? chargeResponse.calendario.criacao
        : null;

      if (!txId || !locId || !qrCodeImage || !copyPastePix || !createdAt) {
        throw new Error(
          "Falha ao obter dados Pix essenciais da Efí. Resposta incompleta ou inesperada."
        );
      }

      return {
        txId,
        locId,
        qrCode: qrCodeImage,
        copyPaste: copyPastePix,
        createdAt,
      };
    } catch (error) {
      if (error.response && error.response.data) {
        const apiError = error.response.data;
        const errorName =
          apiError.nome || apiError.name || "Erro desconhecido da API";
        const errorDetail =
          apiError.mensagem || apiError.message || JSON.stringify(apiError);
        throw new Error(
          `Erro API Efí ao criar Pix: ${errorName} - ${errorDetail} (Status: ${error.response.status})`
        );
      }
      throw new Error(
        `Erro inesperado ao criar Pix: ${error.message || "Erro desconhecido"}`
      );
    }
  }

  /**
   * @param {string} txId
   * @returns {Promise<object>}
   * @throws {Error}
   */
  async getPixDetails(txId) {
    try {
      const response = await this.efi.pixDetailCharge({ txid: txId });
      return response;
    } catch (error) {
      if (error.response && error.response.data) {
        const apiError = error.response.data;
        const errorName =
          apiError.nome || apiError.name || "Erro desconhecido da API";
        const errorDetail =
          apiError.mensagem || apiError.message || JSON.stringify(apiError);
        throw new Error(
          `Erro API Efí ao consultar Pix: ${errorName} - ${errorDetail} (Status: ${error.response.status})`
        );
      }
      throw new Error(
        `Erro inesperado ao consultar Pix: ${
          error.message || "Erro desconhecido"
        }`
      );
    }
  }
}

module.exports = new PixService();
