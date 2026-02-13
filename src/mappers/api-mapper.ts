import { SalesEvent, TaxPayment, Amendment, TaxPosition } from "../types/domain-types";
import {
  SalesEventRequest,
  TaxPaymentRequest,
  AmendSaleRequest,
  TaxPositionResponse,
} from "../types/api-types";

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

export function mapTaxPositionResponse(taxPosition: TaxPosition): TaxPositionResponse {
  return taxPosition;
}
