import { Router } from "express";
import { createTransaction } from "../controllers/transactions";
import { handleError } from "../middlewares/errHandler";

const transactionsRouter = Router()

transactionsRouter.post("/", handleError(createTransaction))

export default transactionsRouter