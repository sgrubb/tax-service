import app from "../src/app";

describe("app", () => {
  it("should be an express application", () => {
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");
  });
});
