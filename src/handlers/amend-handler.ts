import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";
import { Store } from "../store/store";
import { AmendSaleRequestSchema } from "../validators/schemas";
import { mapAmendSaleRequest } from "../mappers/api-mapper";

export function amendHandler(req: Request, res: Response, next: NextFunction, store: Store): void {
  try {
    const data = AmendSaleRequestSchema.parse(req.body);

    logger.info({ invoiceId: data.invoiceId, itemId: data.itemId, date: data.date }, "Amending sale");
    const amendment = mapAmendSaleRequest(data);
    store.addAmendment(amendment);

    res.status(202).send();
  } catch (err) {
    next(err);
  }
}
