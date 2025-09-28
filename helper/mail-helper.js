const axios = require("axios");
const express = require("express");
const { _ } = require("lodash");
const path = require("path");
const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const mg = require("nodemailer-mailgun-transport");
const config = require("../config/config");
const c = require("../config/constants");
const viewPath = path.resolve(__dirname, "../templates/views/");
const partialsPath = path.resolve(__dirname, "../templates/partials");
const Handlebars = require("handlebars");


// ✅ Register helpers
Handlebars.registerHelper('objectKeys', obj => obj ? Object.keys(obj) : []);
Handlebars.registerHelper('objectValues', obj => obj ? Object.values(obj) : []);
const SENDING = true;
// const auth = {
//   service: "Mailgun",
//   auth: {
//     api_key: "aa54ea7a623ca668aecb9689786ee7e4-2175ccc2-359b597b",
//     domain: "mg.estrella.com",
//     username: "postmaster@mg.estrella.com",
//     pass: "9bae477c2fd25f72010df699997aa657-86220e6a-00ff5872",
//   },
// };

// const auth = {
//   service: "gmail",
//   auth: {
//     user: "info@safepcdisposal.co.uk",
//     pass: "rburkppnojwawsmm",
//   },
// };
// const auth = {
//   service: "Mailgun",
//   auth: {
//     api_key: "aa54ea7a623ca668aecb9689786ee7e4-2175ccc2-359b597b",
//     domain: "mg.estrella.com",
//     username: "postmaster@mg.estrella.com",
//     pass: "9bae477c2fd25f72010df699997aa657-86220e6a-00ff5872",
//   },
// };

// const auth = {
//   host: "smtp.mailgun.org",
//   port: 587,
//   auth: {
//     user: "",
//     pass: "",
//   },
// };

// const auth = {
//   host: "smtp.mailgun.org",
//   port: 587,
//   auth: {
//     user: "",
//     pass: "",
//   },
// };

// const auth = {
//   host: "smtpout.secureserver.net",
//   port: 465,
//   auth: {
//     user: "support@estrella.com",
//     pass: "SecureP&&9",
//   },
// };

const auth = {
  host: config.smtpDetails.hostName,
  port: config.smtpDetails.hostPort,
  auth: {
    user: config.smtpDetails.username,
    pass: config.smtpDetails.password,
  },
};
//const transporter = nodemailer.createTransport(mg(auth));

const transporter = nodemailer.createTransport(auth);

transporter.use(
  "compile",
  hbs({
    viewEngine: {
      //extension name
      extName: ".handlebars",
      // layout path declare
      layoutsDir: viewPath,
      defaultLayout: false,
      //partials directory path
      partialsDir: partialsPath,
      express,
    },
    //View path declare
    viewPath: viewPath,
    extName: ".handlebars",
  })
);
const senderName = config.siteName;
// const senderEmail = "support@estrella.com";
// const bcc = "admin@estrella.com";
// const replyTo = "support@estrella.com";
const senderEmail = config.smtpDetails.username;
const bcc = config.smtpDetails.bcc || "";
const replyTo = config.smtpDetails.replyTo || "";
const mailHelper = {
  // Helper function to convert newlines to HTML breaks
  convertNewlinesToBreaks: (text) => {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  },

  // Test function to verify newline handling
  testNewlineEmail: async (to) => {
    const testData = {
      name: "Test User",
      body: "This is line 1\nThis is line 2\nThis is line 3\n\nSome details:\n- Point 1\n- Point 2\n- Point 3"
    };

    return mailHelper.sent(
      to,
      "Test Email with Newlines",
      "n8n",
      testData,
      { isHtml: true }  // Add flag to indicate HTML content
    );
  },

  sent: async (to, subject, template, data = {}, options = {}) => {
    console.log(`mail helper initiated  to ${to} and subject is ${subject}`);
    if (SENDING) {
      console.log("mail helper initiated============");
      // Convert newlines to breaks in all string values in data
      const processedData = Object.keys(data).reduce((acc, key) => {
        if (typeof data[key] === 'string') {
          acc[key] = mailHelper.convertNewlinesToBreaks(data[key]);
        } else {
          acc[key] = data[key];
        }
        return acc;
      }, {});
      transporter.sendMail(
        {
          from: {
            name: senderName,
            address: senderEmail,
          },
          to: to,
          bcc: options?.bcc || bcc,
          subject: subject,
          replyTo: options?.replyTo || replyTo,
          template: template,
          context: _.merge(config, processedData),
          html: options.isHtml // Add html flag to prevent escaping
        },
        (err, info) => {
          if (err) {
            console.log("Error from mail helper", err, "info", info);
            return false;
          } else {
            console.log("info from mail helper ", info);
            return info;
          }
        }
      );
    }
  },
  sendInsights: async (email, name, subject, message) => {
    try {

      await mailHelper
        .sent(
          email,
          subject,
          "insights",
          { name, message }
        )
        .then()
        .catch((err) => {
          console.log(
            "from mailhelper.sendInsights unable to sent mail to user",
            err
          );
        });
    } catch (err) {
      console.log("send insights mail error", err);
    }
  },

};

module.exports = mailHelper;
