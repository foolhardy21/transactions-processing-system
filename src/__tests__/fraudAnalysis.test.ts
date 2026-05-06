import assert from "node:assert/strict"
import { test } from "node:test"
import kafka from "../services/kafka"
import * as auditEvents from "../services/auditEvents"
import * as transactions from "../services/transactions"
import { handleTransactionRequested, resetFraudAnalysisState } from "../consumers/fraudAnalysis"
import { TRANSACTION_STATUS, TRANSACTION_TYPES } from "../utils/types"

test("fraud block correctness flags same device across multiple accounts", async (t) => {
    resetFraudAnalysisState()

    const produced: { topic: string; value: any }[] = []
    const updateTransactionStatus = t.mock.method(transactions, "updateTransactionStatus", async () => ({} as any))
    const recordTransactionEvent = t.mock.method(auditEvents, "recordTransactionEvent", async (event: any) => ({
        id: `event-${event.eventType}`,
    } as any))
    t.mock.method(kafka, "produce", async (topic: string, messages: any[]) => {
        produced.push(...messages.map((message) => ({ topic, value: JSON.parse(message.value) })))
    })

    await handleTransactionRequested(JSON.stringify({
        transactionId: "11111111-1111-1111-1111-111111111111",
        accountId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        type: TRANSACTION_TYPES.DEBIT,
        amount: "100.00",
        correlationId: "11111111-1111-1111-1111-111111111111",
        causationId: "event-requested-1",
        deviceFingerprint: "shared-device",
        ipAddress: "10.0.0.1",
        status: TRANSACTION_STATUS.PENDING,
        requestedAt: new Date().toISOString(),
    }))

    await handleTransactionRequested(JSON.stringify({
        transactionId: "22222222-2222-2222-2222-222222222222",
        accountId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        type: TRANSACTION_TYPES.DEBIT,
        amount: "100.00",
        correlationId: "22222222-2222-2222-2222-222222222222",
        causationId: "event-requested-2",
        deviceFingerprint: "shared-device",
        ipAddress: "10.0.0.2",
        status: TRANSACTION_STATUS.PENDING,
        requestedAt: new Date().toISOString(),
    }))

    assert.equal(produced[0].topic, "transaction.approved")
    assert.equal(produced[1].topic, "transaction.blocked")
    assert.equal(updateTransactionStatus.mock.callCount(), 1)
    assert.equal(updateTransactionStatus.mock.calls[0].arguments[1], TRANSACTION_STATUS.FLAGGED)
    assert.match(updateTransactionStatus.mock.calls[0].arguments[2] as string, /device fingerprint used across multiple accounts/)

    const blockedAuditCall = recordTransactionEvent.mock.calls.find((call) => call.arguments[0].eventType === "transaction.blocked")
    assert.ok(blockedAuditCall)
    assert.equal(blockedAuditCall.arguments[0].status, TRANSACTION_STATUS.FLAGGED)
    assert.equal(produced[1].value.status, TRANSACTION_STATUS.FLAGGED)
    assert.equal(produced[1].value.causationId, "event-transaction.blocked")
})
