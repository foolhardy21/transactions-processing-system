import assert from "node:assert/strict"
import { test } from "node:test"
import { calculateRebuiltBalance } from "../services/auditEvents"
import { TRANSACTION_STATUS, TRANSACTION_TYPES } from "../utils/types"

test("event replay rebuilds balances using only completed ledger events", () => {
    const rebuiltBalance = calculateRebuiltBalance([
        {
            eventType: "transaction.completed",
            status: TRANSACTION_STATUS.COMPLETED,
            transactionType: TRANSACTION_TYPES.CREDIT,
            amount: "20000.00",
        },
        {
            eventType: "transaction.completed",
            status: TRANSACTION_STATUS.COMPLETED,
            transactionType: TRANSACTION_TYPES.DEBIT,
            amount: "12000.00",
        },
        {
            eventType: "transaction.failed",
            status: TRANSACTION_STATUS.FAILED,
            transactionType: TRANSACTION_TYPES.DEBIT,
            amount: "5000.00",
        },
        {
            eventType: "transaction.blocked",
            status: TRANSACTION_STATUS.FLAGGED,
            transactionType: TRANSACTION_TYPES.DEBIT,
            amount: "1000.00",
        },
    ] as any)

    assert.equal(rebuiltBalance.toFixed(2), "8000.00")
})
