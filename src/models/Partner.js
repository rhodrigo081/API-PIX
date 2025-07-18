import admin from "../config/db.js";
const db = admin.firestore();
import { DatabaseError } from "../utils/Errors.js";

export default class Partner {
  constructor({ id, cpf, name, cim, degree, profession }) {
    this.id = id;
    this.cpf = cpf;
    this.name = name;
    this.cim = cim;
    this.degree = degree;
    this.profession = profession;
  }

  async save() {
    const dataToSave = {
      id: this.id,
      cpf: this.cpf,
      name: this.name,
      cim: this.cim,
      degree: this.degree,
      profession: this.profession,
    };

    let docRef;

    try {
      if (this.id) {
        docRef = db.collection("partners").doc(this.id);
        await docRef.set(dataToSave, { merge: true });
      } else {
        docRef = await db.collection("partner").add(dataToSave);
        this.id = docRef.id;
      }
      return { id: this.id, ...dataToSave };
    } catch (error) {
      throw new DatabaseError(`Erro ao salvar parceiro: ${error}`);
    }
  }
}
