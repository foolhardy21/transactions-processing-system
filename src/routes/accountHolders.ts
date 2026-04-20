import { Router } from "express";
import { handleError } from "../middlewares/errHandler";
import { handleCreateAccount } from "../controllers/accountHolders";

const accountHoldersRouter = Router()

accountHoldersRouter.post("/", handleError(handleCreateAccount))

export default accountHoldersRouter