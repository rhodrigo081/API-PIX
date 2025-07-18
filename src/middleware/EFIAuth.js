import axios from "axios";
import { ExternalError, ValidationError } from "../utils/Errors.js";

const clientId = process.env.GN_CLIENT_ID;
const clientSecret = process.env.GN_CLIENT_SECRET;
const tokenUrl = process.env.TOKEN_URL;
const authWebhookUrl = process.env.GN_AUTHWEBHOOK_URL;
const publicWebhookUrl = process.env.GN_WEBHOOK_URL;

if (
  !clientId ||
  !clientSecret ||
  !tokenUrl ||
  !authWebhookUrl ||
  !publicWebhookUrl
) {
  throw new ValidationError("Credenciais Inválidas.")
}

let accessToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  if (accessToken && Date.now() < tokenExpiresAt - 60 * 1000) {
    return accessToken;
  }

  console.log("[EFIAuth] Obtendo novo token da Efí...");
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

    const tokenData = response.data;
    accessToken = tokenData.access_token;
    const expiresInSeconds = tokenData.expires_in;

    if (accessToken && expiresInSeconds) {
      tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
      return accessToken;
    } else {
      throw new ExternalError("Resposta incompleta da API de token da Efí.");
    }
  } catch (error) {
    throw new ExternalError(`Erro inesperado ao obter token: ${error.message}`);
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

  const payload = {
    webhookUrl: publicWebhookUrl,
  };

  try {
    const response = await axios.post(authWebhookUrl, payload, {
      headers: headers,
    });
  } catch (error) {
    throw new ExternalError(
      `Erro inesperado ao configurar webhook: ${error.message}`
    );
  }
}

export default webhookConfig;
