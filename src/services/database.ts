import { Sequelize } from "sequelize"

class Database {
    sequelize: Sequelize | null

    constructor() {
        this.sequelize = null
    }

    getInstance() {
        return this.sequelize
    }

    initInstance() {
        const dbName = process.env.DB_NAME || ""
        const dbUsername = process.env.DB_USERNAME || ""
        const dbPassword = process.env.DB_PASSWORD || ""
        const dbPort = Number(process.env.DB_PORT || 5432)

        this.sequelize = new Sequelize(dbName, dbUsername, dbPassword, {
            host: process.env.DB_HOST,
            port: dbPort,
            dialect: "postgres",
        })
    }

    async initDB() {
        try {
            if (this.sequelize)
                await this.sequelize.authenticate()
        } catch (err: any) {
            console.log("Error connecting the DB: ", err)
        }
    }

    async createDbTransaction() {
        if (this.sequelize) {
            const t = await this.sequelize.transaction()
            return t
        }
    }
}
const database = new Database()

export default database
