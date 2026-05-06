import { Consumer, Kafka, Producer, type Message } from "kafkajs";

type ConsumerHandler = (messageValue: string) => Promise<void> | void

type KafkaMessageInput = {
    key?: string
    value: string
    headers?: Record<string, string>
}

type KafkaEnvelope = {
    payload: string
    metadata: {
        attempt: number
        sourceTopic: string
        lastError?: string
        failedAt?: string
    }
}

type DlqReplayMessage = {
    originalTopic: string
    payload: string
}

type ConsumerFailurePlanInput = {
    topic: string
    sourceTopic?: string
    groupId: string
    key?: string
    payload: string
    attempt: number
    maxRetries?: number
    errorMessage: string
}

export type ConsumerFailurePlan = {
    topic: string
    messages: KafkaMessageInput[]
    wrapMessage: boolean
    attempt?: number
    lastError?: string
    movedToDlq: boolean
}

const DEFAULT_MAX_RETRIES = Number(process.env.KAFKA_MAX_RETRIES ?? 3)
const DEFAULT_RETRY_BASE_MS = Number(process.env.KAFKA_RETRY_BASE_MS ?? 1000)
const DLQ_SUFFIX = ".dlq"

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getDlqTopic(topic: string) {
    return `${topic}${DLQ_SUFFIX}`
}

export function buildConsumerFailurePlan({
    topic,
    sourceTopic = topic,
    groupId,
    key,
    payload,
    attempt,
    maxRetries = DEFAULT_MAX_RETRIES,
    errorMessage,
}: ConsumerFailurePlanInput): ConsumerFailurePlan {
    if (attempt + 1 >= maxRetries) {
        return {
            topic: getDlqTopic(topic),
            messages: [
                {
                    key,
                    value: JSON.stringify({
                        originalTopic: sourceTopic,
                        payload,
                        metadata: {
                            attempt: attempt + 1,
                            sourceTopic,
                            lastError: errorMessage,
                            failedAt: new Date().toISOString(),
                            consumerGroup: groupId,
                        },
                    }),
                },
            ],
            wrapMessage: false,
            movedToDlq: true,
        }
    }

    return {
        topic,
        messages: [
            {
                key,
                value: payload,
            },
        ],
        wrapMessage: true,
        attempt: attempt + 1,
        lastError: errorMessage,
        movedToDlq: false,
    }
}

class KafkaUtil {
    client?: Kafka
    #producer?: Producer
    #consumers: Consumer[]

    constructor() {
        this.#consumers = []
    }

    #getClient() {
        if (this.client) return this.client

        const broker = process.env.KAFKA_BROKER1
        if (!broker) {
            throw new Error("KAFKA_BROKER1 is not configured.")
        }

        this.client = new Kafka({
            clientId: "transactions-processing-system",
            brokers: [broker]
        })
        return this.client
    }

    #toEnvelope(topic: string, value: string, attempt: number = 0, lastError?: string): KafkaEnvelope {
        return {
            payload: value,
            metadata: {
                attempt,
                sourceTopic: topic,
                ...(lastError && {
                    lastError,
                    failedAt: new Date().toISOString(),
                }),
            },
        }
    }

    #parseEnvelope(rawValue: string, topic: string): KafkaEnvelope {
        try {
            const parsed = JSON.parse(rawValue) as Partial<KafkaEnvelope>
            if (typeof parsed?.payload === "string" && parsed.metadata) {
                return {
                    payload: parsed.payload,
                    metadata: {
                        attempt: parsed.metadata.attempt ?? 0,
                        sourceTopic: parsed.metadata.sourceTopic ?? topic,
                        lastError: parsed.metadata.lastError,
                        failedAt: parsed.metadata.failedAt,
                    },
                }
            }
        } catch {
            // Fall back to wrapping legacy plain-string messages.
        }

        return this.#toEnvelope(topic, rawValue)
    }

    #getNextOffset(offset: string) {
        return (BigInt(offset) + 1n).toString()
    }

    async init() {
        const client = this.#getClient()
        this.#producer = client.producer()
        try {
            await this.#producer.connect()
        } catch (err) {
            console.log("Error connecting the producer: ", err)
        }
    }

    async initConsumer(groupId: string, topic: string, handler: ConsumerHandler) {
        const client = this.#getClient()
        const consumer = client.consumer({ groupId })
        try {
            await consumer.connect()
            await consumer.subscribe({ topic, fromBeginning: true })
            await consumer.run({
                autoCommit: false,
                eachMessage: async ({ topic, partition, message }) => {
                    const messageValue = message.value?.toString()
                    if (!messageValue) return

                    const envelope = this.#parseEnvelope(messageValue, topic)
                    const attempt = envelope.metadata.attempt

                    try {
                        await handler(envelope.payload)
                    } catch (err) {
                        const errorMessage = err instanceof Error ? err.message : "Unknown consumer error"
                        const failurePlan = buildConsumerFailurePlan({
                            topic,
                            sourceTopic: envelope.metadata.sourceTopic,
                            groupId,
                            key: message.key?.toString(),
                            payload: envelope.payload,
                            attempt,
                            errorMessage,
                        })

                        if (failurePlan.movedToDlq) {
                            await this.produce(failurePlan.topic, failurePlan.messages, failurePlan.wrapMessage)
                            console.log(`Moved message to DLQ for ${groupId}:`, errorMessage)
                        } else {
                            const delayMs = DEFAULT_RETRY_BASE_MS * 2 ** attempt
                            await sleep(delayMs)
                            await this.produce(
                                failurePlan.topic,
                                failurePlan.messages,
                                failurePlan.wrapMessage,
                                failurePlan.attempt,
                                failurePlan.lastError
                            )
                            console.log(`Retried message for ${groupId}, attempt ${failurePlan.attempt}:`, errorMessage)
                        }
                    }

                    await consumer.commitOffsets([
                        {
                            topic,
                            partition,
                            offset: this.#getNextOffset(message.offset),
                        },
                    ])
                },
            })
            this.#consumers.push(consumer)
        } catch (err) {
            console.log(`Error connecting ${groupId} consumer: `, err)
        }
    }

    async produce(topic: string = "", messages: KafkaMessageInput[], wrapMessage: boolean = true, attempt: number = 0, lastError?: string) {
        if (this.#producer && topic && messages.length) {
            try {
                const res = await this.#producer.send({
                    topic,
                    messages: messages.map((message) => ({
                        key: message.key,
                        headers: message.headers,
                        value: wrapMessage
                            ? JSON.stringify(this.#toEnvelope(topic, message.value, attempt, lastError))
                            : message.value,
                    })),
                })
                console.log("Event produced: ", res)
            } catch (err) {
                console.log("Error sending the event: ", err)
                throw err
            }
        }
    }

    async reprocessDlq(dlqTopic: string) {
        const client = this.#getClient()
        const consumer = client.consumer({ groupId: `dlq-reprocessor-${Date.now()}` })

        try {
            await consumer.connect()
            await consumer.subscribe({ topic: dlqTopic, fromBeginning: true })
            await consumer.run({
                autoCommit: false,
                eachMessage: async ({ topic, partition, message }) => {
                    const rawValue = message.value?.toString()
                    if (!rawValue) return

                    const parsed = JSON.parse(rawValue) as DlqReplayMessage
                    await this.produce(parsed.originalTopic, [
                        {
                            key: message.key?.toString(),
                            value: parsed.payload,
                        },
                    ])

                    await consumer.commitOffsets([
                        {
                            topic,
                            partition,
                            offset: this.#getNextOffset(message.offset),
                        },
                    ])
                },
            })
        } catch (err) {
            console.log(`Error reprocessing DLQ topic ${dlqTopic}: `, err)
            throw err
        }
    }
}
const kafka = new KafkaUtil()

export default kafka
