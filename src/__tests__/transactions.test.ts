import assert from "node:assert/strict"
import { test } from "node:test"
import database from "../services/database"
import kafka from "../services/kafka"
import * as auditEvents from "../services/auditEvents"
import * as transactions from "../services/transactions"
import { handleCreateTransaction } from "../controllers/transactions"
import { createMockRequest, createMockResponse } from "./testUtils"
import { TRANSACTION_STATUS, TRANSACTION_TYPES } from "../utils/types"

test("duplicate transaction request returns conflict and does not create another event", async (t) => {
    const dbTransaction = {
        commit: t.mock.fn(async () => undefined),
        rollback: t.mock.fn(async () => undefined),
    }
    const produce = t.mock.method(kafka, "produce", async () => undefined)
    const createTransaction = t.mock.method(transactions, "createTransaction", async () => ({
        id: "tx-duplicate",
        status: TRANSACTION_STATUS.PENDING,
    } as any))
    const recordTransactionEvent = t.mock.method(auditEvents, "recordTransactionEvent", async () => ({
        id: "event-requested",
    } as any))

    t.mock.method(database, "createDbTransaction", async () => dbTransaction as any)

    let transactionExists = false
    t.mock.method(transactions, "getTransactionById", async () => (
        transactionExists
            ? { id: "tx-duplicate", status: TRANSACTION_STATUS.PENDING }
            : null
    ) as any)

    const request = createMockRequest({
        transactionId: "tx-duplicate",
        accountId: "11111111-1111-1111-1111-111111111111",
        type: TRANSACTION_TYPES.DEBIT,
        amount: "12000.00",
    })
    const firstResponse = createMockResponse()

    await handleCreateTransaction(request, firstResponse)
    transactionExists = true

    assert.equal(firstResponse.statusCode, 202)
    assert.equal((firstResponse.body as any).correlationId, "tx-duplicate")
    assert.equal(createTransaction.mock.callCount(), 1)
    assert.equal(recordTransactionEvent.mock.callCount(), 1)
    assert.equal(produce.mock.callCount(), 1)

    const secondResponse = createMockResponse()
    await assert.rejects(
        () => handleCreateTransaction(request, secondResponse),
        /Transaction is already in progress/
    )

    assert.equal(createTransaction.mock.callCount(), 1)
    assert.equal(recordTransactionEvent.mock.callCount(), 1)
    assert.equal(produce.mock.callCount(), 1)
})
