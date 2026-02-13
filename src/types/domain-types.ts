export type Item = {
  itemId: string;
  cost: number;
  taxRate: number;
};

export type SalesEvent = {
  invoiceId: string;
  date: string;
  items: Item[];
};

export type Amendment = {
  date: string;
  invoiceId: string;
  item: Item;
};

export type TaxPayment = {
  date: string;
  amount: number;
};