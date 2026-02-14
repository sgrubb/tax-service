import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";
import { Store } from "../store/store";
import { TransactionRequestSchema } from "../validators/schemas";
import { mapSalesEventRequest, mapTaxPaymentRequest } from "../mappers/api-mapper";

export function ingestHandler(req: Request, res: Response, next: NextFunction, store: Store): void {
  try {
    const data = TransactionRequestSchema.parse(req.body);

    if (data.eventType === "SALES") {
      logger.info({ invoiceId: data.invoiceId, date: data.date }, "Ingesting sales event");
      const salesEvent = mapSalesEventRequest(data);
      store.addSalesEvent(salesEvent);
      logger.info({ invoiceId: data.invoiceId, date: data.date }, "Ingested sales event");
    } else {
      logger.info({ date: data.date }, "Ingesting tax payment");
      const taxPayment = mapTaxPaymentRequest(data);
      store.addTaxPayment(taxPayment);
      logger.info({ date: data.date }, "Ingested tax payment");
    }

    res.status(202).send();
  } catch (err) {
    next(err);
  }
}
