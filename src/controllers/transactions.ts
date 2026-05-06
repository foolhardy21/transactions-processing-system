import { Request, Response } from "express"
import database from "../services/database"
import kafka from "../services/kafka"
import { createTransaction, getTransactionById } from "../services/transactions"
import ApiError, { TRANSACTION_STATUS } from "../utils/types"
import {
    buildStatusPayload,
    isTerminalTransactionStatus,
    publishTransactionStatus,
    sendStatusEvent,
    subscribeToTransaction,
    unsubscribeFromTransaction,
} from "../services/transactionEvents"
import { recordTransactionEvent } from "../services/auditEvents"

function getDuplicateTransactionMessage(status: string) {
    switch (status) {
        case TRANSACTION_STATUS.PENDING:
            return "Transaction is already in progress. Please wait."
        case TRANSACTION_STATUS.COMPLETED:
        case TRANSACTION_STATUS.FINALIZED:
            return "Transaction is already complete. Please refresh."
        case TRANSACTION_STATUS.FLAGGED:
            return "Transaction was blocked. Please contact support."
        case TRANSACTION_STATUS.FAILED:
            return "Transaction has failed. Please try again."
        default:
            return "Something went wrong"
    }
}

export async function handleCreateTransaction(req: Request, res: Response) {
    const { transactionId, accountId, type, amount, deviceFingerprint, device_fingerprint } = req.body
    const normalizedDeviceFingerprint = deviceFingerprint ?? device_fingerprint ?? "unknown-device"
    const correlationId = transactionId
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown-ip"
    const dbTransaction = await database.createDbTransaction()
    let isCommitted = false
    try {
        const transaction = await getTransactionById(transactionId, dbTransaction)
        if (transaction) {
            throw new ApiError(409, getDuplicateTransactionMessage(transaction.status ?? TRANSACTION_STATUS.PENDING))
        }

        await createTransaction(
            {
                transactionId,
                accountId,
                amount,
                status: TRANSACTION_STATUS.PENDING,
                type,
            },
            dbTransaction
        )

        const requestedEvent = await recordTransactionEvent(
            {
                transactionId,
                accountId,
                eventType: "transaction.requested",
                correlationId,
                transactionType: type,
                amount,
                status: TRANSACTION_STATUS.PENDING,
                payload: {
                    transactionId,
                    accountId,
                    type,
                    amount,
                    deviceFingerprint: normalizedDeviceFingerprint,
                    ipAddress,
                    status: TRANSACTION_STATUS.PENDING,
                },
            },
            dbTransaction
        )

        await dbTransaction!.commit()
        isCommitted = true

        const pendingPayload = buildStatusPayload(transactionId, TRANSACTION_STATUS.PENDING)
        publishTransactionStatus(pendingPayload)

        await kafka.produce("transaction.requested", [
            {
                key: transactionId,
                value: JSON.stringify({
                    transactionId,
                    accountId,
                    type,
                    amount,
                    correlationId,
                    causationId: requestedEvent.id,
                    deviceFingerprint: normalizedDeviceFingerprint,
                    ipAddress,
                    status: TRANSACTION_STATUS.PENDING,
                    requestedAt: new Date().toISOString(),
                }),
            },
        ])

        return res.status(202).json({ success: true, correlationId, causationId: requestedEvent.id, ...pendingPayload })
    } catch (err: any) {
        if (!isCommitted) await dbTransaction!.rollback()
        throw err
    }
}

export async function handleTransactionEvents(req: Request, res: Response) {
    const transactionIdParam = req.params.transactionId
    const transactionId = Array.isArray(transactionIdParam) ? transactionIdParam[0] : transactionIdParam

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache, no-transform")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders?.()

    const transaction = await getTransactionById(transactionId)
    if (!transaction) {
        sendStatusEvent(res, buildStatusPayload(transactionId, TRANSACTION_STATUS.FAILED, "Transaction not found."))
        return res.end()
    }

    const currentStatus = transaction.status as TRANSACTION_STATUS
    sendStatusEvent(res, buildStatusPayload(transactionId, currentStatus))

    if (isTerminalTransactionStatus(currentStatus)) {
        return res.end()
    }

    subscribeToTransaction(transactionId, res)
    req.on("close", () => unsubscribeFromTransaction(transactionId, res))
}
