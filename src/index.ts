import express from "express"
import dotenv from "dotenv"
import { initAnalyticsConsumer } from "./consumers/analytics"
import { initFraudAnalysisConsumer } from "./consumers/fraudAnalysis"
import { initLedgerConsumer } from "./consumers/ledger"
import { initNotificationConsumer } from "./consumers/notification"
import database from "./services/database"
import router from "./routes"
import { initModels } from "./models"
import kafka from "./services/kafka"

dotenv.config()

database.initInstance()
initModels(database.getInstance()!)
database.initDB()

const app = express()

app.use(express.json())
app.use("/api/v1", router)

app.listen(process.env.PORT, async () => {
  console.log("Server listening on", process.env.PORT)
  await kafka.init()
  await Promise.all([
    initNotificationConsumer(),
    initLedgerConsumer(),
    initAnalyticsConsumer(),
    initFraudAnalysisConsumer(),
  ])
})
