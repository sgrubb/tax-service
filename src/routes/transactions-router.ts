import { Router } from "express";
import { Store } from "../store/store";
import { ingestHandler } from "../handlers/ingest-handler";

export function createTransactionsRouter(store: Store): Router {
  const router = Router();

  router.post("/transactions", (req, res, next) => ingestHandler(req, res, next, store));

  return router;
}
