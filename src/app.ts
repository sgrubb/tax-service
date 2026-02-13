import express from "express";
import { createStore } from "./store/store";
import { createTransactionsRouter } from "./routes/transactions-router";
import { createTaxRouter } from "./routes/tax-router";

const app = express();
const store = createStore();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "Tax Service API",
    version: "1.0.0",
    endpoints: [
      "POST /transactions",
      "PATCH /sale",
      "GET /tax-position",
    ],
  });
});

app.use("/", createTransactionsRouter(store));
app.use("/", createTaxRouter(store));

export default app;
