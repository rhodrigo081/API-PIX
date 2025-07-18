import admin from "../config/db.js";
const db = admin.firestore();
import {
  ValidationError,
  DatabaseError,
  NotFoundError,
} from "../utils/Errors.js";
import PartnerModel from "../models/Partner.js";

export class PartnerService {
  /**
   * Cria um novo parceiro no banco de dados.
   * @param {object} data - Os dados do parceiro.
   * @param {string} data.cpf - O CPF do parceiro.
   * @param {string} data.name - O nome do parceiro.
   * @param {string} data.cim - O CIM (Cadastro de Imposto Municipal) do parceiro.
   * @param {string} data.degree - O grau de formação do parceiro.
   * @param {string} data.profession - A profissão do parceiro.
   * @returns {Promise<PartnerModel>} O parceiro recém-criado.
   * @throws {ValidationError} Se algum campo obrigatório estiver faltando, o CPF for inválido ou já existir.
   * @throws {DatabaseError} Se ocorrer um erro relacionado ao banco de dados durante a criação.
   */
  async createPartner(data) {
    const { cpf, name, cim, degree, profession } = data;

    if (!cpf || !name || !cim || !degree || !profession) {
      throw new ValidationError("Todos os campos são obrigatórios!");
    }

    const cleanedCPF = cpf.replace(/\D/g, "");
    if (cleanedCPF.length !== 11) {
      throw new ValidationError("CPF Inválido!");
    }

    try {
      const existingPartner = await PartnerModel.findByCPF(cleanedCPF);
      if (existingPartner) {
        throw new ValidationError("Um parceiro com este CPF já existe!");
      }

      const newPartner = new PartnerModel({
        cpf: cleanedCPF,
        name,
        cim,
        degree,
        profession,
      });

      const savedPartner = await newPartner.save();
      return savedPartner;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Erro ao cadastrar parceiro: ${error.message}`);
    }
  }

  /**
   * Recupera todos os parceiros com paginação.
   * @param {number} [page=1] - O número da página atual.
   * @param {number} [limit=10] - O número de parceiros por página.
   * @returns {Promise<{partners: PartnerModel[], currentPage: number, totalPages: number, totalResults: number, limit: number}>} Lista paginada de parceiros.
   * @throws {DatabaseError} Se ocorrer um erro relacionado ao banco de dados durante a recuperação.
   */
  static async allpartners(page = 1, limit = 10) {
    const offset = (Math.max(1, page) - 1) * limit;
    const collectionRef = db.collection("partners");

    try {
      const countSnapshot = await collectionRef.count().get();
      const totalResults = countSnapshot.data().count;

      if (totalResults === 0) {
        return {
          partners: [],
          currentPage: page,
          totalPages: 0,
          totalResults: 0,
          limit: limit,
        };
      }

      const snapshot = await collectionRef.limit(limit).offset(offset).get();

      const partners = snapshot.docs.map(
        (doc) => new PartnerModel({ id: doc.id, ...doc.data() })
      );

      const totalPages = Math.ceil(totalResults / limit);

      return {
        partners: partners,
        currentPage: page,
        totalPages: totalPages,
        totalResults: totalResults,
        limit: limit,
      };
    } catch (error) {
      throw new DatabaseError(
        `Erro ao buscar todos os parceiros: ${error.message}`
      );
    }
  }

  /**
   * Busca um parceiro específico pelo seu ID.
   * @param {string} id - O ID do parceiro a ser buscado.
   * @returns {Promise<PartnerModel>} O parceiro se encontrado.
   * @throws {ValidationError} Se o ID fornecido for vazio ou inválido.
   * @throws {NotFoundError} Se nenhum parceiro for encontrado com o ID.
   * @throws {DatabaseError} Se ocorrer um erro durante a busca no banco de dados.
   */
  static async findById(id) {
    if (!id || typeof id !== "string" || id.trim() === "") {
      throw new ValidationError("O ID é obrigatório!");
    }
    try {
      const docRef = db.collection("partners").doc(id);
      const partnerSnapshot = await docRef.get();

      if (partnerSnapshot.exists) {
        return new PartnerModel({
          id: partnerSnapshot.id,
          ...partnerSnapshot.data(),
        });
      } else {
        throw new NotFoundError("Parceiro não encontrado.");
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Erro ao buscar parceiro por ID: ${id}, ${error.message}`
      );
    }
  }

  /**
   * Busca um parceiro pelo seu CPF.
   * @param {string} cpf - O CPF do parceiro a ser buscado.
   * @returns {Promise<PartnerModel | null>} O parceiro se encontrado, caso contrário null.
   * @throws {DatabaseError} Se ocorrer um erro relacionado ao banco de dados durante a recuperação.
   */
  static async findByCPF(cpf) {
    try {
      const snapshot = await db
        .collection("partners")
        .where("cpf", "==", cpf)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        const partner = snapshot.docs[0];
        return new PartnerModel({ id: partner.id, ...partner.data() });
      }
      return null;
    } catch (error) {
      throw new DatabaseError(
        `Erro ao buscar parceiro por CPF: ${error.message}`
      );
    }
  }

  /**
   * Busca parceiros através do nome.
   * @param {string} name - O nome do parceiro.
   * @returns {Promise<PartnerModel[]>} Um array de parceiros que correspondem ao nome.
   * @throws {ValidationError} Se o nome do parceiro for vazio ou não for uma string.
   * @throws {DatabaseError} Se ocorrer um erro durante a busca no banco de dados.
   */
  static async findByName(name) {
    if (!name || typeof name !== "string" || name.trim() === "") {
      throw new ValidationError("O nome do parceiro é obrigatório");
    }
    try {
      const snapshot = await db
        .collection("partners")
        .where("name", "==", name)
        .get();

      if (!snapshot.empty) {
        const partners = snapshot.docs.map(
          (doc) => new PartnerModel({ id: doc.id, ...doc.data() })
        );
        return partners;
      } else {
        return [];
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Erro ao buscar parceiros por nome: ${name}, ${error.message}`
      );
    }
  }

  /**
   * Busca um parceiro ou parceiros por ID, CPF ou nome.
   * Tenta buscar por ID, depois por CPF e, por último, por nome.
   *
   * @param {string} searchTerm - Termo a ser buscado (pode ser ID, CPF ou nome).
   * @param {number} [page=1] - Número da página a ser retornada.
   * @param {number} [limit=10] - Número de resultados por página.
   * @returns {Promise<{partners: PartnerModel[], currentPage: number, totalPages: number, totalResults: number}>} Uma lista paginada de parceiros encontrados.
   * @throws {ValidationError} Se o termo de busca for vazio ou inválido.
   * @throws {DatabaseError} Se ocorrer um erro durante a busca no banco de dados.
   */
  static async searchPartners(searchTerm, page = 1, limit = 10) {
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
      let foundPartners = [];
      let totalFound = 0;

      // Tenta buscar por ID
      try {
        const partnerById = await this.findById(trimmedSearchTerm);
        if (partnerById) {
          foundPartners = [partnerById];
          totalFound = 1;
        }
      } catch (error) {
        if (error instanceof DatabaseError) {
          throw error;
        }
      }

      // Se não encontrou por ID, tenta buscar por CPF
      if (foundPartners.length === 0) {
        try {
          const partnerByCPF = await this.findByCPF(trimmedSearchTerm);
          if (partnerByCPF) {
            foundPartners = [partnerByCPF];
            totalFound = 1;
          }
        } catch (error) {
          if (error instanceof DatabaseError) {
            throw error;
          }
        }
      }

      // Se não encontrou por ID ou CPF, tenta buscar por nome
      if (foundPartners.length === 0) {
        try {
          const partnersByName = await this.findByName(trimmedSearchTerm);
          if (partnersByName && partnersByName.length > 0) {
            totalFound = partnersByName.length;
            foundPartners = partnersByName.slice(offset, offset + limit);
          }
        } catch (error) {
          if (error instanceof DatabaseError) {
            throw error;
          }
        }
      }

      const totalPages = Math.ceil(totalFound / limit);

      return {
        partners: foundPartners,
        currentPage: page,
        totalPages: totalPages,
        totalResults: totalFound,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Erro geral na busca de parceiros: ${error.message}`
      );
    }
  }

  /**
   * Obtém a contagem total de parceiros no banco de dados.
   * @returns {Promise<number>} O número total de parceiros.
   * @throws {DatabaseError} Se ocorrer um erro relacionado ao banco de dados durante a contagem.
   */
  static async totalPartner() {
    try {
      const snapshot = await db.collection("partners").count().get();
      return snapshot.data().count;
    } catch (error) {
      throw new DatabaseError(
        `Erro ao obter a contagem total de parceiros: ${error.message}`
      );
    }
  }
}
