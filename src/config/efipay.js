const Gerencianet = require("gn-api-sdk-node");
const fs = require("fs");
const path = require("path");

const certPath = path.resolve(___dirname, "cert", "homologacao-791074-Pix.p12");

if(process.env.GN_CERTIFICATE_PATH){
  const buffer = Buffer.from(process.env.GN_CERTIFICATE_PATH, "base64");
  fs.writeFileSync(certPath, buffer)
}

// Credenciais da conta bancária
const efiOptions = {
  sandbox:          process.env.GN_SANDBOX,
  client_id:        process.env.GN_CLIENT_ID,
  client_secret:    process.env.GN_CLIENT_SECRET,
  certificate:      certPath,
  certificate_pass: process.env.GN_CERTIFICATE_PASSWORD || "",
};

const efi = new Gerencianet(efiOptions);

module.exports = efi;
