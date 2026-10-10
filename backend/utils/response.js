const sendResponse = (res, statusCode, success, data, message, error = null) => {
  const payload = {
    success,
    data,
    message,
    error
  };

  return res.status(statusCode).json(payload);
};

// Wraps a controller so thrown errors become a JSON response.
// Errors carrying a statusCode are expected (403, 404, ...) and their message
// is returned; anything else is logged and hidden behind fallbackMessage.
const handle = (fn, fallbackMessage) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    if (res.headersSent) return;

    if (error.statusCode) {
      return sendResponse(res, error.statusCode, false, null, error.message);
    }

    console.error(error);

    return sendResponse(res, 500, false, null, fallbackMessage);
  }
};

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = { sendResponse, handle, httpError };
