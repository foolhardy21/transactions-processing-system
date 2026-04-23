import kafka from "../services/kafka"

async function handleTransactionCompleted(messageValue: string) {
    console.log("ledger-service received transaction.completed:", messageValue)
}

export async function initLedgerConsumer() {
    await kafka.initConsumer(
        "ledger-service",
        "transaction.completed",
        handleTransactionCompleted
    )
}
