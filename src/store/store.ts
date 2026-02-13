import { SalesEvent, Amendment, TaxPayment } from "../types/domain-types";

export type Store = {
  salesEvents: SalesEvent[];
  amendments: Amendment[];
  taxPayments: TaxPayment[];
};

export const store: Store = {
  salesEvents: [],
  amendments: [],
  taxPayments: [],
};
