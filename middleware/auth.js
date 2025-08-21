const jwt = require("jsonwebtoken");
const { commonResponse: response } = require("../helper/commonResponseHandler");
const { ErrorCode } = require("../helper/statusCode");
const { ErrorMessage } = require("../helper/message");
const { getJwtToken, verifyJwtToken } = require("../helper/commonFunction");
const staticN8nToken = "hF7bT6kQmX9zWc2aJrY1Lp8NvUeD0gqZ"

module.exports = {
  verifyTokenAdmin: (req, res, next) => {
    try {
      let tokenBearer = req.headers.authorization;
      let token = tokenBearer.replace("Bearer ", "");
      jwt.verify(token, process.env.JWT_SECRET_KEY, (err, result) => {
        if (err) {
          response(
            res,
            ErrorCode.INTERNAL_ERROR,
            err,
            ErrorMessage.INTERNAL_ERROR
          );
        } else {
          // result structure {
          //   id: 21,
          //   guid: '5b0526d4-b59d-46e1-8f51-4ed05037a5ad',
          //   iat: 1711626541
          // }

          req.adminId = result.id;
          next();
        }
      });
    } catch (error) {
      console.log(error);
      response(res, ErrorCode.WENT_WRONG, error, ErrorMessage.SOMETHING_WRONG);
    }
  },
  verifyTokenN8n: (req, res, next) => {
    try {
      let tokenBearer = req.headers.authorization;
      let token = tokenBearer.replace("Bearer ", "");
      if (token !== staticN8nToken) {
        throw new Error("Unauthorized");
      } else {
        next();
      }
    } catch (error) {
      response(res, ErrorCode.WENT_WRONG, error, ErrorMessage.SOMETHING_WRONG);
    }
  },

  verifyTokenUser: (req, res, next) => {
    try {
      let tokenBearer = req.headers.authorization;
      let token = tokenBearer.replace("Bearer ", "");
      jwt.verify(token, process.env.JWT_SECRET_KEY, (err, result) => {
        req.userId = err ? null : result.id;
        next();
      });
    } catch (error) {
      req.userId = null;
      // response(
      //   error,
      //   ErrorCode.INTERNAL_ERROR,
      //   userErr,
      //   ErrorMessage.INTERNAL_ERROR
      // );
      next();
    }
  },
  // verifyToken: (req, res, next) => {
  //   let tokenCheck = verifyJwtToken(req.headers.token);
  //   if (!tokenCheck) {
  //     response(res, ErrorCode.INTERNAL_ERROR, err, ErrorMessage.INTERNAL_ERROR);
  //   } else {
  //     userModel.findOne({ _id: result._id }, (userErr, userResult) => {
  //       if (userErr) {
  //         response(
  //           res,
  //           ErrorCode.INTERNAL_ERROR,
  //           userErr,
  //           ErrorMessage.INTERNAL_ERROR
  //         );
  //       } else if (!userResult) {
  //         response(res, ErrorCode.NOT_FOUND, {}, "Result not found.");
  //       } else {
  //         if (userResult.status == "BLOCK") {
  //           response(
  //             res,
  //             ErrorCode.REQUEST_FAILED,
  //             {},
  //             "Your account has been blocked by admin"
  //           );
  //         } else if (userResult.status == "DELETE") {
  //           response(
  //             res,
  //             ErrorCode.REQUEST_FAILED,
  //             {},
  //             "Your account has been deleted."
  //           );
  //         } else {
  //           req.userId = userResult._id;
  //           next();
  //         }
  //       }
  //     });
  //   }
  // },
  // verifyTokenDriver: (req, res, next) => {
  //   try {
  //     jwt.verify(
  //       req.headers.token,
  //       "M136033AHARYANANKAITHALOTEXLYJPRIVATEGLIMITED",
  //       (err, result) => {
  //         if (err) {
  //           response(
  //             res,
  //             ErrorCode.INTERNAL_ERROR,
  //             err,
  //             ErrorMessage.INTERNAL_ERROR
  //           );
  //         } else {
  //           driverModel.findOne({ _id: result._id }, (userErr, userResult) => {
  //             if (userErr) {
  //               response(
  //                 res,
  //                 ErrorCode.INTERNAL_ERROR,
  //                 userErr,
  //                 ErrorMessage.INTERNAL_ERROR
  //               );
  //             } else if (!userResult) {
  //               response(res, ErrorCode.NOT_FOUND, {}, "Result not found.");
  //             } else {
  //               if (userResult.status == "BLOCK") {
  //                 response(
  //                   res,
  //                   ErrorCode.REQUEST_FAILED,
  //                   {},
  //                   "Your account has been blocked by admin"
  //                 );
  //               } else if (userResult.status == "DELETE") {
  //                 response(
  //                   res,
  //                   ErrorCode.REQUEST_FAILED,
  //                   {},
  //                   "Your account has been deleted."
  //                 );
  //               } else {
  //                 req.driverId = userResult._id;
  //                 next();
  //               }
  //             }
  //           });
  //         }
  //       }
  //     );
  //   } catch (error) {
  //     console.log(error);
  //     response(res, ErrorCode.WENT_WRONG, error, ErrorMessage.SOMETHING_WRONG);
  //   }
  // },
};
