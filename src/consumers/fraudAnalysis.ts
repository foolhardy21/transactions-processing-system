import kafka from "../services/kafka"

type TransactionCompletedEvent = {
    transactionId: string
    accountId: string
    type: string
    amount: string
    deviceFingerprint?: string
    ipAddress?: string
    status: string
    completedAt: string
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

async function handleTransactionCompleted(messageValue: string) {
    const event: TransactionCompletedEvent = JSON.parse(messageValue)
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
        console.log("fraud-analysis-service suspicious transaction pattern detected:", {
            transactionId: event.transactionId,
            accountId: event.accountId,
            deviceFingerprint: deviceKey,
            ipAddress: ipKey,
            suspiciousReasons,
        })
        return
    }

    console.log("fraud-analysis-service processed transaction.completed:", {
        transactionId: event.transactionId,
        accountId: event.accountId,
    })
}

export async function initFraudAnalysisConsumer() {
    await kafka.initConsumer(
        "fraud-analysis-service",
        "transaction.completed",
        handleTransactionCompleted
    )
}
