const { DataTypes } = require("sequelize");
const { sequelize } = require("../db");

const GroupAddress = sequelize.define(
  "groupAddress",
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
      references: {
        model: "group",
        key: "id",
      },
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    zip: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    contactName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    contactPhone: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    latitude: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    longitude: {
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

sequelize.query("SET FOREIGN_KEY_CHECKS = 0").then(function () {
  GroupAddress.sync()
    .then(() => {
      sequelize.query("SET FOREIGN_KEY_CHECKS = 1").then(function () {
        console.log("GroupAddress table created successfully!");
      });
    })
    .catch((error) => {
      sequelize.query("SET FOREIGN_KEY_CHECKS = 1").then(function () {
        console.error("Unable to create table GroupAddress: ", error);
      });
    });
});

module.exports = { GroupAddress };
