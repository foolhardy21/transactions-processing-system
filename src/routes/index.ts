import transactionsRouter from "./transactions";
import { Router } from "express";

const router = Router()

router.use("/transactions", transactionsRouter)

export default router