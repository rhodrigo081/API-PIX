const express = require("express");
const cors = require("cors");
const errorHandler = require("./src/middleware/ErrorHandler")

require("./src/config/db");
require("./src/config/efipay");

const donationRoutes = require("./src/routes/DonationRoutes");
const webhook = require("./src/routes/Webhook");

const app = express();

app.use(cors());
app.use(
  express.json({
    verify: (req, res, buf) => {
      if (req.originalUrl.startsWith("/api/webhook/pix")) {
        req.rawBody = buf;
      }
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    verify: (req, res, buf) => {
      if (req.originalUrl.startsWith("/api/webhook/pix")) {
        req.rawBody = buf;
      }
    },
  })
);

app.use(errorHandler);
app.use("/api", donationRoutes);
app.use("/api", webhook);

const PORT = process.env.PORT;

app.listen(PORT);

app.use((err, req, res, next) => {
  console.error("Erro na aplicação:", err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || "Erro interno do servidor.",

    error: process.env.NODE_ENV === "development" ? err : {},
  });
});
