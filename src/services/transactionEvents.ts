import { Response } from "express";
import { TRANSACTION_STATUS } from "../utils/types";

type TransactionStatusPayload = {
    transactionId: string;
    status: TRANSACTION_STATUS;
    clientStatus: "pending" | "completed" | "blocked" | "failed" | "finalized";
    message: string;
    reason?: string;
    updatedAt: string;
}

const subscribers = new Map<string, Set<Response>>()

const terminalStatuses = new Set<TRANSACTION_STATUS>([
    TRANSACTION_STATUS.COMPLETED,
    TRANSACTION_STATUS.FAILED,
    TRANSACTION_STATUS.FLAGGED,
    TRANSACTION_STATUS.FINALIZED,
])

export function toClientStatus(status: TRANSACTION_STATUS): TransactionStatusPayload["clientStatus"] {
    switch (status) {
        case TRANSACTION_STATUS.PENDING:
            return "pending"
        case TRANSACTION_STATUS.COMPLETED:
            return "completed"
        case TRANSACTION_STATUS.FLAGGED:
            return "blocked"
        case TRANSACTION_STATUS.FINALIZED:
            return "finalized"
        case TRANSACTION_STATUS.FAILED:
        default:
            return "failed"
    }
}

export function toStatusMessage(status: TRANSACTION_STATUS) {
    switch (status) {
        case TRANSACTION_STATUS.PENDING:
            return "Transaction pending"
        case TRANSACTION_STATUS.COMPLETED:
            return "Transaction completed"
        case TRANSACTION_STATUS.FLAGGED:
            return "Transaction blocked"
        case TRANSACTION_STATUS.FINALIZED:
            return "Transaction finalized"
        case TRANSACTION_STATUS.FAILED:
        default:
            return "Transaction failed"
    }
}

export function buildStatusPayload(transactionId: string, status: TRANSACTION_STATUS, reason?: string): TransactionStatusPayload {
    return {
        transactionId,
        status,
        clientStatus: toClientStatus(status),
        message: toStatusMessage(status),
        ...(reason && { reason }),
        updatedAt: new Date().toISOString(),
    }
}

export function sendStatusEvent(res: Response, payload: TransactionStatusPayload) {
    res.write(`event: transaction.status\n`)
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

export function subscribeToTransaction(transactionId: string, res: Response) {
    const transactionSubscribers = subscribers.get(transactionId) ?? new Set<Response>()
    transactionSubscribers.add(res)
    subscribers.set(transactionId, transactionSubscribers)
}

export function unsubscribeFromTransaction(transactionId: string, res: Response) {
    const transactionSubscribers = subscribers.get(transactionId)
    if (!transactionSubscribers) return

    transactionSubscribers.delete(res)
    if (!transactionSubscribers.size) subscribers.delete(transactionId)
}

export function publishTransactionStatus(payload: TransactionStatusPayload) {
    const transactionSubscribers = subscribers.get(payload.transactionId)
    if (!transactionSubscribers) return

    for (const res of transactionSubscribers) {
        sendStatusEvent(res, payload)
        if (terminalStatuses.has(payload.status)) {
            res.end()
        }
    }

    if (terminalStatuses.has(payload.status)) {
        subscribers.delete(payload.transactionId)
    }
}

export function isTerminalTransactionStatus(status: TRANSACTION_STATUS) {
    return terminalStatuses.has(status)
}
