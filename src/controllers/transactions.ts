import Decimal from "decimal.js"
import { Request, Response } from "express"
import database from "../services/database"
import { createTransaction, getTransactionById } from "../services/transactions"
import ApiError, { TRANSACTION_STATUS, TRANSACTION_TYPES } from "../utils/types"
import { getAccountById } from "../services/accounts"

export async function handleCreateTransaction(req: Request, res: Response) {
    const { transactionId, accountId, type, amount } = req.body
    const dbTransaction = await database.createDbTransaction()
    try {
        const transaction = await getTransactionById(transactionId, dbTransaction)
        if (transaction) {
            let status = 409, message = ""
            switch (transaction.status) {
                case "pending": message = "Transaction is already in progress. Please wait."
                    break
                case "success": message = "Transaction is already complete. Please refresh."
                    break
                case "fail": message = "Transaction has failed. Please try again."
                    break
                default: message = "Something went wrong"
            }
            throw new ApiError(status, message)
        }

        const account = await getAccountById(accountId, dbTransaction)

        if (type === TRANSACTION_TYPES.DEBIT) {
            const balanceDec = new Decimal(account!.balance)
            const amountDec = new Decimal(amount)
            if (balanceDec.lessThan(amountDec)) throw new ApiError(403, "Balance not sufficient.")
        }

        await createTransaction(
            {
                transactionId,
                accountId,
                amount,
                status: TRANSACTION_STATUS.SUCCESS,
                type,
            },
            dbTransaction
        )

        const balanceDec = new Decimal(account!.balance)
        const amountDec = new Decimal(amount)
        const udpatedBalance = String(type === TRANSACTION_TYPES.DEBIT ? balanceDec.minus(amountDec) : balanceDec.add(amountDec))
        account!.balance = udpatedBalance
        await account!.save({ transaction: dbTransaction })

        await dbTransaction!.commit()
    } catch (err: any) {
        await dbTransaction!.rollback()
        throw err
    }
}
