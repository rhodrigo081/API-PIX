 const crypto = require("crypto");

/**
 * @param {object} req
 * @param {object} res
 * @param {function} next
 */

function validateWebhookSignature(req, res, next) {
  const signature = req.get("x-webhook-signature");
  if (!signature) {
    console.warn(
      "Webhook recebido sem assinatura 'x-webhook-signature'. Rejeitando."
    );
    return res.status(403).send("Forbidden: Assinatura ausente.");
  }

  const bodyToSign = req.rawBody
    ? req.rawBody.toString("utf8")
    : JSON.stringify(req.body);

  try {
    const calculatedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(bodyToSign)
      .digest("hex");

    if (calculatedSignature === signature) {
      console.log("Assinatura do webhook validada com sucesso!");

      next();
    } else {
      console.error("Assinatura do webhook inválida. Rejeitando.");
      return res.status(403).send("Forbidden: Assinatura inválida.");
    }
  } catch (error) {
    console.error("Erro no cálculo da assinatura do webhook:", error);
    return res
      .status(500)
      .send("Erro interno ao validar assinatura do webhook.");
  }
}

module.exports = { validateWebhookSignature }; 
