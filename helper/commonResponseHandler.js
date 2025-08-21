module.exports = {
  commonResponse: (res, statusCode, result, message) => {
    return res.status(statusCode || 200).json({
      responseCode: statusCode || 200,
      responseMessage: message || "",
      result: result || "",
    });
  },
  sendResponseWithPagination: (
    responseObj,
    responseCode,
    responseMessage,
    data,
    paginationData
  ) => {
    return responseObj.status(responseCode || 200).json({
      responseCode: responseCode,
      responseMessage: responseMessage,
      result: data,
      paginationData: paginationData || "",
    });
  },
  sendResponseWithData: (
    responseObj,
    responseCode,
    responseMessage,
    data,
    token
  ) => {
    return responseObj.status(responseCode || 200).json({
      responseCode: responseCode,
      responseMessage: responseMessage,
      result: data,
      token: token,
    });
  },
  sendResponseWithoutData: (responseObj, responseCode, responseMessage) => {
    return responseObj.status(responseCode || 200).json({
      responseCode: responseCode,
      responseMessage: responseMessage,
    });
  },
};
