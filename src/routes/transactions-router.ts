import { Router } from "express";
import { Store } from "../store/store";
import { ingestHandler } from "../handlers/ingest-handler";
import { amendHandler } from "../handlers/amend-handler";

export function createTransactionsRouter(store: Store): Router {
  const router = Router();

  router.post("/transactions", (req, res, next) => ingestHandler(req, res, next, store));
  router.patch("/sale", (req, res, next) => amendHandler(req, res, next, store));

  return router;
}
