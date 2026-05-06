import assert from "node:assert/strict"
import { test } from "node:test"
import database from "../services/database"
import kafka from "../services/kafka"
import * as accounts from "../services/accounts"
import * as auditEvents from "../services/auditEvents"
import * as transactions from "../services/transactions"
import { handleTransactionApproved } from "../consumers/ledger"
import { TRANSACTION_STATUS, TRANSACTION_TYPES } from "../utils/types"

test("concurrent debit requests do not overdraw a locked account balance", async (t) => {
    let sharedBalance = "100.00"
    let lock = Promise.resolve()
    const produced: { topic: string; value: any }[] = []

    t.mock.method(database, "createDbTransaction", async () => ({
        commit: async () => undefined,
        rollback: async () => undefined,
    }) as any)
    t.mock.method(transactions, "getLastNAccountTransactions", async () => [])
    t.mock.method(transactions, "updateTransactionStatus", async () => ({} as any))
    t.mock.method(auditEvents, "recordTransactionEvent", async (event: any) => ({
        id: `event-${event.eventType}-${event.transactionId}`,
    } as any))
    t.mock.method(kafka, "produce", async (topic: string, messages: any[]) => {
        produced.push(...messages.map((message) => ({ topic, value: JSON.parse(message.value) })))
    })

    t.mock.method(accounts, "getAccountById", async () => {
        const previousLock = lock
        let releaseLock!: () => void
        lock = new Promise((resolve) => {
            releaseLock = resolve
        })
        await previousLock

        const account = {
            balance: sharedBalance,
            async save() {
                sharedBalance = this.balance
                releaseLock()
            },
        }

        return account as any
    })

    const makeEvent = (transactionId: string) => JSON.stringify({
        transactionId,
        accountId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        type: TRANSACTION_TYPES.DEBIT,
        amount: "80.00",
        correlationId: transactionId,
        causationId: `approved-${transactionId}`,
        status: TRANSACTION_STATUS.PENDING,
        requestedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
    })

    await Promise.all([
        handleTransactionApproved(makeEvent("11111111-1111-1111-1111-111111111111")),
        handleTransactionApproved(makeEvent("22222222-2222-2222-2222-222222222222")),
    ])

    assert.equal(sharedBalance, "20")
    assert.equal(produced.filter((event) => event.topic === "transaction.completed").length, 1)
    assert.equal(produced.filter((event) => event.topic === "transaction.failed").length, 1)
    assert.match(
        produced.find((event) => event.topic === "transaction.failed")?.value.reason,
        /Balance not sufficient/
    )
})
