const { DataTypes } = require("sequelize");
const { sequelize } = require("../db");

const CustomAgent = sequelize.define(
  "customAgent",
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["guid"],
      },
      {
        unique: false,
        fields: ["groupId"],
      },
    ],
  }
);

// Import Group model for association
const { Group } = require("./group-model");

// Define associations
CustomAgent.belongsTo(Group, { foreignKey: 'groupId', targetKey: 'id' });

// Database sync is now handled centrally in config/database-init.js

module.exports = { CustomAgent };
