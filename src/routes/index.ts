import accountHoldersRouter from "./accountHolders";
import transactionsRouter from "./transactions";
import { Router } from "express";

const router = Router()

router.use("/transactions", transactionsRouter)
router.use("/account-holders", accountHoldersRouter)

export default router