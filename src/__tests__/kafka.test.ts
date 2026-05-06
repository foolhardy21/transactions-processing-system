import assert from "node:assert/strict"
import { test } from "node:test"
import { buildConsumerFailurePlan } from "../services/kafka"

test("worker crash during processing plans a retry without dropping the message", () => {
    const plan = buildConsumerFailurePlan({
        topic: "transaction.approved",
        groupId: "ledger-service",
        key: "tx-crash",
        payload: JSON.stringify({ transactionId: "tx-crash" }),
        attempt: 0,
        maxRetries: 3,
        errorMessage: "worker crashed",
    })

    assert.equal(plan.movedToDlq, false)
    assert.equal(plan.topic, "transaction.approved")
    assert.equal(plan.wrapMessage, true)
    assert.equal(plan.attempt, 1)
    assert.equal(plan.lastError, "worker crashed")
    assert.deepEqual(plan.messages, [
        {
            key: "tx-crash",
            value: JSON.stringify({ transactionId: "tx-crash" }),
        },
    ])
})

test("retry and DLQ behavior moves final failed attempt to the dead letter topic", () => {
    const plan = buildConsumerFailurePlan({
        topic: "transaction.approved",
        sourceTopic: "transaction.approved",
        groupId: "ledger-service",
        key: "tx-dlq",
        payload: JSON.stringify({ transactionId: "tx-dlq" }),
        attempt: 2,
        maxRetries: 3,
        errorMessage: "database unavailable",
    })

    assert.equal(plan.movedToDlq, true)
    assert.equal(plan.topic, "transaction.approved.dlq")
    assert.equal(plan.wrapMessage, false)

    const dlqPayload = JSON.parse(plan.messages[0].value)
    assert.equal(dlqPayload.originalTopic, "transaction.approved")
    assert.equal(dlqPayload.payload, JSON.stringify({ transactionId: "tx-dlq" }))
    assert.equal(dlqPayload.metadata.attempt, 3)
    assert.equal(dlqPayload.metadata.lastError, "database unavailable")
    assert.equal(dlqPayload.metadata.consumerGroup, "ledger-service")
    assert.ok(dlqPayload.metadata.failedAt)
})
