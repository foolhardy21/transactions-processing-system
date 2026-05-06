import accountHoldersRouter from "./accountHolders";
import auditRouter from "./audit";
import transactionsRouter from "./transactions";
import { Router } from "express";

const router = Router()

router.use("/audit", auditRouter)
router.use("/transactions", transactionsRouter)
router.use("/account-holders", accountHoldersRouter)

export default router
