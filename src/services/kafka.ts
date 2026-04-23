import { Consumer, Kafka, Producer } from "kafkajs";

type ConsumerHandler = (messageValue: string) => Promise<void> | void

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
                eachMessage: async ({ message }) => {
                    const messageValue = message.value?.toString()
                    if (!messageValue) return

                    await handler(messageValue)
                },
            })
            this.#consumers.push(consumer)
        } catch (err) {
            console.log(`Error connecting ${groupId} consumer: `, err)
        }
    }

    async produce(topic: string = "", messages: any[]) {
        if (this.#producer && topic && messages.length) {
            try {
                const res = await this.#producer.send({
                    topic,
                    messages,
                })
                console.log("Event produced: ", res)
            } catch (err) {
                console.log("Error sending the event: ", err)
            }
        }
    }
}
const kafka = new KafkaUtil()

export default kafka
