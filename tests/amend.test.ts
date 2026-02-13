import express from "express";
import request from "supertest";
import { createApp } from "../src/app";
import { createStore, Store } from "../src/store/store";

describe("PATCH /sale", () => {
  let store: Store;
  let app: express.Express;

  beforeEach(() => {
    store = createStore();
    app = createApp(store);
  });

  const validAmendment = {
    date: "2026-02-01T10:00:00Z",
    invoiceId: "INV-001",
    itemId: "ITEM-1",
    cost: 1500,
    taxRate: 0.2,
  };

  describe("valid requests", () => {
    it("should return 202 for a valid amendment", async () => {
      await request(app)
        .patch("/sale")
        .send(validAmendment)
        .expect(202);
    });

    it("should store the amendment", async () => {
      await request(app)
        .patch("/sale")
        .send(validAmendment)
        .expect(202);

      const amendments = store.getAmendments();
      expect(amendments).toHaveLength(1);
      expect(amendments[0].invoiceId).toBe("INV-001");
      expect(amendments[0].item.itemId).toBe("ITEM-1");
      expect(amendments[0].item.cost).toBe(1500);
      expect(amendments[0].item.taxRate).toBe(0.2);
    });

    it("should map flat fields into nested item object", async () => {
      await request(app)
        .patch("/sale")
        .send(validAmendment)
        .expect(202);

      const amendment = store.getAmendments()[0];
      expect(amendment.item).toEqual({
        itemId: "ITEM-1",
        cost: 1500,
        taxRate: 0.2,
      });
    });
  });

  describe("invalid requests", () => {
    it("should return 400 for missing date", async () => {
      const { date, ...noDate } = validAmendment;
      const res = await request(app)
        .patch("/sale")
        .send(noDate)
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for invalid date format", async () => {
      const res = await request(app)
        .patch("/sale")
        .send({ ...validAmendment, date: "not-a-date" })
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for missing invoiceId", async () => {
      const { invoiceId, ...noInvoice } = validAmendment;
      const res = await request(app)
        .patch("/sale")
        .send(noInvoice)
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for missing itemId", async () => {
      const { itemId, ...noItemId } = validAmendment;
      const res = await request(app)
        .patch("/sale")
        .send(noItemId)
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for missing cost", async () => {
      const { cost, ...noCost } = validAmendment;
      const res = await request(app)
        .patch("/sale")
        .send(noCost)
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for missing taxRate", async () => {
      const { taxRate, ...noTaxRate } = validAmendment;
      const res = await request(app)
        .patch("/sale")
        .send(noTaxRate)
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for float cost", async () => {
      const res = await request(app)
        .patch("/sale")
        .send({ ...validAmendment, cost: 10.5 })
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for negative cost", async () => {
      const res = await request(app)
        .patch("/sale")
        .send({ ...validAmendment, cost: -100 })
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for taxRate out of range", async () => {
      const res = await request(app)
        .patch("/sale")
        .send({ ...validAmendment, taxRate: 1.5 })
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 for empty body", async () => {
      const res = await request(app)
        .patch("/sale")
        .send({})
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should return 400 with validation error details", async () => {
      const res = await request(app)
        .patch("/sale")
        .send({})
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
