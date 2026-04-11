import { DataTypes, Model, Sequelize } from "sequelize";
import database from "../services/database";

const sequelize = database.getInstance() as Sequelize

type AccountHolderAttributes = {
    id: string;
    name: string;
    email: string;
    createdAt?: Date;
    updatedAt?: Date;
}

type AccountHolderCreationAttributes = {
    id?: string;
    name: string;
    email: string;
}

export interface IAccountHolder extends Model<AccountHolderAttributes, AccountHolderCreationAttributes>, AccountHolderAttributes { }

export function initAccountHolderModel(sequelize: Sequelize) {
    return sequelize.define<IAccountHolder>(
        "AccountHolder",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                allowNull: false,
                unique: true
            },
            name: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            email: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

        },
        { timestamps: true, tableName: "account_holders", underscored: true, },
    )
}
