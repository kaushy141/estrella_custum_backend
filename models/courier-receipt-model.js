const { DataTypes } = require("sequelize");
const { sequelize } = require("../db");

const CourierReceipt = sequelize.define(
  "courierReceipt",
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
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    filePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    fileContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    insights: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),//uploaded, processing, completed, failed
      allowNull: true,
      defaultValue: "uploaded",
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
      {
        unique: false,
        fields: ["projectId"],
      },
    ],
  }
);

// Import models for associations
const { Project } = require("./project-model");
const { Group } = require("./group-model");

// Define associations
CourierReceipt.belongsTo(Project, { foreignKey: 'projectId', targetKey: 'id' });
CourierReceipt.belongsTo(Group, { foreignKey: 'groupId', targetKey: 'id' });

// Database sync is now handled centrally in config/database-init.js

module.exports = { CourierReceipt };
