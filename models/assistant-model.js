const { DataTypes } = require("sequelize");
const { sequelize } = require("../db");

const Assistant = sequelize.define(
    "assistant",
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
        },
        type: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        assistantId: {
            type: DataTypes.STRING(191),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(191),
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        model: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        instructions: {
            type: DataTypes.TEXT("long"),
            allowNull: true,
        },
        tools: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        version: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        indexes: [
            {
                unique: false,
                fields: ["type"],
            },
            {
                unique: false,
                fields: ["assistantId"],
            },
            {
                unique: false,
                fields: ["isActive"],
            },
        ],
    }
);

module.exports = { Assistant };


