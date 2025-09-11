const { DataTypes } = require("sequelize");
const { sequelize } = require("../db");

const ActivityLog = sequelize.define(
  "activityLog",
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
      allowNull: true,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.STRING(255),
      allowNull: false,
    }
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
ActivityLog.belongsTo(Project, { foreignKey: 'projectId', targetKey: 'id' });
ActivityLog.belongsTo(Group, { foreignKey: 'groupId', targetKey: 'id' });

// Database sync is now handled centrally in config/database-init.js

module.exports = { ActivityLog };
