import { Router } from "express";
import { handleCreateTransaction } from "../controllers/transactions";
import { handleError } from "../middlewares/errHandler";
import { validateTransaction } from "../middlewares/transactions";

const transactionsRouter = Router()

transactionsRouter.post("/", handleError(validateTransaction), handleError(handleCreateTransaction))

export default transactionsRouter