import { Router } from "express"
import { handleGetAccountEvents, handleGetCorrelationTrace, handleReplayAccount } from "../controllers/audit"
import { handleError } from "../middlewares/errHandler"

const auditRouter = Router()

auditRouter.get("/accounts/:accountId/replay", handleError(handleReplayAccount))
auditRouter.get("/accounts/:accountId/events", handleError(handleGetAccountEvents))
auditRouter.get("/correlations/:correlationId", handleError(handleGetCorrelationTrace))

export default auditRouter
