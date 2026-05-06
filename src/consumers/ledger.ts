import Decimal from "decimal.js"
import database from "../services/database"
import kafka from "../services/kafka"
import { recordTransactionEvent } from "../services/auditEvents"
import { getAccountById } from "../services/accounts"
import { getLastNAccountTransactions, updateTransactionStatus } from "../services/transactions"
import { buildStatusPayload, publishTransactionStatus } from "../services/transactionEvents"
import ApiError, { TRANSACTION_STATUS, TRANSACTION_TYPES } from "../utils/types"

type TransactionApprovedEvent = {
    transactionId: string
    accountId: string
    type: TRANSACTION_TYPES
    amount: string
    correlationId?: string
    causationId?: string
    deviceFingerprint?: string
    ipAddress?: string
    status: string
    requestedAt: string
    approvedAt: string
}

export async function handleTransactionApproved(messageValue: string) {
    const event: TransactionApprovedEvent = JSON.parse(messageValue)
    const dbTransaction = await database.createDbTransaction()
    let isCommitted = false

    try {
        if (Number(event.amount) > 50000) throw new ApiError(400, "Maximum amount allowed at a time is 50,000.")

        const now = new Date()
        const lastNTransactions = await getLastNAccountTransactions(5, event.accountId, dbTransaction)
        const previousTransactions = lastNTransactions.filter((transaction) => transaction.id !== event.transactionId)

        if (previousTransactions.length) {
            const latestTransactionTime = new Date(previousTransactions[0].createdAt ?? "").getTime()
            if (Math.abs(now.getTime() - latestTransactionTime) < 60_000) {
                throw new ApiError(403, "Please wait for sometime before trying again.")
            }
        }

        const account = await getAccountById(event.accountId, dbTransaction)

        const balanceDec = new Decimal(account!.balance)
        const amountDec = new Decimal(event.amount)
        const balanceBefore = balanceDec.toFixed(2)

        if (event.type === TRANSACTION_TYPES.DEBIT && balanceDec.lessThan(amountDec)) {
            throw new ApiError(403, "Balance not sufficient.")
        }

        const updatedBalance = String(
            event.type === TRANSACTION_TYPES.DEBIT
                ? balanceDec.minus(amountDec)
                : balanceDec.add(amountDec)
        )

        account!.balance = updatedBalance
        await account!.save({ transaction: dbTransaction })
        await updateTransactionStatus(event.transactionId, TRANSACTION_STATUS.COMPLETED, undefined, dbTransaction, false)
        const completedEvent = await recordTransactionEvent(
            {
                transactionId: event.transactionId,
                accountId: event.accountId,
                eventType: "transaction.completed",
                correlationId: event.correlationId ?? event.transactionId,
                causationId: event.causationId ?? null,
                transactionType: event.type,
                amount: event.amount,
                status: TRANSACTION_STATUS.COMPLETED,
                balanceBefore,
                balanceAfter: new Decimal(updatedBalance).toFixed(2),
                payload: {
                    ...event,
                    status: TRANSACTION_STATUS.COMPLETED,
                    balanceBefore,
                    balanceAfter: new Decimal(updatedBalance).toFixed(2),
                },
            },
            dbTransaction
        )

        await dbTransaction!.commit()
        isCommitted = true
        publishTransactionStatus(buildStatusPayload(event.transactionId, TRANSACTION_STATUS.COMPLETED))

        await kafka.produce("transaction.completed", [
            {
                key: event.transactionId,
                value: JSON.stringify({
                    ...event,
                    correlationId: event.correlationId ?? event.transactionId,
                    causationId: completedEvent.id,
                    status: TRANSACTION_STATUS.COMPLETED,
                    completedAt: new Date().toISOString(),
                }),
            },
        ])

        console.log("ledger-service completed transaction.approved:", {
            transactionId: event.transactionId,
            accountId: event.accountId,
        })
    } catch (err) {
        if (!isCommitted) await dbTransaction!.rollback()

        const reason = err instanceof Error ? err.message : "Transaction failed"
        await updateTransactionStatus(event.transactionId, TRANSACTION_STATUS.FAILED, reason)
        const failedEvent = await recordTransactionEvent({
            transactionId: event.transactionId,
            accountId: event.accountId,
            eventType: "transaction.failed",
            correlationId: event.correlationId ?? event.transactionId,
            causationId: event.causationId ?? null,
            transactionType: event.type,
            amount: event.amount,
            status: TRANSACTION_STATUS.FAILED,
            reason,
            payload: {
                ...event,
                status: TRANSACTION_STATUS.FAILED,
                reason,
            },
        })
        await kafka.produce("transaction.failed", [
            {
                key: event.transactionId,
                value: JSON.stringify({
                    ...event,
                    correlationId: event.correlationId ?? event.transactionId,
                    causationId: failedEvent.id,
                    status: TRANSACTION_STATUS.FAILED,
                    failedAt: new Date().toISOString(),
                    reason,
                }),
            },
        ])

        console.log("ledger-service failed transaction.approved:", {
            transactionId: event.transactionId,
            accountId: event.accountId,
            reason,
        })
    }
}

export async function initLedgerConsumer() {
    await kafka.initConsumer(
        "ledger-service",
        "transaction.approved",
        handleTransactionApproved
    )
}
