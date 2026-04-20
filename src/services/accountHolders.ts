import { randomUUID } from "crypto"
import { AccountHolder } from "../models";
import { IAccountHolder } from "../models/accountHolder";

export async function createAccountHolder(name: string, email: string): Promise<IAccountHolder> {
    const accountHolder = await AccountHolder.create({
        id: randomUUID(),
        name,
        email,
    })
    return accountHolder
}
