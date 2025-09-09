const { DataTypes } = require("sequelize");
const { sequelize } = require("../db");

const Invoice = sequelize.define(
  "invoice",
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
      allowNull: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    originalFilePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    originalFileName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    translatedFilePath: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    originalFileContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    translatedFileContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    translatedFileName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    translatedLanguage: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),//uploaded, processing, completed, failed
      allowNull: true,
      defaultValue: "uploaded",
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
Invoice.belongsTo(Project, { foreignKey: "projectId", targetKey: "id" });
Invoice.belongsTo(Group, { foreignKey: "groupId", targetKey: "id" });

sequelize.query("SET FOREIGN_KEY_CHECKS = 0").then(function () {
  Invoice.sync({ alter: true })
    .then(() => {
      sequelize.query("SET FOREIGN_KEY_CHECKS = 1").then(function () {
        console.log("Invoice table created successfully!");
      });
    })
    .catch((error) => {
      sequelize.query("SET FOREIGN_KEY_CHECKS = 1").then(function () {
        console.error("Unable to create table Invoice: ", error);
      });
    });
});

module.exports = { Invoice };
