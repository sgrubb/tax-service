export type Item = {
  itemId: string;
  cost: number;
  taxRate: number;
};

export type SalesEvent = {
  invoiceId: string;
  date: Date;
  items: Item[];
};

export type Amendment = {
  date: Date;
  invoiceId: string;
  item: Item;
};

export type TaxPayment = {
  date: Date;
  amount: number;
};