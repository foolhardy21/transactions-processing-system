import express from "express"
import dotenv from "dotenv"
import database from "./services/database"
import router from "./routes"
import { initModels } from "./models"

dotenv.config()

database.initInstance()
initModels(database.getInstance()!)
database.initDB()

const app = express()

app.use(express.json())
app.use("/api/v1", router)

app.listen(process.env.PORT, () => {
  console.log("Server listening on", process.env.PORT)
})