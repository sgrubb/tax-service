import { ZodError } from "zod";

export function validationErrorResponse(errors: ZodError) {
  return {
    error: "Validation failed",
    details: errors.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
}
