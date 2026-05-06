import { Request, Response } from "express"
import { getAccountEvents, getCorrelationEvents, rebuildAccountBalance } from "../services/auditEvents"
import ApiError, { TRANSACTION_TYPES } from "../utils/types"

function getStringQueryParam(value: unknown): string | undefined {
    if (!value) return undefined
    return Array.isArray(value) ? String(value[0]) : String(value)
}

function getTransactionType(value: unknown): TRANSACTION_TYPES | undefined {
    const type = getStringQueryParam(value)
    if (!type) return undefined
    if (!Object.values(TRANSACTION_TYPES).includes(type as TRANSACTION_TYPES)) {
        throw new ApiError(400, "Invalid transaction type.")
    }
    return type as TRANSACTION_TYPES
}

function serializeEvent(event: any) {
    return {
        id: event.id,
        transactionId: event.transactionId,
        accountId: event.accountId,
        eventType: event.eventType,
        correlationId: event.correlationId,
        causationId: event.causationId,
        transactionType: event.transactionType,
        amount: event.amount,
        status: event.status,
        balanceBefore: event.balanceBefore,
        balanceAfter: event.balanceAfter,
        reason: event.reason,
        payload: event.payload,
        occurredAt: event.occurredAt,
    }
}

function getEventQuery(req: Request) {
    return {
        from: getStringQueryParam(req.query.from),
        to: getStringQueryParam(req.query.to),
        date: getStringQueryParam(req.query.date),
        type: getTransactionType(req.query.type),
        amount: getStringQueryParam(req.query.amount),
    }
}

export async function handleReplayAccount(req: Request, res: Response) {
    const accountId = getStringQueryParam(req.params.accountId) ?? ""
    const replay = await rebuildAccountBalance(accountId, getEventQuery(req))

    return res.json({
        success: true,
        accountId: replay.accountId,
        rebuiltBalance: replay.rebuiltBalance,
        storedBalance: replay.storedBalance,
        matchesStoredBalance: replay.matchesStoredBalance,
        eventsReplayed: replay.eventsReplayed,
        events: replay.events.map(serializeEvent),
    })
}

export async function handleGetAccountEvents(req: Request, res: Response) {
    const accountId = getStringQueryParam(req.params.accountId) ?? ""
    const events = await getAccountEvents(accountId, getEventQuery(req))

    return res.json({
        success: true,
        accountId,
        events: events.map(serializeEvent),
    })
}

export async function handleGetCorrelationTrace(req: Request, res: Response) {
    const correlationId = getStringQueryParam(req.params.correlationId) ?? ""
    const events = await getCorrelationEvents(correlationId)

    return res.json({
        success: true,
        correlationId,
        events: events.map(serializeEvent),
    })
}
