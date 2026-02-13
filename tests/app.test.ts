import request from "supertest";
import app from "../src/app";

describe("app", () => {
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
});
