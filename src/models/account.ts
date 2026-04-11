import { DataTypes, Model, Sequelize } from "sequelize";
import database from "../services/database";

const sequelize = database.getInstance() as Sequelize

type AccountAttributes = {
    id: string;
    balance: string;
    holderId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

type AccountCreationAttributes = {
    id?: string;
    balance: string;
    holderId: string;
}

export interface IAccount extends Model<AccountAttributes, AccountCreationAttributes>, AccountAttributes { }

export function initAccountModel(sequelize: Sequelize) {
    return sequelize.define<IAccount>(
        "Account",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                allowNull: false,
                unique: true
            },
            balance: {
                type: DataTypes.DECIMAL(10, 2),
                defaultValue: 0,
            },
            holderId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "AccountHolder",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },

        },
        { timestamps: true, tableName: "accounts", underscored: true, },
    )
}
