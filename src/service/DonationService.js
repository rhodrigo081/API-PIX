const admin = require("../config/db");
const DonationModel = require("../models/Donation");
const pixService = require("./PixService");

class DonationService {
  /**
   * @param {object} data
   * @returns {object}
   * @throws {Error}
   */
  async createDonation(data) {
    const { donorCPF, donorName, donorEmail, amount } = data;

    if (!donorCPF || !donorName || !donorEmail || !amount) {
      throw new Error("Todos os campos são obrigatórios!");
    }

    if (parseFloat(amount) <= 0) {
      throw new Error("O valor da doação deve ser maior que 0.");
    }

    const cleanedCPF = donorCPF.replace(/\D/g, "");
    if (cleanedCPF.length !== 11) {
      throw new Error("CPF Inválido!");
    }

    try {
      const pixChargeDetails = await pixService.createImmediatePixCharge({
        amount,
        donorCPF,
        donorName,
      });

      return {
        donorCPF,
        donorName,
        donorEmail,
        amount: parseFloat(amount),
        txId: pixChargeDetails.txId,
        locId: pixChargeDetails.locId,
        qrCode: pixChargeDetails.qrCode,
        copyPaste: pixChargeDetails.copyPaste,
        status: "ATIVA",
        createdAt: pixChargeDetails.createdAt,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * @param {string} txId
   * @returns {DonationModel|null}
   * @throws {Error}
   */
  async getDonationByTxId(txId) {
    try {
      const db = admin.firestore();
      const querySnapshot = await db
        .collection("donations")
        .where("txId", "==", txId)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return new DonationModel({ id: doc.id, ...doc.data() });
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @param {object} pixPayload
   * @returns {DonationModel|null}
   * @throws {Error}
   */
  async handlePixWebhook(pixPayload) {
    const txId = pixPayload.txid;
    const status =
      pixPayload.status || pixPayload.cobrancaStatus || pixPayload.situacao;

    if (!txId || !status) {
      throw new Error("txId ou status ausente no webhook");
    }

    console.log("Webhook recebido:", { txId, status });

    const donation = await this.getDonationByTxId(txId);
    const isPaymentConfirmed = status === "CONCLUIDA";

    if (isPaymentConfirmed) {
      if (donation) {
        if (donation.status !== "PAGA") {
          donation.status = "PAGA";
          await donation.save();
          console.log("Doação atualizada como paga:", donation.id);
        }
      } else {
        const { valor, pagador: { cpf, nome, email } = {} } = pixPayload;

        if (!valor || !cpf || !nome || !email) {
          throw new Error("Dados insuficientes para registrar nova doação");
        }

        const newDonation = new DonationModel({
          donorCPF: cpf,
          donorName: nome,
          donorEmail: email,
          amount: parseFloat(valor),
          txId,
          locId: pixPayload.loc?.id || null,
          qrCode: pixPayload.qrCode || null,
          copyPaste: pixPayload.brCode || null,
          status: "PAGA",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await newDonation.save();
        console.log("Nova doação registrada:", txId);
        return newDonation;
      }
    } else if (donation) {
      if (donation.status !== status) {
        donation.status = status;
        await donation.save();
        console.log(`Status da doação ${txId} atualizado para: ${status}`);
      }
    } else {
      return null;
    }

    return donation;
  }

  /**
   * @param {string} id
   * @returns {DonationModel|null}
   * @throws {Error}
   */
  async getDonationById(id) {
    try {
      return await DonationModel.findById(id);
    } catch (error) {
      throw new Error(`Erro ao buscar doação por ID: ${error.message}`);
    }
  }

  /**
   * @param {string} donorName
   * @returns {DonationModel[]}
   * @throws {Error}
   */
  async getDonationByDonorName(donorName) {
    try {
      return await DonationModel.findByDonorName(donorName);
    } catch (error) {
      throw new Error(
        `Erro ao buscar doações por nome do doador: ${error.message}`
      );
    }
  }
}

module.exports = new DonationService();
