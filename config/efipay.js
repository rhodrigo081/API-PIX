const Gerencianet = require('sdk-node-apis-efi');
require('dotenv').config();

// Credenciais da conta bancária
const efiOptions = {
    sandbox:        process.env.GN_SANDBOX === 'true',
    client_id:      process.env.GN_CLIENT_ID,
    client_secret:  process.env.GN_CLIENT_SECRET,
    certificate:    process.env.GN_CERTIFICATE_PATH,
    password:       process.env.GN_CERTIFICATE_PASSWORD || '',
};

const efi = new Gerencianet(efiOptions);

module.exports = efi;