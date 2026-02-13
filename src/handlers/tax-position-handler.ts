import { Request, Response } from "express";
import { logger } from "../logger";
import { Store } from "../store/store";
import { TaxPositionResponse } from "../types/api-types";
import { DateQuerySchema } from "../validators/schemas";

export function taxPositionHandler(req: Request, res: Response, store: Store): void {
  const result = DateQuerySchema.safeParse(req.query);

  if (!result.success) {
    logger.warn({ errors: result.error.issues }, "Invalid date query parameter");
    res.status(400).json({ errors: result.error.issues });
    return;
  }

  const requestedDate = result.data.date;
  logger.info({ date: requestedDate }, "Querying tax position");

  const salesTax = store
    .getSalesEvents()
    .filter((event) => event.date <= requestedDate)
    .reduce((sum, event) => {
      const eventTax = event.items.reduce(
        (itemSum, item) => itemSum + item.cost * item.taxRate,
        0,
      );
      return sum + eventTax;
    }, 0);

  const totalPayments = store
    .getTaxPayments()
    .filter((payment) => payment.date <= requestedDate)
    .reduce((sum, payment) => sum + payment.amount, 0);

  const taxPosition = salesTax - totalPayments;

  if (taxPosition < 0) {
    logger.info({ date: requestedDate, taxPosition }, "Negative tax position");
  }

  logger.info({ date: requestedDate, taxPosition }, "Tax position calculated");

  const response: TaxPositionResponse = { date: requestedDate, taxPosition };
  res.status(200).json(response);
}
