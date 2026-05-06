import { randomUUID } from "crypto"
import Decimal from "decimal.js"
import { Op, Transaction as SequelizeTransaction, WhereOptions } from "sequelize"
import { Account, TransactionEvent } from "../models"
import { ITransactionEvent } from "../models/transactionEvent"
import { TRANSACTION_STATUS, TRANSACTION_TYPES } from "../utils/types"

export type AuditEventInput = {
    id?: string
    transactionId: string
    accountId: string
    eventType: string
    correlationId?: string
    causationId?: string | null
    transactionType?: TRANSACTION_TYPES | null
    amount?: string | null
    status?: TRANSACTION_STATUS | null
    balanceBefore?: string | null
    balanceAfter?: string | null
    reason?: string | null
    payload?: object
    occurredAt?: Date
}

type EventQuery = {
    from?: string
    to?: string
    date?: string
    type?: TRANSACTION_TYPES
    amount?: string
}

export async function recordTransactionEvent(input: AuditEventInput, t?: SequelizeTransaction): Promise<ITransactionEvent> {
    return TransactionEvent.create(
        {
            id: input.id ?? randomUUID(),
            transactionId: input.transactionId,
            accountId: input.accountId,
            eventType: input.eventType,
            correlationId: input.correlationId ?? input.transactionId,
            causationId: input.causationId ?? null,
            transactionType: input.transactionType ?? null,
            amount: input.amount ?? null,
            status: input.status ?? null,
            balanceBefore: input.balanceBefore ?? null,
            balanceAfter: input.balanceAfter ?? null,
            reason: input.reason ?? null,
            payload: input.payload ?? {},
            occurredAt: input.occurredAt ?? new Date(),
        },
        {
            ...(t && { transaction: t }),
        },
    )
}

function getDateBounds(query: EventQuery) {
    if (query.date) {
        const start = new Date(`${query.date}T00:00:00.000Z`)
        const end = new Date(`${query.date}T23:59:59.999Z`)
        return { start, end }
    }

    return {
        start: query.from ? new Date(query.from) : undefined,
        end: query.to ? new Date(query.to) : undefined,
    }
}

function buildEventWhere(accountId: string, query: EventQuery = {}): WhereOptions {
    const where: WhereOptions = { accountId }
    const { start, end } = getDateBounds(query)

    if (start || end) {
        where.occurredAt = {
            ...(start && { [Op.gte]: start }),
            ...(end && { [Op.lte]: end }),
        }
    }

    if (query.type) where.transactionType = query.type
    if (query.amount) where.amount = query.amount

    return where
}

export async function getAccountEvents(accountId: string, query: EventQuery = {}) {
    return TransactionEvent.findAll({
        where: buildEventWhere(accountId, query),
        order: [["occurredAt", "ASC"], ["createdAt", "ASC"]],
    })
}

export async function getCorrelationEvents(correlationId: string) {
    return TransactionEvent.findAll({
        where: { correlationId },
        order: [["occurredAt", "ASC"], ["createdAt", "ASC"]],
    })
}

export async function rebuildAccountBalance(accountId: string, query: EventQuery = {}) {
    const events = await getAccountEvents(accountId, query)
    const ledgerEvents = events.filter(
        (event) =>
            event.eventType === "transaction.completed" &&
            event.status === TRANSACTION_STATUS.COMPLETED &&
            event.transactionType &&
            event.amount,
    )

    const rebuiltBalance = ledgerEvents.reduce((balance, event) => {
        const amount = new Decimal(event.amount!)
        return event.transactionType === TRANSACTION_TYPES.DEBIT
            ? balance.minus(amount)
            : balance.add(amount)
    }, new Decimal(0))

    const account = await Account.findOne({ where: { id: accountId } })

    return {
        accountId,
        rebuiltBalance: rebuiltBalance.toFixed(2),
        storedBalance: account?.balance ?? null,
        matchesStoredBalance: account ? new Decimal(account.balance).equals(rebuiltBalance) : null,
        eventsReplayed: ledgerEvents.length,
        events,
    }
}
