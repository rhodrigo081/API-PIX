const admin = require("../config/db");
const db = admin.firestore();
require("dotenv").config();

class Donation {
  constructor({
    id,
    donorCPF,
    donorName,
    donorEmail,
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
    this.donorEmail = donorEmail;
    this.amount = parseFloat(amount);
    this.txId = txId;
    this.locId = locId;
    this.qrCode = qrCode;
    this.copyPaste = copyPaste;
    this.status = status;
    this.createdAt = createdAt || admin.firestore.FieldValue.serverTimestamp();
  }

  async save() {
    const dataToSave = {
      donorName: this.donorName,
      donorEmail: this.donorEmail,
      amount: this.amount,
      txId: this.txId,
      locId: this.locId,
      qrCode: this.qrCode,
      copyPaste: this.copyPaste,
      status: this.status,
      createdAt: this.createdAt,
    };

    let docRef;
    if (this.id) {
      docRef = db.collection("donations").doc(this.id);
      await docRef.set(dataToSave, { merge: true });
    } else {
      docRef = await db.collection("donations").add(dataToSave);
      this.id = docRef.id;
    }
    return { id: this.id, ...dataToSave };
  }

  static async findById(id) {
    try {
      const docRef = db.collection("donations").doc(id);
      const donation = await docRef.get();

      if (donation.exists) {
        return new Donation({ id: donation.id, ...donation.data() });
      }
      return null;
    } catch (error) {
      throw error;
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
      throw error;
    }
  }
}

module.exports = Donation;
