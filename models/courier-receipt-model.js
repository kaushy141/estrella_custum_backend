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
    filePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fileContent: {
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
