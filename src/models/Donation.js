const admin = require("../config/db");
const db = admin.firestore();
const {
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
    this.createdAt = createdAt;
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
}

module.exports = Donation;
