const admin = require("../config/db");
const {
  ValidationError,
  DatabaseError,
  ExternalError,
  NotFoundError,
} = require("../errors/Errors");
const DonationModel = require("../models/Donation");
const pixService = require("./PixService");

class DonationService {
  /**
   * @param {object} data
   * @returns {object}
   * @throws {Error}
   */
  async createDonation(data) {
    const { donorCPF, donorName, amount } = data;

    if (!donorCPF || !donorName || !amount) {
      throw new ValidationError(
        "Todos os campos são obrigatórios (CPF, Nome, Valor)!"
      );
    }

    if (parseFloat(amount) <= 0) {
      throw new ValidationError("O valor da doação deve ser maior que 0.");
    }

    const cleanedCPF = donorCPF.replace(/\D/g, "");
    if (cleanedCPF.length !== 11) {
      throw new ValidationError("CPF Inválido!");
    }

    try {
      const pixChargeDetails = await pixService.createImmediatePixCharge({
        amount,
        donorCPF: cleanedCPF,
        donorName,
      });

      return {
        donorCPF,
        donorName,
        amount: parseFloat(amount),
        txId: pixChargeDetails.txId,
        locId: pixChargeDetails.locId,
        qrCode: pixChargeDetails.qrCode,
        copyPaste: pixChargeDetails.copyPaste,
        status: "AGUARDANDO_PAGAMENTO",
        createdAt: pixChargeDetails.createdAt,
      };
    } catch (error) {
      if (erro instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }

      throw new ExternalError(`Falha ao gerar cobrança Pix: ${error}`);
    }
  }

  /**
   * @param {object} rawWebhookPayload
   * @returns {DonationModel|null}
   * @throws {Error}
   */
  async handlePixWebhook(rawWebhookPayload) {
    const txId = rawWebhookPayload.txid;

    if (!txId) {
      throw new ValidationError(
        "Id de transação ausente no payload do webhook"
      );
    }

    let donation = await this.getDonationByTxId(txId);

    try {
      const efiChargeDetails = await pixService.getPixDetails(txId);

      const officialStatus = efiChargeDetails.status;
      const valorOriginal = efiChargeDetails.valor.original;
      const devedorEfi = efiChargeDetails.devedor;

      const isPaymentConfirmed = officialStatus === "CONCLUIDA";

      if (isPaymentConfirmed) {
        if (donation) {
          if (donation.status !== "PAGA") {
            donation.status = "PAGA";
            await donation.save();
          }
        } else {
          const donorCPFFromEfi = devedorEfi?.cpf;
          const donorNameFromEfi = devedorEfi?.nome;
          const amountFromEfi = parseFloat(valorOriginal);

          if (!donorCPFFromEfi || !donorNameFromEfi || !amountFromEfi) {
            throw new ValidationError(
              `Dados insuficientes ou inválidos da EFI para criar nova doação: ${JSON.stringify(
                devedorEfi
              )} - R$ ${valorOriginal}`
            );
          }

          const newDonation = new DonationModel({
            donorCPF: donorCPFFromEfi,
            donorName: donorNameFromEfi,
            amount: amountFromEfi,
            txId: efiChargeDetails.txid,
            locId: efiChargeDetails.loc?.id || null,
            qrCode: efiChargeDetails.location || null,
            copyPaste: efiChargeDetails.pixCopiaECola || null,
            status: "PAGA",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          await newDonation.save();
          donation = newDonation;
        }
      } else if (donation) {
        if (donation.status !== officialStatus) {
          donation.status = officialStatus;
          await donation.save();
        }
      } else {
        donation = null;
      }
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof DatabaseError
      ) {
        throw error;
      } else if (error.response) {
        throw new ExternalError(
          `Erro ao obter detalhes da cobrança Pix: ${error}`
        );
      }

      throw new DatabaseError(`Erro inesperado ao processar transação ${txId}`);
    }

    return donation;
  }

  /**
   * @param {string} id
   * @returns {DonationModel|null}
   * @throws {Error}
   */
  async getDonationById(id) {
    if (!id) {
      throw new ValidationError("O ID é obrigatório!");
    }
    try {
      const donationSearched = await DonationModel.findById(id);
      if (donationSearched) {
        throw new NotFoundError(`Doação com ID ${id} não encontrada.`);
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Erro ao buscar doação por ID: ${id}, ${error}`);
    }
  }

  /**
   * @param {string} donorName
   * @returns {DonationModel[]}
   * @throws {Error}
   */
  async getDonationByDonorName(donorName) {
    if (
      !donorName ||
      typeof donorName !== "string" ||
      donorName.trim() === ""
    ) {
      throw new ValidationError("O nome do doador é obrigatório");
    }
    try {
      return await DonationModel.findByDonorName(donorName);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError(
        `Erro ao buscar doações por nome do doador: ${donorName}, ${error.message}`
      );
    }
  }
}

module.exports = new DonationService();
