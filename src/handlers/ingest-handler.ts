import { Request, Response } from "express";
import { logger } from "../logger";
import { Store } from "../store/store";
import { TransactionRequestSchema } from "../validators/schemas";
import { mapSalesEventRequest, mapTaxPaymentRequest } from "../mappers/api-mapper";

export function ingestHandler(req: Request, res: Response, store: Store): void {
  const result = TransactionRequestSchema.safeParse(req.body);

  if (!result.success) {
    logger.warn({ errors: result.error.issues }, "Validation failed for ingest request");
    res.status(400).json({ errors: result.error.issues });
    return;
  }

  const data = result.data;

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
}
