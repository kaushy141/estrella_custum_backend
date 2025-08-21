const express = require("express");
const session = require("express-session");
const app = express();
const multer = require("multer");
const http = require("http");
const server = http.createServer(app);
const bodyParser = require("body-parser");
const cors = require("cors");
//const { getAllAttributes } = require("./controller/testConnection");
const indexRouter = require("./routers/indexRouter");
const serviceRouter = require("./services/router");
const cookieParser = require("cookie-parser");
const compression = require('compression');
require("dotenv").config();
require("./cron/cronjob");


app.use(express.json({ limit: "1000mb" }));
app.use(
  cors({
    allowedHeaders: ["Content-Type", "token", "authorization", "Baggage", "sentry-trace"],
    exposedHeaders: ["token", "authorization"],
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://dashboard.estrellajewels.com",
      "https://dashboard.estrellajewels.com",
      "http://estrellaestrellajewels.com",
      "https://estrellajewels.com",
      "http://www.estrellajewels.com",
      "https://www.estrellajewels.com",
    ],
    credentials: true,
    methods: "GET, HEAD, PUT, PATCH, POST, DELETE",
    preflightContinue: false,
  })
);

app.use(
  session({
    secret: process.env.SESSION_KEY, // Replace with your secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to `true` if you are using HTTPS
  })
);

app.use(cookieParser());
app.use(bodyParser.json({ limit: 2000000 }));
app.use(bodyParser.urlencoded({ limit: 2000000, extended: true }));

// app.get("/", (req, res) => {
//   getAllAttributes(req, res);
// });

app.use("/media", express.static("media"));
app.use("/api/v1", indexRouter);
app.use("/api/services", serviceRouter);

app.use(compression({ filter: shouldCompress }))

function shouldCompress(req, res) {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false
  }

  // fallback to standard filter function
  return compression.filter(req, res)
}

app.use((req, res) => {
  res.status(404).json({
    message: "Route didn't found",
  }); // Send a 404 status with a custom message
});
const port = 3001;
server.listen(port, () => {
  console.log("server is running on port :", port);
  // console.log("Environment",global.gConfig.environmentConfig);
});
