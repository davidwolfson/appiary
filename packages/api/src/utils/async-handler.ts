import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

type AsyncRequestHandler<Params = ParamsDictionary> = (
  req: Request<Params>,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler<Params = ParamsDictionary>(
  handler: AsyncRequestHandler<Params>,
): RequestHandler<Params> {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

