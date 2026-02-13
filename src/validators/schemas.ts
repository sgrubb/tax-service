import { z } from "zod";

export const ItemSchema = z.object({
  itemId: z.string(),
  cost: z.number().int().nonnegative(),
  taxRate: z.number().min(0).max(1),
});

export const SalesEventRequestSchema = z.object({
  eventType: z.literal("SALES"),
  invoiceId: z.string(),
  date: z.iso.datetime(),
  items: z.array(ItemSchema).min(1),
});

export const TaxPaymentRequestSchema = z.object({
  eventType: z.literal("TAX_PAYMENT"),
  date: z.iso.datetime(),
  amount: z.number().int().nonnegative(),
});

export const TransactionRequestSchema = z.discriminatedUnion("eventType", [
  SalesEventRequestSchema,
  TaxPaymentRequestSchema,
]);

export const AmendSaleRequestSchema = z
  .object({
    date: z.iso.datetime(),
    invoiceId: z.string(),
  })
  .extend(ItemSchema.shape);

export const DateQuerySchema = z.object({
  date: z.iso.datetime(),
});

export type SalesEventRequest = z.infer<typeof SalesEventRequestSchema>;
export type TaxPaymentRequest = z.infer<typeof TaxPaymentRequestSchema>;
export type AmendSaleRequest = z.infer<typeof AmendSaleRequestSchema>;
