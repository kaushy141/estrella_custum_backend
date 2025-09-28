// const mongoose = require("mongoose");

//this validation will check the type of values--
const isValid = function (value) {
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  return true;
};
//this validBody checks the validation for the empty body
const isValidBody = function (requestBody) {
  return Object.keys(requestBody).length > 0;
};
//checks whether object id is valid or not
// const isValidObjectId = (ObjectId) => {
//   return mongoose.Types.ObjectId.isValid(ObjectId);
// };
//checks valid type of email--
const isValidEmail = function (value) {
  if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value)) {
    return false;
  }
  return true;
};
//checks valid type of number
const isValidNumber = function (value) {
  if (!/^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/.test(value)) {
    return false;
  }
  return true;
};
//valid type of name
const isValidName = function (value) {
  if (!/^[A-Za-z ]+$/.test(value.trim())) {
    return false;
  }
  return true;
};
// const validContactUs = async function (req, res, next) {
//   try {
//     let body = JSON.parse(JSON.stringify(req.body));
//     if (Object.keys(body).length == 0) {
//       return res
//         .status(400)
//         .send({ status: false, msg: "Plz Enter Data Inside Body !!!" });
//     }

//     const { phone, email } = body;

//     const findPhone = await contactUsModel.findOne({ phone: phone });
//     if (findPhone) {
//       return res.status(400).send({
//         status: false,
//         msg: "Contact Number is Already Exists, Plz Enter Another One !!!",
//       });
//     }
//     if (!phone) {
//       return res
//         .status(400)
//         .send({ status: false, msg: "Plz Enter phone In Body !!!" });
//     }

//     const findEmail = await contactUsModel.findOne({ email: email });
//     if (findEmail) {
//       return res.status(400).send({
//         status: false,
//         msg: "Your Email is Already Exists, Plz Enter Another One !!!",
//       });
//     }
//     if (!email) {
//       return res.status(400).send({
//         status: false,
//         msg: "Plz Enter Email In Body !!!",
//       });
//     }

//     next();
//   } catch (err) {
//     res.status(500).send({ status: false, msg: err.message });
//   }
// };

// Validation middleware for project insights email endpoint
const validateProjectInsights = function (req, res, next) {
  try {
    const { projectId, subject } = req.body;

    if (!isValidBody(req.body)) {
      return res.status(400).json({
        status: false,
        message: "Request body cannot be empty",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        status: false,
        message: "projectId is required",
      });
    }

    // Subject is optional - will be generated if not provided
    if (subject && !isValid(subject)) {
      return res.status(400).json({
        status: false,
        message: "subject cannot be empty if provided",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Validation error: " + error.message,
    });
  }
};

// Validation middleware for custom declaration insights email endpoint
const validateCustomDeclarationInsights = function (req, res, next) {
  try {
    const { projectId, subject } = req.body;

    if (!isValidBody(req.body)) {
      return res.status(400).json({
        status: false,
        message: "Request body cannot be empty",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        status: false,
        message: "projectId is required",
      });
    }

    // Subject is optional - will be generated if not provided
    if (subject && !isValid(subject)) {
      return res.status(400).json({
        status: false,
        message: "subject cannot be empty if provided",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Validation error: " + error.message,
    });
  }
};

// Validation middleware for combined insights email endpoint
const validateCombinedInsights = function (req, res, next) {
  try {
    const { projectId, invoiceSubject, customDeclarationSubject } = req.body;

    if (!isValidBody(req.body)) {
      return res.status(400).json({
        status: false,
        message: "Request body cannot be empty",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        status: false,
        message: "projectId is required",
      });
    }

    // Subjects are optional - will be generated if not provided
    if (invoiceSubject && !isValid(invoiceSubject)) {
      return res.status(400).json({
        status: false,
        message: "invoiceSubject cannot be empty if provided",
      });
    }

    if (customDeclarationSubject && !isValid(customDeclarationSubject)) {
      return res.status(400).json({
        status: false,
        message: "customDeclarationSubject cannot be empty if provided",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Validation error: " + error.message,
    });
  }
};

// Validation middleware for custom declaration insights to agents endpoint
const validateCustomDeclarationInsightsToAgents = function (req, res, next) {
  try {
    const { projectId, subject } = req.body;

    if (!isValidBody(req.body)) {
      return res.status(400).json({
        status: false,
        message: "Request body cannot be empty",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        status: false,
        message: "projectId is required",
      });
    }

    // Subject is optional - will be generated if not provided
    if (subject && !isValid(subject)) {
      return res.status(400).json({
        status: false,
        message: "subject cannot be empty if provided",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Validation error: " + error.message,
    });
  }
};

// Validation middleware for custom declaration insights to shipping services endpoint
const validateCustomDeclarationInsightsToShippingServices = function (req, res, next) {
  try {
    const { projectId, subject } = req.body;

    if (!isValidBody(req.body)) {
      return res.status(400).json({
        status: false,
        message: "Request body cannot be empty",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        status: false,
        message: "projectId is required",
      });
    }

    // Subject is optional - will be generated if not provided
    if (subject && !isValid(subject)) {
      return res.status(400).json({
        status: false,
        message: "subject cannot be empty if provided",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Validation error: " + error.message,
    });
  }
};

// Validation middleware for courier receipt insights to shipping services endpoint
const validateCourierReceiptInsightsToShippingServices = function (req, res, next) {
  try {
    const { projectId, subject } = req.body;

    if (!isValidBody(req.body)) {
      return res.status(400).json({
        status: false,
        message: "Request body cannot be empty",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        status: false,
        message: "projectId is required",
      });
    }

    // Subject is optional - will be generated if not provided
    if (subject && !isValid(subject)) {
      return res.status(400).json({
        status: false,
        message: "subject cannot be empty if provided",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Validation error: " + error.message,
    });
  }
};

module.exports = {
  isValid,
  isValidBody,
  // isValidObjectId,
  isValidEmail,
  isValidNumber,
  isValidName,
  // validContactUs,
  validateProjectInsights,
  validateCustomDeclarationInsights,
  validateCombinedInsights,
  validateCustomDeclarationInsightsToAgents,
  validateCustomDeclarationInsightsToShippingServices,
  validateCourierReceiptInsightsToShippingServices,
};
