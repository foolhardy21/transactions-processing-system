import { Op, Transaction as SequelizeTransaction } from "sequelize";
import { ITransaction } from "../models/transaction";
import { Transaction } from "../models";
import { TRANSACTION_STATUS, TRANSACTION_TYPES } from "../utils/types";

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
