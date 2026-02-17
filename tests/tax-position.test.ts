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
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      expect(res.body).toEqual({
        date: "2026-01-15T10:00:00Z",
        taxPosition: 0,
      });
    });

    it("should return correct tax position with a single sales event", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      expect(res.body.taxPosition).toBe(200);
    });

    it("should sum tax across multiple items in a sales event", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [
          { itemId: "ITEM-1", cost: 1000, taxRate: 0.2 },
          { itemId: "ITEM-2", cost: 2000, taxRate: 0.1 },
        ],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // 1000 * 0.2 + 2000 * 0.1 = 200 + 200 = 400
      expect(res.body.taxPosition).toBe(400);
    });

    it("should sum tax across multiple sales events", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-002",
        date: new Date("2026-01-12T10:00:00Z"),
        items: [{ itemId: "ITEM-2", cost: 3000, taxRate: 0.1 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // 1000 * 0.2 + 3000 * 0.1 = 200 + 300 = 500
      expect(res.body.taxPosition).toBe(500);
    });

    it("should subtract tax payments", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addTaxPayment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-12T10:00:00Z"),
        amount: 50,
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // 200 - 50 = 150
      expect(res.body.taxPosition).toBe(150);
    });

    it("should return negative tax position when payments exceed tax owed", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addTaxPayment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-12T10:00:00Z"),
        amount: 500,
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // 200 - 500 = -300
      expect(res.body.taxPosition).toBe(-300);
    });

    it("should exclude sales events after the requested date", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-002",
        date: new Date("2026-01-20T10:00:00Z"),
        items: [{ itemId: "ITEM-2", cost: 5000, taxRate: 0.2 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // Only INV-001: 1000 * 0.2 = 200
      expect(res.body.taxPosition).toBe(200);
    });

    it("should exclude tax payments after the requested date", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addTaxPayment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-12T10:00:00Z"),
        amount: 50,
      });
      store.addTaxPayment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-20T10:00:00Z"),
        amount: 100,
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // 200 - 50 = 150 (second payment excluded)
      expect(res.body.taxPosition).toBe(150);
    });

    it("should include events on the exact requested date", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-15T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      expect(res.body.taxPosition).toBe(200);
    });

    it("should return the requested date in the response", async () => {
      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-06-30T23:59:59Z" })
        .expect(200);

      expect(res.body.date).toBe("2026-06-30T23:59:59Z");
    });

    it("should exclude events with the same date but a later time", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-15T08:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-002",
        date: new Date("2026-01-15T14:00:00Z"),
        items: [{ itemId: "ITEM-2", cost: 2000, taxRate: 0.2 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // Only INV-001 (08:00) included, INV-002 (14:00) excluded
      // 1000 * 0.2 = 200
      expect(res.body.taxPosition).toBe(200);
    });

    it("should handle zero tax rate", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      expect(res.body.taxPosition).toBe(0);
    });
  });

  describe("amendments", () => {
    it("should apply amendment before query date", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addAmendment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-12T10:00:00Z"),
        invoiceId: "INV-001",
        item: { itemId: "ITEM-1", cost: 2000, taxRate: 0.2 },
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // Amended: 2000 * 0.2 = 400
      expect(res.body.taxPosition).toBe(400);
    });

    it("should not apply amendment after query date", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addAmendment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-20T10:00:00Z"),
        invoiceId: "INV-001",
        item: { itemId: "ITEM-1", cost: 2000, taxRate: 0.2 },
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // Original: 1000 * 0.2 = 200
      expect(res.body.taxPosition).toBe(200);
    });

    it("should use most recent amendment when multiple exist", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addAmendment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-11T10:00:00Z"),
        invoiceId: "INV-001",
        item: { itemId: "ITEM-1", cost: 2000, taxRate: 0.2 },
      });
      store.addAmendment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-13T10:00:00Z"),
        invoiceId: "INV-001",
        item: { itemId: "ITEM-1", cost: 3000, taxRate: 0.1 },
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // Latest amendment: 3000 * 0.1 = 300
      expect(res.body.taxPosition).toBe(300);
    });

    it("should use original values when no amendment exists", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [
          { itemId: "ITEM-1", cost: 1000, taxRate: 0.2 },
          { itemId: "ITEM-2", cost: 2000, taxRate: 0.1 },
        ],
      });
      store.addAmendment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-12T10:00:00Z"),
        invoiceId: "INV-001",
        item: { itemId: "ITEM-1", cost: 5000, taxRate: 0.2 },
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // ITEM-1 amended: 5000 * 0.2 = 1000, ITEM-2 original: 2000 * 0.1 = 200
      expect(res.body.taxPosition).toBe(1200);
    });

    it("should only apply amendment to matching invoice", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-002",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addAmendment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-12T10:00:00Z"),
        invoiceId: "INV-001",
        item: { itemId: "ITEM-1", cost: 5000, taxRate: 0.2 },
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // INV-001 amended: 5000 * 0.2 = 1000, INV-002 original: 1000 * 0.2 = 200
      expect(res.body.taxPosition).toBe(1200);
    });

    it("should apply amendment that changes taxRate", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addAmendment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-12T10:00:00Z"),
        invoiceId: "INV-001",
        item: { itemId: "ITEM-1", cost: 1000, taxRate: 0.1 },
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // Amended taxRate: 1000 * 0.1 = 100
      expect(res.body.taxPosition).toBe(100);
    });

    it("should ignore amendment for non-existent item on a sale", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addAmendment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-12T10:00:00Z"),
        invoiceId: "INV-001",
        item: { itemId: "ITEM-999", cost: 9000, taxRate: 0.5 },
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // No matching item, original: 1000 * 0.2 = 200
      expect(res.body.taxPosition).toBe(200);
    });

    it("should use only amendments up to query date when multiple exist", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addAmendment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-11T10:00:00Z"),
        invoiceId: "INV-001",
        item: { itemId: "ITEM-1", cost: 2000, taxRate: 0.2 },
      });
      store.addAmendment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-20T10:00:00Z"),
        invoiceId: "INV-001",
        item: { itemId: "ITEM-1", cost: 9000, taxRate: 0.5 },
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // Only first amendment applies: 2000 * 0.2 = 400
      expect(res.body.taxPosition).toBe(400);
    });

    it("should apply amendment with tax payments correctly", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addAmendment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-12T10:00:00Z"),
        invoiceId: "INV-001",
        item: { itemId: "ITEM-1", cost: 2000, taxRate: 0.2 },
      });
      store.addTaxPayment({
        companyId: "COMPANY-1",
        date: new Date("2026-01-13T10:00:00Z"),
        amount: 100,
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // Amended: 2000 * 0.2 = 400, minus payment 100 = 300
      expect(res.body.taxPosition).toBe(300);
    });
  });

  describe("multi-company isolation", () => {
    it("should return only data for the correct company", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addSalesEvent({
        companyId: "COMPANY-2",
        invoiceId: "INV-002",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 5000, taxRate: 0.2 }],
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // Only COMPANY-1: 1000 * 0.2 = 200
      expect(res.body.taxPosition).toBe(200);
    });

    it("should not interfere when two companies have the same invoiceId", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-1",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addSalesEvent({
        companyId: "COMPANY-2",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 3000, taxRate: 0.1 }],
      });

      const res1 = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      const res2 = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-2", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // COMPANY-1: 1000 * 0.2 = 200
      expect(res1.body.taxPosition).toBe(200);
      // COMPANY-2: 3000 * 0.1 = 300
      expect(res2.body.taxPosition).toBe(300);
    });

    it("should not let Company A see Company B's tax position", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-B",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 10000, taxRate: 0.2 }],
      });
      store.addTaxPayment({
        companyId: "COMPANY-B",
        date: new Date("2026-01-12T10:00:00Z"),
        amount: 500,
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-A", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // COMPANY-A has no data
      expect(res.body.taxPosition).toBe(0);
    });

    it("should not let Company A's amendment affect Company B's sales", async () => {
      store.addSalesEvent({
        companyId: "COMPANY-A",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addSalesEvent({
        companyId: "COMPANY-B",
        invoiceId: "INV-001",
        date: new Date("2026-01-10T10:00:00Z"),
        items: [{ itemId: "ITEM-1", cost: 1000, taxRate: 0.2 }],
      });
      store.addAmendment({
        companyId: "COMPANY-A",
        date: new Date("2026-01-12T10:00:00Z"),
        invoiceId: "INV-001",
        item: { itemId: "ITEM-1", cost: 9000, taxRate: 0.5 },
      });

      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-B", date: "2026-01-15T10:00:00Z" })
        .expect(200);

      // COMPANY-B should still have original: 1000 * 0.2 = 200
      expect(res.body.taxPosition).toBe(200);
    });
  });

  describe("invalid requests", () => {
    it("should return 400 when date parameter is missing", async () => {
      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1" })
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 when companyId is missing", async () => {
      const res = await request(app)
        .get("/tax-position")
        .query({ date: "2026-01-15T10:00:00Z" })
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for invalid date format", async () => {
      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "not-a-date" })
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for non-ISO date format", async () => {
      const res = await request(app)
        .get("/tax-position")
        .query({ companyId: "COMPANY-1", date: "01/15/2026" })
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
