import { z } from "zod";

export const ItemSchema = z.object({
  itemId: z.string(),
  cost: z.number().int().nonnegative(),
  taxRate: z.number().min(0).max(1),
});

export const SalesEventRequestSchema = z.object({
  eventType: z.literal("SALES"),
  invoiceId: z.string(),
  date: z.string().datetime(),
  items: z.array(ItemSchema).min(1),
});

export const TaxPaymentRequestSchema = z.object({
  eventType: z.literal("TAX_PAYMENT"),
  date: z.string().datetime(),
  amount: z.number().int().nonnegative(),
});

export const TransactionRequestSchema = z.discriminatedUnion("eventType", [
  SalesEventRequestSchema,
  TaxPaymentRequestSchema,
]);

export const AmendSaleRequestSchema = z
  .object({
    date: z.string().datetime(),
    invoiceId: z.string(),
  })
  .extend(ItemSchema.shape);

export const TaxPositionResponseSchema = z.object({
  date: z.string().datetime(),
  taxPosition: z.number(),
});

export type SalesEventRequest = z.infer<typeof SalesEventRequestSchema>;
export type TaxPaymentRequest = z.infer<typeof TaxPaymentRequestSchema>;
export type AmendSaleRequest = z.infer<typeof AmendSaleRequestSchema>;
export type TaxPositionResponse = z.infer<typeof TaxPositionResponseSchema>;
