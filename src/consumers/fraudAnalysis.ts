import kafka from "../services/kafka"
import { recordTransactionEvent } from "../services/auditEvents"
import { updateTransactionStatus } from "../services/transactions"
import { TRANSACTION_STATUS, TRANSACTION_TYPES } from "../utils/types"

type TransactionRequestedEvent = {
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
}

type ActivityRecord = {
    accountId: string
    timestamp: number
}

const deviceActivity = new Map<string, ActivityRecord[]>()
const ipActivity = new Map<string, ActivityRecord[]>()
const FRAUD_WINDOW_MS = 5 * 60 * 1000

function getRecentRecords(records: ActivityRecord[], now: number) {
    return records.filter((record) => now - record.timestamp <= FRAUD_WINDOW_MS)
}

function hasMultipleAccounts(records: ActivityRecord[], accountId: string) {
    return new Set(records.map((record) => record.accountId).filter((id) => id !== accountId)).size > 0
}

async function handleTransactionRequested(messageValue: string) {
    const event: TransactionRequestedEvent = JSON.parse(messageValue)
    const now = Date.now()

    const deviceKey = event.deviceFingerprint ?? "unknown-device"
    const ipKey = event.ipAddress ?? "unknown-ip"

    const recentDeviceRecords = getRecentRecords(deviceActivity.get(deviceKey) ?? [], now)
    const recentIpRecords = getRecentRecords(ipActivity.get(ipKey) ?? [], now)

    recentDeviceRecords.push({ accountId: event.accountId, timestamp: now })
    recentIpRecords.push({ accountId: event.accountId, timestamp: now })

    deviceActivity.set(deviceKey, recentDeviceRecords)
    ipActivity.set(ipKey, recentIpRecords)

    const suspiciousReasons: string[] = []

    if (deviceKey !== "unknown-device" && hasMultipleAccounts(recentDeviceRecords, event.accountId)) {
        suspiciousReasons.push("device fingerprint used across multiple accounts")
    }

    if (ipKey !== "unknown-ip" && hasMultipleAccounts(recentIpRecords, event.accountId)) {
        suspiciousReasons.push("ip address used across multiple accounts")
    }

    if (recentDeviceRecords.length >= 3) {
        suspiciousReasons.push("high transaction frequency from same device fingerprint")
    }

    if (recentIpRecords.length >= 5) {
        suspiciousReasons.push("high transaction frequency from same ip address")
    }

    if (suspiciousReasons.length) {
        const reason = suspiciousReasons.join(", ")
        await updateTransactionStatus(event.transactionId, TRANSACTION_STATUS.FLAGGED, reason)
        const blockedEvent = await recordTransactionEvent({
            transactionId: event.transactionId,
            accountId: event.accountId,
            eventType: "transaction.blocked",
            correlationId: event.correlationId ?? event.transactionId,
            causationId: event.causationId ?? null,
            transactionType: event.type,
            amount: event.amount,
            status: TRANSACTION_STATUS.FLAGGED,
            reason,
            payload: {
                ...event,
                status: TRANSACTION_STATUS.FLAGGED,
                reason,
                suspiciousReasons,
            },
        })
        await kafka.produce("transaction.blocked", [
            {
                key: event.transactionId,
                value: JSON.stringify({
                    ...event,
                    correlationId: event.correlationId ?? event.transactionId,
                    causationId: blockedEvent.id,
                    status: TRANSACTION_STATUS.FLAGGED,
                    blockedAt: new Date().toISOString(),
                    reason,
                }),
            },
        ])
        console.log("fraud-analysis-service suspicious transaction pattern detected:", {
            transactionId: event.transactionId,
            accountId: event.accountId,
            deviceFingerprint: deviceKey,
            ipAddress: ipKey,
            suspiciousReasons,
        })
        return
    }

    const approvedEvent = await recordTransactionEvent({
        transactionId: event.transactionId,
        accountId: event.accountId,
        eventType: "transaction.approved",
        correlationId: event.correlationId ?? event.transactionId,
        causationId: event.causationId ?? null,
        transactionType: event.type,
        amount: event.amount,
        status: TRANSACTION_STATUS.PENDING,
        payload: {
            ...event,
            approvedAt: new Date().toISOString(),
        },
    })

    await kafka.produce("transaction.approved", [
        {
            key: event.transactionId,
            value: JSON.stringify({
                ...event,
                correlationId: event.correlationId ?? event.transactionId,
                causationId: approvedEvent.id,
                approvedAt: new Date().toISOString(),
            }),
        },
    ])

    console.log("fraud-analysis-service approved transaction.requested:", {
        transactionId: event.transactionId,
        accountId: event.accountId,
    })
}

export async function initFraudAnalysisConsumer() {
    await kafka.initConsumer(
        "fraud-analysis-service",
        "transaction.requested",
        handleTransactionRequested
    )
}
