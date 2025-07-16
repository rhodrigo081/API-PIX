const axios = require("axios");

const { ExternalError } = require("../utils/Errors");

const clientId = process.env.GN_CLIENT_ID;
const clientSecret = process.env.GN_CLIENT_SECRET;

const tokenUrl = process.env.TOKEN_URL;
const webhookUrl = process.env.GN_WEBHOOK_URL;

let acessToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  if (acessToken && Date.now() < tokenExpiresAt - 60 * 1000) {
    return acessToken;
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    };

    const payload = {
      grant_type: "client_credentials",
    };

    const response = await axios.post(tokenUrl, payload, { headers: headers });

    const tokeData = response.data;
    acessToken = tokeData.acessToken;
    const expireInSeconds = tokeData.expires_in;

    if (acessToken && expireInSeconds) {
      tokenExpiresAt = Date.now() + expireInSeconds * 1000;
      return acessToken;
    } else {
      return null;
    }
  } catch (error) {
    throw new ExternalError(`Erro ao obter toke: ${error}`);
  }
}

async function webhookConfig() {
  const token = await getToken();

  if (!token) {
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const payLoad = {
    webhookUrl: process.env.GN_WEBHOOK_URL,
  };

  try{

    const response = await axios.post(webhookUrl, payLoad, {headers: headers});

  } catch(error){
    throw new ExternalError(`Erro ao configurar webhook: ${error}`)
  }
}

module.exports = {webhookConfig}