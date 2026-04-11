import { DataTypes } from "sequelize";
import { sequelize } from "../services/database";

const Account = sequelize?.define(
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

export default Account