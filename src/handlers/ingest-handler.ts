import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";
import { Store } from "../store/store";
import { TransactionRequestSchema } from "../validators/schemas";
import { mapSalesEventRequest, mapTaxPaymentRequest } from "../mappers/api-mapper";

export function ingestHandler(req: Request, res: Response, next: NextFunction, store: Store): void {
  try {
    const data = TransactionRequestSchema.parse(req.body);

    if (data.eventType === "SALES") {
      logger.info({ eventType: data.eventType, date: data.date }, "Ingesting sales event");
      const salesEvent = mapSalesEventRequest(data);
      store.addSalesEvent(salesEvent);
    } else {
      logger.info({ eventType: data.eventType, date: data.date }, "Ingesting tax payment");
      const taxPayment = mapTaxPaymentRequest(data);
      store.addTaxPayment(taxPayment);
    }

    res.status(202).send();
  } catch (err) {
    next(err);
  }
}
