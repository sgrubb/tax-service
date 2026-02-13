import express from "express";
import request from "supertest";
import { createApp } from "../src/app";
import { createStore } from "../src/store/store";

describe("app", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp(createStore());
  });

  it("should be an express application", () => {
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");
  });

  describe("GET /", () => {
    it("should return API info with correct name and version", async () => {
      const res = await request(app).get("/").expect(200);

      expect(res.body).toEqual({
        name: "Tax Service API",
        version: "1.0.0",
        endpoints: [
          "POST /transactions",
          "PATCH /sale",
          "GET /tax-position",
        ],
      });
    });

    it("should return Content-Type application/json", async () => {
      await request(app)
        .get("/")
        .expect("Content-Type", /application\/json/);
    });
  });

  describe("404 handling", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await request(app)
        .get("/unknown-route")
        .expect(404);

      expect(res.body).toEqual({ error: "Not found" });
    });

    it("should return 404 for unknown methods on known paths", async () => {
      const res = await request(app)
        .delete("/transactions")
        .expect(404);

      expect(res.body).toEqual({ error: "Not found" });
    });
  });
});
