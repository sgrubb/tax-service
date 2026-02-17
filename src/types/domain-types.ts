export type Item = {
  itemId: string;
  cost: number;
  taxRate: number;
};

export type SalesEvent = {
  companyId: string;
  invoiceId: string;
  date: Date;
  items: Item[];
};

export type Amendment = {
  companyId: string;
  date: Date;
  invoiceId: string;
  item: Item;
};

export type TaxPayment = {
  companyId: string;
  date: Date;
  amount: number;
};