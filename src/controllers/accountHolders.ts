import { Request, Response } from "express";
import { createAccountHolder } from "../services/accountHolders";
import { createAccount } from "../services/accounts";

export async function handleCreateAccount(req: Request, res: Response) {
    const { name, email } = req.body
    const accountHolder = await createAccountHolder(name, email)
    await createAccount(accountHolder.id)
    return res.status(201).json({ success: true, message: "Account created successfully." })
}