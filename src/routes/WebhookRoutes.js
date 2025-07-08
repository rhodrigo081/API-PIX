const express = require("express");
const router = express.Router();

router.post('/webhook/pagamento', (req, res) => {
  const dados = req.body;
  console.log('Webhook recebido:', dados);

  if (dados.pix?.[0]?.status === 'CONCLUIDA') {
    salvarDoacaoNoBanco(dados.pix[0]);
  }

  res.sendStatus(200);
});


module.exports = router;
