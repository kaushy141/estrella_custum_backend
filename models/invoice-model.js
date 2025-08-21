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
      allowNull: false,
    },
    projectId: {
      type: DataTypes.INTEGER,
      references: {
        model: "project",
        key: "id",
      },
      allowNull: false,
    },
    groupId: {
      type: DataTypes.INTEGER,
      references: {
        model: "group",
        key: "id",
      },
      allowNull: false,
    },
    originalFilePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    translatedFilePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    originalFileContent: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    translatedFileContent: {
      type: DataTypes.TEXT,
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
      {
        unique: false,
        fields: ["projectId"],
      },
    ],
  }
);

sequelize.query("SET FOREIGN_KEY_CHECKS = 0").then(function () {
  Invoice.sync()
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
