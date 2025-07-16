const Gerencianet = require("gn-api-sdk-node");
const path = require("path");

// Credenciais da conta bancária
const efiOptions = {
  sandbox:          process.env.GN_SANDBOX,
  client_id:        process.env.GN_CLIENT_ID,
  client_secret:    process.env.GN_CLIENT_SECRET,
  certificate:      process.env.GN_CERTIFICATE_PATH,
  certificate_pass: process.env.GN_CERTIFICATE_PASSWORD || "",
};

const efi = new Gerencianet(efiOptions);

module.exports = efi;
