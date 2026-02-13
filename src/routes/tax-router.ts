import { Router } from "express";
import { Store } from "../store/store";
import { taxPositionHandler } from "../handlers/tax-position-handler";

export function createTaxRouter(store: Store): Router {
  const router = Router();

  router.get("/tax-position", (req, res) => taxPositionHandler(req, res, store));

  return router;
}
