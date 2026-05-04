import { Router } from "express";
import { handleCreateTransaction, handleTransactionEvents } from "../controllers/transactions";
import { handleError } from "../middlewares/errHandler";
import { validateTransaction } from "../middlewares/transactions";

const transactionsRouter = Router()

transactionsRouter.get("/:transactionId/events", handleError(handleTransactionEvents))
transactionsRouter.post("/", handleError(validateTransaction), handleError(handleCreateTransaction))

export default transactionsRouter
