import { SalesEvent, TaxPayment, Amendment } from "../types/domain-types";
import {
  SalesEventRequest,
  TaxPaymentRequest,
  AmendSaleRequest,
} from "../validators/schemas";

export function mapSalesEventRequest(request: SalesEventRequest): SalesEvent {
  const { eventType, date, ...rest } = request;
  return { ...rest, date: new Date(date) };
}

export function mapTaxPaymentRequest(request: TaxPaymentRequest): TaxPayment {
  const { eventType, date, ...rest } = request;
  return { ...rest, date: new Date(date) };
}

export function mapAmendSaleRequest(request: AmendSaleRequest): Amendment {
  const { date, invoiceId, itemId, cost, taxRate } = request;
  return {
    date: new Date(date),
    invoiceId,
    item: { itemId, cost, taxRate },
  };
}
