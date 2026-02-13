import express from "express";
import request from "supertest";
import { createApp } from "../src/app";
import { createStore, Store } from "../src/store/store";

describe("GET /tax-position", () => {
  let store: Store;
  let app: express.Express;

  beforeEach(() => {
    store = createStore();
    app = createApp(store);
  });

  describe("valid requests", () => {
    it("should return 0 with no events", async () => {
      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-01-15T10:00:00Z" })
        .expect(200);

      expect(res.body).toEqual({
        date: "2026-01-15T10:00:00Z",
        taxPosition: 0,
      });
    });

    it("should return correct tax position with a single sales event", async () => {
      store.addSalesEvent({
        invoiceId: "INV-001",
        date: "2026-01-10T10:00:00Z",
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-01-15T10:00:00Z" })
        .expect(200);

      expect(res.body.taxPosition).toBe(200);
    });

    it("should sum tax across multiple items in a sales event", async () => {
      store.addSalesEvent({
        invoiceId: "INV-001",
        date: "2026-01-10T10:00:00Z",
        items: [
          { itemId: "ITEM-1", cost: 1000, taxRate: 0.2 },
          { itemId: "ITEM-2", cost: 2000, taxRate: 0.1 },
        ],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // 1000 * 0.2 + 2000 * 0.1 = 200 + 200 = 400
      expect(res.body.taxPosition).toBe(400);
    });

    it("should sum tax across multiple sales events", async () => {
      store.addSalesEvent({
        invoiceId: "INV-001",
        date: "2026-01-10T10:00:00Z",
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addSalesEvent({
        invoiceId: "INV-002",
        date: "2026-01-12T10:00:00Z",
        items: [{ itemId: "ITEM-2", cost: 3000, taxRate: 0.1 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // 1000 * 0.2 + 3000 * 0.1 = 200 + 300 = 500
      expect(res.body.taxPosition).toBe(500);
    });

    it("should subtract tax payments", async () => {
      store.addSalesEvent({
        invoiceId: "INV-001",
        date: "2026-01-10T10:00:00Z",
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addTaxPayment({
        date: "2026-01-12T10:00:00Z",
        amount: 50,
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // 200 - 50 = 150
      expect(res.body.taxPosition).toBe(150);
    });

    it("should return negative tax position when payments exceed tax owed", async () => {
      store.addSalesEvent({
        invoiceId: "INV-001",
        date: "2026-01-10T10:00:00Z",
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addTaxPayment({
        date: "2026-01-12T10:00:00Z",
        amount: 500,
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // 200 - 500 = -300
      expect(res.body.taxPosition).toBe(-300);
    });

    it("should exclude sales events after the requested date", async () => {
      store.addSalesEvent({
        invoiceId: "INV-001",
        date: "2026-01-10T10:00:00Z",
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addSalesEvent({
        invoiceId: "INV-002",
        date: "2026-01-20T10:00:00Z",
        items: [{ itemId: "ITEM-2", cost: 5000, taxRate: 0.2 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // Only INV-001: 1000 * 0.2 = 200
      expect(res.body.taxPosition).toBe(200);
    });

    it("should exclude tax payments after the requested date", async () => {
      store.addSalesEvent({
        invoiceId: "INV-001",
        date: "2026-01-10T10:00:00Z",
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addTaxPayment({
        date: "2026-01-12T10:00:00Z",
        amount: 50,
      });
      store.addTaxPayment({
        date: "2026-01-20T10:00:00Z",
        amount: 100,
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // 200 - 50 = 150 (second payment excluded)
      expect(res.body.taxPosition).toBe(150);
    });

    it("should include events on the exact requested date", async () => {
      store.addSalesEvent({
        invoiceId: "INV-001",
        date: "2026-01-15T10:00:00Z",
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-01-15T10:00:00Z" })
        .expect(200);

      expect(res.body.taxPosition).toBe(200);
    });

    it("should return the requested date in the response", async () => {
      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-06-30T23:59:59Z" })
        .expect(200);

      expect(res.body.date).toBe("2026-06-30T23:59:59Z");
    });

    it("should exclude events with the same date but a later time", async () => {
      store.addSalesEvent({
        invoiceId: "INV-001",
        date: "2026-01-15T08:00:00Z",
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addSalesEvent({
        invoiceId: "INV-002",
        date: "2026-01-15T14:00:00Z",
        items: [{ itemId: "ITEM-2", cost: 2000, taxRate: 0.2 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // Only INV-001 (08:00) included, INV-002 (14:00) excluded
      // 1000 * 0.2 = 200
      expect(res.body.taxPosition).toBe(200);
    });

    it("should handle zero tax rate", async () => {
      store.addSalesEvent({
        invoiceId: "INV-001",
        date: "2026-01-10T10:00:00Z",
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-01-15T10:00:00Z" })
        .expect(200);

      expect(res.body.taxPosition).toBe(0);
    });
  });

  describe("invalid requests", () => {
    it("should return 400 when date parameter is missing", async () => {
      const res = await request(app)
        .get("/tax-position")
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for invalid date format", async () => {
      const res = await request(app)
        .get("/tax-position")
        .query({ date: "not-a-date" })
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for non-ISO date format", async () => {
      const res = await request(app)
        .get("/tax-position")
        .query({ date: "01/15/2026" })
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 with validation error details", async () => {
      const res = await request(app)
        .get("/tax-position")
        .query({ date: "bad" })
        .expect(400);

      expect(res.body).toEqual({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String),
          }),
        ]),
      });
    });
  });
});
