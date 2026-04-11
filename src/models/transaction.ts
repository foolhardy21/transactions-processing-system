
import { DataTypes } from "sequelize";
import { sequelize } from "../services/database";

const Transaction = sequelize?.define(
    "Transaction",
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            unique: true
        },
        accountId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "Account",
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        type: {
            type: DataTypes.ENUM("debit", "credit"),
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM("pending", "fail", "success"),
            defaultValue: "pending"
        },

    },
    { timestamps: true, tableName: "transactions", underscored: true, },
)

export default Transaction