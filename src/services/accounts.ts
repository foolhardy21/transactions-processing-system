import { randomUUID } from "crypto"
import { Op, Transaction } from "sequelize";
import { IAccount } from "../models/account";
import { Account } from "../models";
import ApiError from "../utils/types";

export async function getAccountById(accountId: string, t?: Transaction): Promise<IAccount | null> {
    const account = await Account.findOne({
        where: { id: { [Op.eq]: accountId } },
        lock: true,
        ...(t && { transaction: t })
    })
    if (!account) throw new ApiError(401, "Account not found.")
    return account
}

export async function updateAccountBalanceById(accountId: string, newBalance: string, t?: Transaction): Promise<IAccount | null> {
    const account = await getAccountById(accountId, t)
    account!.balance = newBalance
    const updatedAccount = await account!.save({
        ...(t && { transaction: t })
    })
    return updatedAccount
}

export async function createAccount(accountHolderId: string): Promise<IAccount> {
    const accountHolder = await Account.create({
        id: randomUUID(),
        balance: "0",
        holderId: accountHolderId,
    })
    return accountHolder
}
