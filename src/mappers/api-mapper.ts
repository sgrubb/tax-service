import { SalesEvent, TaxPayment, Amendment } from "../types/domain-types";
import {
  SalesEventRequest,
  TaxPaymentRequest,
  AmendSaleRequest,
} from "../validators/schemas";

export function mapSalesEventRequest(request: SalesEventRequest): SalesEvent {
  const { eventType, ...salesEvent } = request;
  return salesEvent;
}

export function mapTaxPaymentRequest(request: TaxPaymentRequest): TaxPayment {
  const { eventType, ...taxPayment } = request;
  return taxPayment;
}

export function mapAmendSaleRequest(request: AmendSaleRequest): Amendment {
  const { date, invoiceId, itemId, cost, taxRate } = request;
  return {
    date,
    invoiceId,
    item: { itemId, cost, taxRate },
  };
}
