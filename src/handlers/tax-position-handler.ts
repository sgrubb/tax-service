import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";
import { Store } from "../store/store";
import { TaxPositionResponse } from "../types/api-types";
import { DateQuerySchema } from "../validators/schemas";

export function taxPositionHandler(req: Request, res: Response, next: NextFunction, store: Store): void {
  try {
    const { date: requestedDate } = DateQuerySchema.parse(req.query);
    logger.info({ date: requestedDate }, "Querying tax position");

    const amendments = store
      .getAmendments()
      .filter((amendment) => amendment.date <= requestedDate);

    const salesTax = store
      .getSalesEvents()
      .filter((event) => event.date <= requestedDate)
      .reduce((sum, event) => {
        const eventTax = event.items.reduce((itemSum, item) => {
          const applicableAmendments = amendments.filter(
            (amendment) =>
              amendment.invoiceId === event.invoiceId &&
              amendment.item.itemId === item.itemId
          );

          const { cost, taxRate } = applicableAmendments.length > 0
            ? applicableAmendments
                .reduce((latest, current) =>
                  current.date > latest.date ? current : latest
                )
                .item
            : item;

          return itemSum + cost * taxRate;
        }, 0);
        return sum + eventTax;
      }, 0);

    const totalPayments = store
      .getTaxPayments()
      .filter((payment) => payment.date <= requestedDate)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const taxPosition = salesTax - totalPayments;

    if (taxPosition < 0) {
      logger.warn({ date: requestedDate, taxPosition }, "Negative tax position");
    }

    logger.info({ date: requestedDate, taxPosition }, "Tax position calculated");

    const response: TaxPositionResponse = { date: requestedDate, taxPosition };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}
