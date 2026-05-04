import { Op, Transaction as SequelizeTransaction } from "sequelize";
import { ITransaction } from "../models/transaction";
import { Transaction } from "../models";
import { TRANSACTION_STATUS, TRANSACTION_TYPES } from "../utils/types";
import { buildStatusPayload, publishTransactionStatus } from "./transactionEvents";

export async function getTransactionById(transactionId: string, t?: SequelizeTransaction): Promise<ITransaction | null> {
    const transaction = await Transaction.findOne({
        where: { id: { [Op.eq]: transactionId } },
        lock: true,
        ...(t && { transaction: t })
    })
    return transaction
}

export async function createTransaction({
    transactionId,
    accountId,
    type,
    amount,
    status,
}: {
    transactionId: string,
    accountId: string,
    type: TRANSACTION_TYPES,
    amount: string,
    status: TRANSACTION_STATUS
},
    t?: SequelizeTransaction): Promise<ITransaction> {
    const transaction = await Transaction.create(
        {
            id: transactionId,
            accountId,
            type,
            amount,
            status
        },
        {
            ...(t && { transaction: t })
        }
    )
    return transaction
}

export async function updateTransactionStatus(
    transactionId: string,
    status: TRANSACTION_STATUS,
    reason?: string,
    t?: SequelizeTransaction,
    shouldPublish: boolean = true
): Promise<ITransaction> {
    const transaction = await getTransactionById(transactionId, t)
    if (!transaction) {
        throw new Error("Transaction not found.")
    }

    transaction.status = status
    const updatedTransaction = await transaction.save({
        ...(t && { transaction: t })
    })

    if (shouldPublish) {
        publishTransactionStatus(buildStatusPayload(transactionId, status, reason))
    }
    return updatedTransaction
}

export async function getLastNAccountTransactions(n: number, accountId: string, t?: SequelizeTransaction): Promise<ITransaction[]> {
    const transactions = await Transaction.findAll({
        where: { accountId },
        order: [["createdAt", "DESC"]],
        limit: n,
        lock: true,
        ...(t && { transaction: t }),
    })
    return transactions
}
