const admin = require("../config/db");
const {
  ValidationError,
  DatabaseError,
  ExternalError,
  NotFoundError,
} = require("../utils/Errors");
const DonationModel = require("../models/Donation");
const pixService = require("./PixService");

// Gerenciamento das operações de doações
class DonationService {
  /**
   * Criação de uma nova doação e cobrança Pix
   * @param {object} data - Dados fornecidos pelo doados
   * @param {string} data.donorCPF - CPF do doador
   * @param {string} data.donorName - Nome do doador
   * @param {number} data.amout - Valor da doação
   * @returns {object}  - Objeto com os detalhes da doação e os dados da cobrança Pix
   * @throws {ValidationError} - Se os dados de entrada forem inválidos ou incompletos
   * @throws {ExternalError} - Se houver falha na comunicação com o serviço Pix
   */
  async createDonation(data) {
    const { donorCPF, donorName, amount } = data;

    // Validação dos campos obrigatórios
    if (!donorCPF || !donorName || !amount) {
      throw new ValidationError(
        "Todos os campos são obrigatórios (CPF, Nome, Valor)!"
      );
    }

    // Validação do valor da doação
    if (parseFloat(amount) <= 0) {
      throw new ValidationError("O valor da doação deve ser maior que 0.");
    }

    // Validação e limpeza do CPF
    const cleanedCPF = donorCPF.replace(/\D/g, "");
    if (cleanedCPF.length !== 11) {
      throw new ValidationError("CPF Inválido!");
    }

    // Criaçao da cobrança Pix
    try {
      const pixChargeDetails = await pixService.createImmediatePixCharge({
        amount,
        donorCPF: cleanedCPF,
        donorName,
      });

      /**
       * Detalhes da doação e da cobrança Pix.
       * A doação só é armazenada no banco de dados quando o webhook de pagamento é recebido
       */
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
   * Verificação do status do pagamento, atualiza o status da doação
   * @param {object} rawWebhookPayload - Payload recebido do webhook Pix
   * @returns {DonationModel} - Doação atualizada
   * @throws {ValidationError} - Se o payload do webhook for inválido ou ausente do txId(ID da transação)
   * @throws {ExternalError} - Se houver falha ao obter detalhes da cobrança do serviço Pix
   * @throws {DatabaseError} - Se ocorrer um erro inesperado na interação com o banco de dados
   */
  async handlePixWebhook(rawWebhookPayload) {
    const txId = rawWebhookPayload.txid;

    // Validação do payload do webhook
    if (!txId) {
      throw new ValidationError(
        "Id de transação ausente no payload do webhook"
      );
    }

    /**
     *  Buscar doaçao existente no banco de dados
     *  Necessária para evitar criação de doação duplicada,
     * caso o webhook seja reenviado
     */
    let donation = await DonationModel.findByTxId(txId);

    // Confirmação de status
    try {
      const efiChargeDetails = await pixService.getPixDetails(txId);

      const officialStatus = efiChargeDetails.status; // Status da cobrança no gateway
      const valorOriginal = efiChargeDetails.valor.original; // Valor da cobrança
      const devedorEfi = efiChargeDetails.devedor; // Dados do devedor

      // Verifica se o pagamento foi confirmado
      const isPaymentConfirmed = officialStatus === "CONCLUIDA";

      if (isPaymentConfirmed) {
        if (donation) {
          // Atualiza o status da doação
          if (donation.status !== "PAGA") {
            donation.status = "PAGA";
            await donation.save();
          }
        } else {
          const donorCPFFromEfi = devedorEfi?.cpf;
          const donorNameFromEfi = devedorEfi?.nome;
          const amountFromEfi = parseFloat(valorOriginal);

          // Valida os dados esseciais recebidos da EFI
          if (!donorCPFFromEfi || !donorNameFromEfi || !amountFromEfi) {
            throw new ValidationError(
              `Dados insuficientes ou inválidos da EFI para criar nova doação: ${JSON.stringify(
                devedorEfi
              )} - R$ ${valorOriginal}`
            );
          }

          // Cria uma nova instância ded doação com os dados completos e status PAGA
          const newDonation = new DonationModel({
            donorCPF: donorCPFFromEfi,
            donorName: donorNameFromEfi,
            amount: amountFromEfi,
            txId: efiChargeDetails.txid,
            locId: efiChargeDetails.loc?.id,
            qrCode: efiChargeDetails.location,
            copyPaste: efiChargeDetails.pixCopiaECola,
            status: "PAGA",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          await newDonation.save();
          donation = newDonation;
        }
      } else if (donation) {
        /**
         * Se o pagamento nao foi confirmado e a doação não existe no banco de dados
         * Atualiza o status da doação para refletir o status oficial do gateway
         * */
        if (donation.status !== officialStatus) {
          donation.status = officialStatus;
          await donation.save();
        }
      } else {
        // Se o pagamento nao foi confirmado, não há doação para atualizar
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
   * Busca doação específica pelo seu ID
   * @param {string} id - O ID da doação a ser buscada
   * @returns {DonationModel} - Doação se encontrada
   * @throws {ValidationError} - Se o ID fornecido for vaizo ou inválido
   * @throws {NotFoundError} - Se nenhuma doação for encontrada
   * @throws {DatabaseError} - Se ocorrer um erro durando a busca no banco de dados
   */
  async getDonationById(id) {
    // Validação do ID
    if (!id || typeof id !== "string" || id.trim() === "") {
      throw new ValidationError("O ID é obrigatório!");
    }
    // Busca a doação
    try {
      return await DonationModel.findById(id);
      // Caso doação não seja encontrada
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Erro ao buscar doação por ID: ${id}, ${error}`);
    }
  }

  /**
   * Busca doações através do nome do doador
   * @param {string} donorName - O nome do doador
   * @returns {DonationModel[]} - Array das doações que correspondem ao nome do doador
   * @throws {ValidationError} - Se o nome do doador for vazio ou não for uma string
   * @throws {DatabaseError} - Se ocorrer um erro durante a buscar no banco de dados
   */
  async getDonationByDonorName(donorName) {
    // Validação do nome do doador
    if (
      !donorName ||
      typeof donorName !== "string" ||
      donorName.trim() === ""
    ) {
      throw new ValidationError("O nome do doador é obrigatório");
    }
    try {
      // Buscar a doação
      return await DonationModel.findByDonorName(donorName);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Erro ao buscar doações por nome do doador: ${donorName}, ${error.message}`
      );
    }
  }
}

module.exports = new DonationService();
