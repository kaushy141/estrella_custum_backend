const Sequelize = require("sequelize");
require('dotenv').config();

const Op = Sequelize.Op;
const operatorsAliases = {
  $or: Op.or,
  $and: Op.and,
  $eq: Op.eq,
  $ne: Op.ne,
  $any: Op.any,
  $all: Op.all,
  $values: Op.values,
  $col: Op.col,
  $gt: Op.gt,
  $gte: Op.gte,
  $lt: Op.lt,
  $lte: Op.lte,
  $like: Op.like,
  $contains: Op.contains,
  $in: Op.in,
};

const dbConfig = {
  database: process.env.DB_NAME || "customs",
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  hostname: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  dialect: process.env.DB_DIALECT || "mysql"
};

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.hostname,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    operatorsAliases,
    pool: {
      max: 5,
      min: 0,
      acquire: 120000,
      idle: 10000,
    },
    dialectOptions: {
      connectTimeout: 120000,
    },
  }
);

sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
  })
  .catch((error) => {
    console.error("Unable to connect to the database: ", error);
  });

module.exports = { sequelize, Op };




