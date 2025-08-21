const Sequelize = require("sequelize");

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
  database: "estrella",
  username: "root",
  password: "Kaushal@123",
  hostname: "localhost",
};
// const dbConfig = {
//   database: "estrelladb2",
//   username: "root",
//   password: "",
//   hostname: "localhost",
// };

const sequelize = new Sequelize(
  dbConfig.database, //Database
  dbConfig.username, //Username
  dbConfig.password, //Password
  {
    host: dbConfig.hostname, //host
    dialect: "mysql",
    logging: function (str) {
      console.log(str);
    },
    operatorsAliases,
    pool: {
      max: 5,
      min: 0,
      acquire: 120000, // Increase the acquire timeout to 120 seconds (120000 ms)
      idle: 10000, // The maximum time (in ms) that a connection can be idle before being released
    },
    dialectOptions: {
      connectTimeout: 120000, // Increase the connection timeout to 120 seconds (120000 ms)
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




