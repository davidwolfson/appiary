import { ZodError, z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { errorMiddleware } from "../src/middleware/error.middleware.js";
import { AppError } from "../src/utils/app-error.js";

describe("errorMiddleware", () => {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as const;

  beforeEach(() => {
    json.mockReset();
    status.mockClear();
  });

  it("maps zod errors to 400 responses", () => {
    const zodError = new ZodError([
      {
        code: z.ZodIssueCode.invalid_type,
        expected: "string",
        received: "number",
        path: ["email"],
        message: "Expected string, received number",
      },
    ]);

    errorMiddleware(zodError, {} as never, res as never, vi.fn());

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: "Validation failed",
      errors: zodError.flatten(),
    });
  });

  it("maps app errors to their status code", () => {
    errorMiddleware(new AppError(409, "Conflict"), {} as never, res as never, vi.fn());

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      message: "Conflict",
    });
  });

  it("maps unexpected errors to a 500 response", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    errorMiddleware(new Error("boom"), {} as never, res as never, vi.fn());

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      message: "Internal server error",
    });

    errorSpy.mockRestore();
  });
});
