import dotenv from "dotenv"
import kafka from "../services/kafka"

dotenv.config()

async function main() {
    const dlqTopic = process.argv[2]

    if (!dlqTopic) {
        throw new Error("Please provide the DLQ topic name. Example: npm run reprocess:dlq -- transaction.completed.dlq")
    }

    await kafka.init()
    await kafka.reprocessDlq(dlqTopic)
}

void main()
