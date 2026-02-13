import { Item, SalesEvent, TaxPayment, TaxPosition } from "./domain-types";

export type SalesEventRequest = { eventType: "SALES" } & SalesEvent;

export type TaxPaymentRequest = { eventType: "TAX_PAYMENT" } & TaxPayment;

export type AmendSaleRequest = { date: string; invoiceId: string } & Item;

export type TaxPositionResponse = TaxPosition;
