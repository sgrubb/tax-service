import express, { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Store } from "./store/store";
import { createTransactionsRouter } from "./routes/transactions-router";
import { createTaxRouter } from "./routes/tax-router";
import { validationErrorResponse } from "./errors/validation-error";
import { logger } from "./logger";

export function createApp(store: Store) {
  const app = express();

  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      name: "Tax Service API",
      version: "1.0.0",
      endpoints: [
        "POST /transactions",
        "PATCH /sale",
        "GET /tax-position",
      ],
    });
  });

  app.use("/", createTransactionsRouter(store));
  app.use("/", createTaxRouter(store));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json(validationErrorResponse(err));
      return;
    }

    logger.error({ err }, "Unexpected error");
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
