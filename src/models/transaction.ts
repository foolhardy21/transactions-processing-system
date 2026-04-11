
import { DataTypes, Model, Sequelize } from "sequelize";
import database from "../services/database";

const sequelize = database.getInstance() as Sequelize

type TransactionAttributes = {
    id: string;
    accountId: string;
    type: "debit" | "credit";
    amount: string;
    status?: "pending" | "fail" | "success";
    createdAt?: Date;
    updatedAt?: Date;
}

type TransactionCreationAttributes = {
    id?: string;
    accountId: string;
    type: "debit" | "credit";
    amount: string;
    status?: "pending" | "fail" | "success";
}

export interface ITransaction extends Model<TransactionAttributes, TransactionCreationAttributes>, TransactionAttributes { }

export function initTransactionModel(sequelize: Sequelize) {
    return sequelize.define<ITransaction>(
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
}
