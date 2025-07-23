import admin from "../config/db.js";
const db = admin.firestore();
import { DatabaseError } from "../utils/Errors.js";

export default class Donation {
  constructor({
    id,
    donorCPF,
    donorName,
    donorCIM,
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
    this.donorCIM = donorCIM;
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
      donorCIM: this.donorCIM,
      amount: this.amount,
      txId: this.txId,
      locId: this.locId,
      qrCode: this.qrCode,
      copyPaste: this.copyPaste,
      status: this.status,
      createdAt: this.createdAt instanceof Date ? admin.firestore.Timestamp.fromDate(this.createdAt) : this.createdAt,
    };

    let docRef;
    try {
      if (this.id) {
        docRef = db.collection("donations").doc(this.id);
        await docRef.set(dataToSave, { merge: true });
      } else {
        dataToSave.createdAt = admin.firestore.FieldValue.serverTimestamp();
        docRef = await db.collection("donations").add(dataToSave);
        this.id = docRef.id;
      }
      return { id: this.id, ...dataToSave };
    } catch (error) {
      throw new DatabaseError(`Erro ao salvar a doação: , ${error}`);
    }
  }
}
