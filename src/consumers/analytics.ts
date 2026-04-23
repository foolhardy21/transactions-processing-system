import kafka from "../services/kafka"

async function handleTransactionCompleted(messageValue: string) {
    console.log("analytics-service received transaction.completed:", messageValue)
}

export async function initAnalyticsConsumer() {
    await kafka.initConsumer(
        "analytics-service",
        "transaction.completed",
        handleTransactionCompleted
    )
}
