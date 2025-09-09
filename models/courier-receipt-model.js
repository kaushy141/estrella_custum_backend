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
      allowNull: false,
    },
    fileContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    insights: {
      type: DataTypes.TEXT,
      allowNull: true,
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

sequelize.query("SET FOREIGN_KEY_CHECKS = 0").then(function () {
  CourierReceipt.sync()
    .then(() => {
      sequelize.query("SET FOREIGN_KEY_CHECKS = 1").then(function () {
        console.log("CourierReceipt table created successfully!");
      });
    })
    .catch((error) => {
      sequelize.query("SET FOREIGN_KEY_CHECKS = 1").then(function () {
        console.error("Unable to create table CourierReceipt: ", error);
      });
    });
});

module.exports = { CourierReceipt };
