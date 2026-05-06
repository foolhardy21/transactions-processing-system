import { DataTypes, Model, Sequelize } from "sequelize"
import { TRANSACTION_STATUS, TRANSACTION_TYPES } from "../utils/types"

type TransactionEventAttributes = {
    id: string
    transactionId: string
    accountId: string
    eventType: string
    correlationId: string
    causationId?: string | null
    transactionType?: TRANSACTION_TYPES | null
    amount?: string | null
    status?: TRANSACTION_STATUS | null
    balanceBefore?: string | null
    balanceAfter?: string | null
    reason?: string | null
    payload: object
    occurredAt: Date
    createdAt?: Date
    updatedAt?: Date
}

type TransactionEventCreationAttributes = {
    id: string
    transactionId: string
    accountId: string
    eventType: string
    correlationId: string
    causationId?: string | null
    transactionType?: TRANSACTION_TYPES | null
    amount?: string | null
    status?: TRANSACTION_STATUS | null
    balanceBefore?: string | null
    balanceAfter?: string | null
    reason?: string | null
    payload?: object
    occurredAt?: Date
}

export interface ITransactionEvent extends Model<TransactionEventAttributes, TransactionEventCreationAttributes>, TransactionEventAttributes { }

export function initTransactionEventModel(sequelize: Sequelize) {
    return sequelize.define<ITransactionEvent>(
        "TransactionEvent",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                allowNull: false,
                unique: true,
            },
            transactionId: {
                type: DataTypes.UUID,
                allowNull: false,
                field: "transaction_id",
            },
            accountId: {
                type: DataTypes.UUID,
                allowNull: false,
                field: "account_id",
            },
            eventType: {
                type: DataTypes.STRING,
                allowNull: false,
                field: "event_type",
            },
            correlationId: {
                type: DataTypes.UUID,
                allowNull: false,
                field: "correlation_id",
            },
            causationId: {
                type: DataTypes.UUID,
                allowNull: true,
                field: "causation_id",
            },
            transactionType: {
                type: DataTypes.ENUM("debit", "credit"),
                allowNull: true,
                field: "transaction_type",
            },
            amount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
            },
            status: {
                type: DataTypes.ENUM("pending", "failed", "completed", "flagged", "finalized"),
                allowNull: true,
            },
            balanceBefore: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                field: "balance_before",
            },
            balanceAfter: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                field: "balance_after",
            },
            reason: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            payload: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            occurredAt: {
                type: DataTypes.DATE,
                allowNull: false,
                field: "occurred_at",
                defaultValue: DataTypes.NOW,
            },
        },
        { timestamps: true, tableName: "transaction_events", underscored: true },
    )
}
