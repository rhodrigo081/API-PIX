const express = require("express");
const cors = require("cors");
require("dotenv").config();

require("./config/db");
require("./config/efipay");

const donationRoutes = require("./routes/donationRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", donationRoutes);

app.use("/api", webhookRoutes);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

app.use((err, req, res, next) => {
  console.error("Erro na aplicação:", err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || "Erro interno do servidor.",

    error: process.env.NODE_ENV === "development" ? err : {},
  });
});
