import kafka from "../services/kafka"

async function handleTransactionCompleted(messageValue: string) {
    console.log("notification-service received transaction.completed:", messageValue)
}

export async function initNotificationConsumer() {
    await kafka.initConsumer(
        "notification-service",
        "transaction.completed",
        handleTransactionCompleted
    )
}
