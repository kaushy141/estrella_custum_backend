const { DataTypes } = require("sequelize");
const { sequelize } = require("../db");
const c = require("../config/constants");
const Project = sequelize.define(
  "project",
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
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    aiConversation: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "en-US",
    },
    translatedLanguage: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "pl-PL",
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: "USD",
    },
    exchangeCurrency: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: "PLN",
    },
    exchangeRate: {
      type: DataTypes.DOUBLE(10, 4),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: c.projectStatus.uploadInvoice,
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
Project.belongsTo(Group, { foreignKey: 'groupId', targetKey: 'id' });

// Database sync is now handled centrally in config/database-init.js

module.exports = { Project };
