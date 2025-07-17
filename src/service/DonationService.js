const admin = require("../config/db");
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");
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
   * @param {object} data - Dados fornecidos pelo doador
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
      if (error instanceof ValidationError || error instanceof DatabaseError) {
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
    let donation = await DonationService.findByTxId(txId);

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

  static async allDonations(page = 1, limit = 10) {
    const offset = (Math.max(1, page) - 1) * limit;

    try {
      const docRef = db.collection("donations");

      const countSnapshot = await docRef.count().get();
      const totalResult = countSnapshot.data().count;

      if (totalResult === 0) {
        return {
          donations: [],
          currentPage: page,
          totalPages: 0,
          totalResults: 0,
          limit: limit,
        };
      }
    } catch (error) {}
  }

  /**
   * Busca doação específica pelo seu ID
   * @param {string} id - O ID da doação a ser buscada
   * @returns {DonationModel} - Doação se encontrada
   * @throws {ValidationError} - Se o ID fornecido for vaizo ou inválido
   * @throws {NotFoundError} - Se nenhuma doação for encontrada
   * @throws {DatabaseError} - Se ocorrer um erro durando a busca no banco de dados
   */
  static async findById(id) {
    // Validação do ID
    if (!id || typeof id !== "string" || id.trim() === "") {
      throw new ValidationError("O ID é obrigatório!");
    }
    // Busca a doação
    try {
      const docRef = db.collection("donations").doc(id);
      const donationSnapshot = await docRef.get();

      if (donationSnapshot.exists) {
        return new DonationModel({
          id: donationSnapshot.id,
          ...donationSnapshot.data(),
        });
      } else {
        throw new NotFoundError("Doação não encontrada.");
      }
      // Caso doação não seja encontrada
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Erro ao buscar doação por ID: ${id}, ${error}`);
    }
  }

  static async findByTxId(txId) {
    try {
      const snapshot = await db
        .collection("donations")
        .where("txId", "==", txId)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        const donation = snapshot.docs[0];
        return new DonationModel({ id: donation.id, ...donation.data() });
      }
      return null;
    } catch (error) {
      throw new DatabaseError(
        `Erro ao buscar doação por TxId: ${error.message}`
      );
    }
  }

  /**
   * Busca doações através do nome do doador
   * @param {string} donorName - O nome do doador
   * @returns {DonationModel[]} - Array das doações que correspondem ao nome do doador
   * @throws {ValidationError} - Se o nome do doador for vazio ou não for uma string
   * @throws {DatabaseError} - Se ocorrer um erro durante a buscar no banco de dados
   */
  static async findByDonorName(donorName) {
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
      const snapshot = await db
        .collection("donations")
        .where("donorName", "==", donorName)
        .get();

      if (!snapshot.empty) {
        const donations = snapshot.docs.map(
          (doc) => new DonationModel({ id: doc.id, ...doc.data() })
        );
        return donations;
      } else {
        return [];
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Erro ao buscar doações por nome do doador: ${donorName}, ${error.message}`
      );
    }
  }

  /**
   * Busca uma doação ou doações por ID, nome do doador ou ID de transação (TxId)
   * Tenta buscar por ID, depois por TxId e, por último, por nome do doador
   *
   * @param {string} searchTerm - Termo a ser buscado (pode ser ID, nome do doador ou TxId)
   * @param {number} [page=1] - Número da página a ser retornada
   * @param {number} [limit=10] - Número de resultados por página
   * @returns {DonationModel | DonationModel[] | null} - A doação, um array de doações ou null se nada for encontrado
   * @throws {ValidationError} - Se o termo de busca for vazio ou inválido
   * @throws {DatabaseError} - Se ocorrer um erro durante a busca no banco de dados
   */
  static async searchDonations(searchTerm, page = 1, limit = 10) {
    if (
      !searchTerm ||
      typeof searchTerm !== "string" ||
      searchTerm.trim() === ""
    ) {
      throw new ValidationError("O termo de busca é obrigatório!");
    }

    const trimmedSearchTerm = searchTerm.trim();
    const offset = (Math.max(1, page) - 1) * limit;

    try {
      let foundDonations = [];
      let totalFound = 0;

      // Tenta buscar por ID
      try {
        const donationById = await this.findById(trimmedSearchTerm);
        if (donationById) {
          foundDonations = [donationById];
          totalFound = 1;
        }
      } catch (error) {
        if (
          !(error instanceof NotFoundError || error instanceof ValidationError)
        ) {
          throw error;
        }
      }

      // Tenta buscar por TxId
      if (foundDonations.length === 0) {
        try {
          const donationByTxId = await this.findByTxId(trimmedSearchTerm);
          if (donationByTxId) {
            foundDonations = [donationByTxId];
            totalFound = 1;
          }
        } catch (error) {
          if (
            !(
              error instanceof NotFoundError || error instanceof ValidationError
            )
          ) {
            throw error;
          }
        }
      }

      // Tenta buscar por nome do doador
      if (foundDonations.length === 0) {
        try {
          const donationByDonorName = await this.findByDonorName(
            trimmedSearchTerm
          );
          if (donationByDonorName) {
            foundDonations = [donationByDonorName];
            totalFound = foundDonations.length;
            if (donationByDonorName.length > 0) {
              foundDonations = donationByDonorName.slice(
                offset,
                offset + limit
              );
            }
          }
        } catch (error) {
          if (
            !(
              error instanceof NotFoundError || error instanceof ValidationError
            )
          ) {
            throw error;
          }
        }
      }

      // Padroniza o retorno: sempre um objeto de paginação
      const totalPages = Math.ceil(totalFound / limit);

      return {
        donations: foundDonations,
        currentPage: page,
        totalPages: totalPages,
        totalResults: totalFound,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Erro geral na busca de doações: ${error.message}`
      );
    }
  }

  static async totalDonation() {
    try {
      const snapshot = await db.collection("donations").count().get();
      return snapshot.data().count;
    } catch (error) {
      throw new DatabaseError(
        `Erro ao obter a contagem total de doações: ${error.message}`
      );
    }
  }

  static async donationByMonth(month, year) {
    if (!month || !year || month < 1 || month > 12 || year < 2025) {
      throw new ValidationError("Mês ou ano inválidos.");
    }

    const startMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const startDateTimestamp = Timestamp.fromDate(startMonth);
    const endDateTimeStamp = Timestamp.fromDate(endMonth);

    try {
      const snapshot = await db
        .collection("donations")
        .where("createdAt", ">=", startDateTimestamp)
        .where("createdAt", "<=", endDateTimeStamp)
        .count()
        .get();

      return snapshot.data().count;
    } catch (error) {
      throw new DatabaseError(
        `Erro ao obter contagem de doações por mês: ${error.message}`
      );
    }
  }

  static async donationByYear(year) {
    if (!year || year < 2025) {
      throw new ValidationError("Ano inválido");
    }

    const startYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const endYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const startDateTimestamp = Timestamp.fromDate(startYear);
    const endDateTimeStamp = Timestamp.fromDate(endYear);

    try {
      const snapshot = await db
        .collection("donations")
        .where("createdAt", ">=", startDateTimestamp)
        .where("createdAt", "<=", endDateTimeStamp)
        .count()
        .get();
      return snapshot.data().count;
    } catch (error) {
      throw new DatabaseError(
        `Erro ao obter total de doações no ano ${year}: ${error.message}`
      );
    }
  }

  static async donationEvolution() {
    try {
      const currentDate = new Date();
      const sixMonthsAgo = new Date();

      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
      sixMonthsAgo.setDate(1);

      const startDateTimestamp = Timestamp.fromDate(sixMonthsAgo);
      const snapshot = await db
        .collection("donations")
        .where("createdAt", ">=", startDateTimestamp)
        .orderBy("createdAt", "asc")
        .get();

      const monthlyData = {};

      snapshot.docs.forEach((doc) => {
        const donation = new DonationModel({ id: doc.id, ...doc.data() });
        const createdAtDate = donation.createdAt.toDate();
        const year = createdAtDate.getFullYear();
        const month = createdAtDate.getMonth() + 1;

        const key = `${year}-${String(month).padStart(2, "0")}`;

        if (!monthlyData[key]) {
          monthlyData[key] = {
            month: month,
            year: year,
            totalDonations: 0,
            totalAmount: 0,
          };
        }
        monthlyData[key].totalDonations += 1;
        monthlyData[key].totalAmount += donation.amount;
      });
      const result = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(currentDate.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${String(month).padStart(2, "0")}`;

        result.unshift(
          monthlyData[key] || {
            month: month,
            year: year,
            totalDonations: 0,
            totalAmount: 0,
          }
        );
      }

      return result;
    } catch (error) {
      throw new DatabaseError(
        `Erro ao obter evolução das doações: ${error.message}`
      );
    }
  }
}

module.exports = DonationService;
