import express from "express"
import dotenv from "dotenv"
import router from "./routes"
import database from "./services/database"

dotenv.config()
database.initInstance()
database.initDB()

const app = express()

app.use(express.json())
app.use("/api/v1", router)

app.listen(process.env.PORT, () => {
  console.log("Server listening on", process.env.PORT)
})