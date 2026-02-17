import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";
import { Store } from "../store/store";
import { TaxPositionResponse } from "../types/api-types";
import { DateQuerySchema } from "../validators/schemas";

export function taxPositionHandler(req: Request, res: Response, next: NextFunction, store: Store): void {
  try {
    const { companyId, date: requestedDateString } = DateQuerySchema.parse(req.query);
    const requestedDate = new Date(requestedDateString);
    logger.info({ companyId, date: requestedDateString }, "Querying tax position");

    const amendments = store
      .getAmendments()
      .filter((amendment) => amendment.companyId === companyId && amendment.date <= requestedDate);

    const salesTax = store
      .getSalesEvents()
      .filter((event) => event.companyId === companyId && event.date <= requestedDate)
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
      .filter((payment) => payment.companyId === companyId && payment.date <= requestedDate)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const taxPosition = salesTax - totalPayments;

    if (taxPosition < 0) {
      logger.info({ date: requestedDateString, taxPosition }, "Negative tax position");
    }
    logger.info({ date: requestedDateString, taxPosition }, "Tax position calculated");

    const response: TaxPositionResponse = { date: requestedDateString, taxPosition };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}
