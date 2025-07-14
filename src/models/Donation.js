const admin = require("../config/db");
const db = admin.firestore();
const {
  NotFoundError,
  ValidationError,
  DatabaseError,
} = require("../utils/Errors");

class Donation {
  constructor({
    id,
    donorCPF,
    donorName,
    amount,
    txId,
    locId,
    qrCode,
    copyPaste,
    status,
    createdAt,
  }) {
    this.id = id;
    this.donorCPF = donorCPF;
    this.donorName = donorName;
    this.amount = parseFloat(amount);
    this.txId = txId;
    this.locId = locId;
    this.qrCode = qrCode;
    this.copyPaste = copyPaste;
    this.status = status;
    this.createdAt = createdAt || new Date().toISOString();
  }

  async save() {
    const dataToSave = {
      donorCPF: this.donorCPF,
      donorName: this.donorName,
      amount: this.amount,
      txId: this.txId,
      locId: this.locId,
      qrCode: this.qrCode,
      copyPaste: this.copyPaste,
      status: this.status,
      createdAt: this.createdAt,
    };

    let docRef;
    try {
      if (this.id) {
        docRef = db.collection("donations").doc(this.id);
        await docRef.set(dataToSave, { merge: true });
      } else {
        docRef = await db.collection("donations").add(dataToSave);
        this.id = docRef.id;
      }
      return { id: this.id, ...dataToSave };
    } catch (error) {
      throw new DatabaseError(`Erro ao salvar a doação: , ${error}`);
    }
  }

  static async findById(id) {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        throw new ValidationError("ID inválido.");
      }

      const docRef = db.collection("donations").doc(id);
      const donation = await docRef.get();

      if (donation.exists) {
        return new Donation({ id: donation.id, ...donation.data() });
      } else {
        throw new NotFoundError("Doação não encontrada.");
      }
    } catch (error) {
      throw new DatabaseError(`Erro ao buscar doação: , ${error}`);
    }
  }
  static async findByDonorName(donorName) {
    try {
      const docRef = await db
        .collection("donations")
        .where("donorName", "==", donorName)
        .get();

      if (!docRef.empty) {
        const donations = docRef.docs.map(
          (doc) => new Donation({ id: doc.id, ...doc.data() })
        );
        return donations;
      } else {
        return [];
      }
    } catch (error) {
      throw new DatabaseError(`Erro ao buscar doação: ${error}`);
    }
  }
  static async findByTxId(txId) {
    const snapshot = await db
      .collection("donations")
      .where("txId", "==", txId)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      const donation = snapshot.docs[0];
      return new Donation({ id: donation.id, ...donation.data() });
    }
    return null;
  }

  static async totalDonation(){
    try{
     const snapshot = await db.collection("donations").count().get();
      return snapshot.data().count;
    } catch(error){
      throw new DatabaseError(`Erro ao obter a contagem de doações: ${error.message}`)
    }
  }
}

module.exports = Donation;
