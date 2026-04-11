import { NextFunction, Response, Request } from "express";
import ApiError, { TRANSACTION_TYPES } from "../utils/types";

export async function validateTransaction(req: Request, res: Response, next: NextFunction) {
    const { transactionId, accountId, type, amount } = req.body
    if (
        !transactionId ||
        !accountId ||
        !Object.values(TRANSACTION_TYPES).includes(type) ||
        amount <= 0
    ) throw new ApiError(400, "Invalid transaction details.")

    next()
}