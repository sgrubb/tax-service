import { SalesEvent, Amendment, TaxPayment } from "../types/domain-types";

export type Store = {
  addSalesEvent(event: SalesEvent): void;
  addTaxPayment(payment: TaxPayment): void;
  addAmendment(amendment: Amendment): void;
  getSalesEvents(): SalesEvent[];
  getTaxPayments(): TaxPayment[];
  getAmendments(): Amendment[];
};

export function createStore(): Store {
  const salesEvents: SalesEvent[] = [];
  const amendments: Amendment[] = [];
  const taxPayments: TaxPayment[] = [];

  return {
    addSalesEvent(event: SalesEvent): void {
      salesEvents.push(event);
    },
    addTaxPayment(payment: TaxPayment): void {
      taxPayments.push(payment);
    },
    addAmendment(amendment: Amendment): void {
      amendments.push(amendment);
    },
    getSalesEvents(): SalesEvent[] {
      return salesEvents;
    },
    getTaxPayments(): TaxPayment[] {
      return taxPayments;
    },
    getAmendments(): Amendment[] {
      return amendments;
    },
  };
}
