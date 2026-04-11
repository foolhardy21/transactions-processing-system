import { DataTypes } from "sequelize";
import { sequelize } from "../services/database";

const AccountHolder = sequelize?.define(
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

export default AccountHolder