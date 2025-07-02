const admin = require("../config/db");
const db = admin.firestore();

class Donation {
    constructor({ id, donorCPF, donorName, donorEmail, amount, txId, locId, qrCode, copyPaste, status = "CRIADA", createdAt }) {
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
            createdAt: this.createdAt
        };

        let docRef;
        if (this.id) {

            docRef = db.collection('donations').doc(this.id);
            await docRef.set(dataToSave, { merge: true });
        } else {
            docRef = await db.collection('donations').add(dataToSave);
            this.id = docRef.id;
        }
        console.log('Doação salva/atualizada com ID:', this.id);
        return { id: this.id, ...dataToSave }; 
    }

    static async findByTxId(txId) {
        const snapshot = await db.collection('donations').where('txId', '==', txId).limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return new Donation({ id: doc.id, ...doc.data() });
        }
        return null;
    }

    static async updateStatus(docId, newStatus) {
        await db.collection('donations').doc(docId).update({ status: newStatus });
    }
}

module.exports = Donation;