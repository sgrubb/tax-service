import express from "express";
import request from "supertest";
import { createStore, Store } from "../src/store/store";
import { createTransactionsRouter } from "../src/routes/transactions-router";

function createApp(store: Store) {
  const app = express();
  app.use(express.json());
  app.use("/", createTransactionsRouter(store));
  return app;
}

describe("POST /transactions", () => {
  let store: Store;
  let app: express.Express;

  beforeEach(() => {
    store = createStore();
    app = createApp(store);
  });

  describe("SALES events", () => {
    const validSalesEvent = {
      eventType: "SALES",
      date: "2024-01-15T10:00:00Z",
      invoiceId: "INV-001",
      items: [
        { itemId: "ITEM-1", cost: 1000, taxRate: 0.2 },
      ],
    };

    it("should return 202 for a valid SALES event", async () => {
      await request(app)
        .post("/transactions")
        .send(validSalesEvent)
        .expect(202);
    });

    it("should store the sales event", async () => {
      await request(app)
        .post("/transactions")
        .send(validSalesEvent)
        .expect(202);

      const events = store.getSalesEvents();
      expect(events).toHaveLength(1);
      expect(events[0].invoiceId).toBe("INV-001");
      expect(events[0].items).toHaveLength(1);
    });

    it("should accept multiple items", async () => {
      await request(app)
        .post("/transactions")
        .send({
          ...validSalesEvent,
          items: [
            { itemId: "ITEM-1", cost: 1000, taxRate: 0.2 },
            { itemId: "ITEM-2", cost: 2000, taxRate: 0.1 },
          ],
        })
        .expect(202);

      expect(store.getSalesEvents()[0].items).toHaveLength(2);
    });

    it("should strip eventType from stored sales event", async () => {
      await request(app)
        .post("/transactions")
        .send(validSalesEvent)
        .expect(202);

      const event = store.getSalesEvents()[0] as Record<string, unknown>;
      expect(event).not.toHaveProperty("eventType");
    });

    it("should return 400 for empty items array", async () => {
      await request(app)
        .post("/transactions")
        .send({ ...validSalesEvent, items: [] })
        .expect(400);
    });

    it("should return 400 for float cost", async () => {
      await request(app)
        .post("/transactions")
        .send({
          ...validSalesEvent,
          items: [{ itemId: "ITEM-1", cost: 10.5, taxRate: 0.2 }],
        })
        .expect(400);
    });

    it("should return 400 for negative cost", async () => {
      await request(app)
        .post("/transactions")
        .send({
          ...validSalesEvent,
          items: [{ itemId: "ITEM-1", cost: -100, taxRate: 0.2 }],
        })
        .expect(400);
    });

    it("should return 400 for taxRate greater than 1", async () => {
      await request(app)
        .post("/transactions")
        .send({
          ...validSalesEvent,
          items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 1.5 }],
        })
        .expect(400);
    });

    it("should return 400 for negative taxRate", async () => {
      await request(app)
        .post("/transactions")
        .send({
          ...validSalesEvent,
          items: [{ itemId: "ITEM-1", cost: 1000, taxRate: -0.1 }],
        })
        .expect(400);
    });

    it("should return 400 for invalid date format", async () => {
      await request(app)
        .post("/transactions")
        .send({ ...validSalesEvent, date: "not-a-date" })
        .expect(400);
    });

    it("should return 400 for missing invoiceId", async () => {
      const { invoiceId, ...noInvoice } = validSalesEvent;
      await request(app)
        .post("/transactions")
        .send(noInvoice)
        .expect(400);
    });

    it("should return 400 for missing items", async () => {
      const { items, ...noItems } = validSalesEvent;
      await request(app)
        .post("/transactions")
        .send(noItems)
        .expect(400);
    });
  });

  describe("TAX_PAYMENT events", () => {
    const validTaxPayment = {
      eventType: "TAX_PAYMENT",
      date: "2024-01-15T10:00:00Z",
      amount: 5000,
    };

    it("should return 202 for a valid TAX_PAYMENT event", async () => {
      await request(app)
        .post("/transactions")
        .send(validTaxPayment)
        .expect(202);
    });

    it("should store the tax payment", async () => {
      await request(app)
        .post("/transactions")
        .send(validTaxPayment)
        .expect(202);

      const payments = store.getTaxPayments();
      expect(payments).toHaveLength(1);
      expect(payments[0].amount).toBe(5000);
    });

    it("should strip eventType from stored tax payment", async () => {
      await request(app)
        .post("/transactions")
        .send(validTaxPayment)
        .expect(202);

      const payment = store.getTaxPayments()[0] as Record<string, unknown>;
      expect(payment).not.toHaveProperty("eventType");
    });

    it("should return 400 for float amount", async () => {
      await request(app)
        .post("/transactions")
        .send({ ...validTaxPayment, amount: 50.5 })
        .expect(400);
    });

    it("should return 400 for negative amount", async () => {
      await request(app)
        .post("/transactions")
        .send({ ...validTaxPayment, amount: -100 })
        .expect(400);
    });

    it("should return 400 for invalid date format", async () => {
      await request(app)
        .post("/transactions")
        .send({ ...validTaxPayment, date: "2024-13-99" })
        .expect(400);
    });

    it("should return 400 for missing amount", async () => {
      const { amount, ...noAmount } = validTaxPayment;
      await request(app)
        .post("/transactions")
        .send(noAmount)
        .expect(400);
    });
  });

  describe("invalid requests", () => {
    it("should return 400 for missing eventType", async () => {
      await request(app)
        .post("/transactions")
        .send({ date: "2024-01-15T10:00:00Z" })
        .expect(400);
    });

    it("should return 400 for invalid eventType", async () => {
      await request(app)
        .post("/transactions")
        .send({ eventType: "INVALID", date: "2024-01-15T10:00:00Z" })
        .expect(400);
    });

    it("should return 400 for empty body", async () => {
      await request(app)
        .post("/transactions")
        .send({})
        .expect(400);
    });

    it("should return 400 with error details", async () => {
      const res = await request(app)
        .post("/transactions")
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty("errors");
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe("store isolation", () => {
    it("should not share state between test instances", async () => {
      await request(app)
        .post("/transactions")
        .send({
          eventType: "SALES",
          date: "2024-01-15T10:00:00Z",
          invoiceId: "INV-001",
          items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
        })
        .expect(202);

      const freshStore = createStore();
      expect(freshStore.getSalesEvents()).toHaveLength(0);
      expect(freshStore.getTaxPayments()).toHaveLength(0);
    });
  });
});
